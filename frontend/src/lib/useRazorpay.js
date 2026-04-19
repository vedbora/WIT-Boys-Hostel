import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, formatError } from "../lib/api";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/**
 * useRazorpay hook exposes:
 *   - config (razorpay_key_id, waitlist_amount, enabled)
 *   - payFees(onSuccess) - triggers checkout for student fees
 *   - payWaitlist(applicationId, applicantInfo, onSuccess)
 */
export function useRazorpay() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/payments/config").then(({ data }) => setConfig(data)).catch(() => setConfig({ enabled: false }));
  }, []);

  const ensureReady = async () => {
    if (!config?.enabled) {
      toast.error("Online payments not configured", { description: "Contact admin or add RAZORPAY keys to backend/.env" });
      return false;
    }
    const ok = await loadRazorpayScript();
    if (!ok) {
      toast.error("Failed to load Razorpay");
      return false;
    }
    return true;
  };

  const payFees = async (onSuccess) => {
    if (!(await ensureReady())) return;
    setLoading(true);
    try {
      const { data: order } = await api.post("/payments/fees/create-order");
      const rzp = new window.Razorpay({
        key: config.razorpay_key_id,
        amount: order.amount,
        currency: order.currency,
        name: "WIT Boys Hostel",
        description: "Hostel Fees",
        order_id: order.order_id,
        prefill: { name: order.student_name, email: order.student_email, contact: order.student_phone },
        theme: { color: "#FF2A00" },
        handler: async (res) => {
          try {
            await api.post("/payments/fees/verify", {
              razorpay_order_id: res.razorpay_order_id,
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_signature: res.razorpay_signature,
            });
            toast.success("Fees paid successfully 🎉");
            onSuccess?.();
          } catch (e) { toast.error(formatError(e)); }
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      rzp.open();
    } catch (e) { toast.error(formatError(e)); }
    finally { setLoading(false); }
  };

  const payWaitlist = async (applicationId, applicant, onSuccess) => {
    if (!(await ensureReady())) return;
    setLoading(true);
    try {
      const { data: order } = await api.post("/waitlist/create-order", { application_id: applicationId });
      const rzp = new window.Razorpay({
        key: config.razorpay_key_id,
        amount: order.amount,
        currency: order.currency,
        name: "WIT Boys Hostel",
        description: "Priority Waitlist Deposit (Refundable)",
        order_id: order.order_id,
        prefill: { name: applicant?.name || order.applicant_name, email: applicant?.email || order.applicant_email, contact: applicant?.phone || order.applicant_phone },
        theme: { color: "#FF2A00" },
        handler: async (res) => {
          try {
            await api.post("/waitlist/verify", {
              razorpay_order_id: res.razorpay_order_id,
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_signature: res.razorpay_signature,
              application_id: applicationId,
            });
            toast.success("Priority unlocked — you're on the waitlist 🔥");
            onSuccess?.();
          } catch (e) { toast.error(formatError(e)); }
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      rzp.open();
    } catch (e) { toast.error(formatError(e)); }
    finally { setLoading(false); }
  };

  return { config, loading, payFees, payWaitlist };
}
