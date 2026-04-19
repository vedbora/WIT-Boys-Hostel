import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Search, ArrowLeft, BedDouble, Hash, CheckCircle2, XCircle, Clock, Zap, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PublicNav } from "../components/PublicNav";
import { PageTransition } from "../components/PageTransition";
import { StatusBadge } from "../components/StatusBadge";
import { api, formatError } from "../lib/api";
import { useRazorpay } from "../lib/useRazorpay";

export function CheckStatus() {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("email");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { config, loading: paying, payWaitlist } = useRazorpay();

  const check = async () => {
    if (!q.trim()) return toast.error("Enter email or phone");
    setLoading(true);
    setResult(null);
    try {
      const payload = mode === "email" ? { email: q.trim() } : { phone: q.trim() };
      const { data } = await api.post("/applications/status", payload);
      setResult(data);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <PublicNav />
      <div className="min-h-screen pt-24 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          <Link to="/" data-testid="status-back-link" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>

          <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground mb-4">Application / Status</div>
          <h1 className="font-heading font-black text-5xl sm:text-6xl tracking-tighter leading-none mb-10">
            Where do you<br />stand?
          </h1>

          <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <div className="flex gap-2 mb-4">
              {["email", "phone"].map((m) => (
                <button
                  key={m}
                  data-testid={`status-mode-${m}`}
                  onClick={() => setMode(m)}
                  className={`flex-1 h-10 rounded-lg font-semibold text-sm uppercase tracking-wider transition-colors ${mode === m ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                >{m}</button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                data-testid="status-input"
                value={q} onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && check()}
                placeholder={mode === "email" ? "you@example.com" : "10-digit phone"}
                className="w-full h-12 rounded-lg bg-background border border-border pl-11 pr-4 text-sm font-medium focus:border-foreground transition-colors"
              />
            </div>

            <motion.button
              whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
              data-testid="status-check-btn"
              onClick={check} disabled={loading}
              className="mt-4 w-full h-12 rounded-full bg-foreground text-background font-bold text-sm disabled:opacity-60"
            >
              {loading ? "Checking..." : "Check Status"}
            </motion.button>
          </div>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-6 rounded-2xl border border-border bg-card p-6 md:p-8"
              >
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground mb-2">Applicant</div>
                    <div className="font-heading font-black text-2xl tracking-tighter">{result.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">{result.email} · {result.phone}</div>
                  </div>
                  <StatusBadge status={result.status} size="lg" />
                </div>

                {result.status === "Approved" && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                    className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-6"
                  >
                    <div className="flex items-center gap-2 text-emerald-500 mb-4">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm font-bold tracking-wider uppercase">You're in!</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <Info icon={Hash} label="Room" value={result.assigned_room_number} />
                      <Info icon={BedDouble} label="Bed" value={`#${result.bed_number}`} />
                      <Info label="Type" value={result.assigned_room_type} />
                    </div>
                    <div className="mt-6 pt-6 border-t border-emerald-500/20 text-sm">
                      <p className="text-muted-foreground mb-2">You can now login to your student portal.</p>
                      <Link to="/student/login" data-testid="status-student-login-link" className="inline-flex items-center gap-2 font-bold text-foreground link-underline">
                        Go to Student Login →
                      </Link>
                    </div>
                  </motion.div>
                )}

                {result.status === "Pending" && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-6">
                    <div className="flex items-center gap-2 text-amber-500 mb-3">
                      <Clock className="h-5 w-5" />
                      <span className="text-sm font-bold tracking-wider uppercase">Under Review</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Your application is pending admin review. We'll process it based on merit score <span className="font-mono font-bold text-foreground">{result.merit_score?.toFixed?.(1)}</span>. Typical wait: 24-48 hours.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <Info label="Suggested" value={result.suggested_room_type} />
                      <Info label="Applied" value={result.preferred_room_type} />
                    </div>

                    {!result.waitlist_paid ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="mt-4 pt-4 border-t border-amber-500/20"
                      >
                        <div className="flex items-start gap-2 mb-3">
                          <Zap className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                          <p className="text-sm">
                            <span className="font-bold">Jump the queue:</span> <span className="text-muted-foreground">Pay refundable ₹{config?.waitlist_amount || 500} to unlock priority.</span>
                          </p>
                        </div>
                        <motion.button
                          whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                          data-testid="status-waitlist-btn"
                          onClick={() => payWaitlist(result.id, { name: result.name, email: result.email, phone: result.phone }, () => setResult({ ...result, waitlist_paid: true }))}
                          disabled={paying || !config?.enabled}
                          className="w-full h-10 rounded-full bg-accent text-accent-foreground font-bold text-xs disabled:opacity-60 inline-flex items-center justify-center gap-2"
                        >
                          {paying ? <><Loader2 className="h-3 w-3 animate-spin" /> Opening...</> : <><Sparkles className="h-3 w-3" /> Join Priority Waitlist · ₹{config?.waitlist_amount || 500}</>}
                        </motion.button>
                      </motion.div>
                    ) : (
                      <div className="mt-4 pt-4 border-t border-amber-500/20 flex items-center gap-2 text-sm">
                        <Zap className="h-4 w-4 text-accent" />
                        <span className="font-bold">Priority Waitlist unlocked 🔥</span>
                      </div>
                    )}
                  </div>
                )}

                {result.status === "Rejected" && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6">
                    <div className="flex items-center gap-2 text-red-500 mb-3">
                      <XCircle className="h-5 w-5" />
                      <span className="text-sm font-bold tracking-wider uppercase">Not Eligible</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Not eligible for hostel allotment. {result.reject_reason && <span>Reason: <span className="font-bold text-foreground">{result.reject_reason}</span></span>}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground mb-2">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </div>
      <div className="font-heading font-black text-xl tracking-tighter">{value || "—"}</div>
    </div>
  );
}
