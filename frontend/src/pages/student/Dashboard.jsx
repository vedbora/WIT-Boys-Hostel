import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BedDouble, Hash, Wallet, GraduationCap, Phone, Home, CheckCircle2, Clock, CreditCard, Loader2, FileText, XCircle, ArrowRight, Zap, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, formatError } from "../../lib/api";
import { PageTransition } from "../../components/PageTransition";
import { StatusBadge } from "../../components/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { useRazorpay } from "../../lib/useRazorpay";

export function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const { config, loading: paying, payFees, payWaitlist } = useRazorpay();

  const load = async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.allSettled([api.get("/students/me"), api.get("/applications/me")]);
      if (s.status === "fulfilled") setStudent(s.value.data);
      else setStudent(null);
      if (a.status === "fulfilled") setApplication(a.value.data);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  if (loading) {
    return (
      <PageTransition>
        <div className="h-96 rounded-2xl bg-muted animate-pulse" />
      </PageTransition>
    );
  }

  // Not yet applied
  if (!application) {
    return (
      <PageTransition>
        <div className="mb-10">
          <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground mb-2">Student / Home</div>
          <h1 className="font-heading font-black text-4xl lg:text-5xl tracking-tighter leading-none">
            Welcome, {user?.name?.split(" ")[0]}.
          </h1>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-accent bg-accent/10 p-8 md:p-12"
          data-testid="apply-now-card"
        >
          <FileText className="h-6 w-6 text-accent mb-6" />
          <h2 className="font-heading font-black text-4xl tracking-tighter mb-3">Apply for your room.</h2>
          <p className="text-muted-foreground mb-8 max-w-xl">
            You haven't submitted an application yet. Fill the merit form, and our engine will suggest the best-fit room. Takes 60 seconds.
          </p>
          <motion.button
            whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }}
            data-testid="goto-apply-btn"
            onClick={() => navigate("/apply")}
            className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-foreground text-background font-bold text-sm"
          >
            Start Application <ArrowRight className="h-4 w-4" />
          </motion.button>
        </motion.div>
      </PageTransition>
    );
  }

  // Applied but no student record (Pending or Rejected)
  if (!student) {
    return (
      <PageTransition>
        <div className="mb-10">
          <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground mb-2">Student / Application Status</div>
          <h1 className="font-heading font-black text-4xl lg:text-5xl tracking-tighter leading-none">
            Your application, <br />{user?.name?.split(" ")[0]}.
          </h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-8"
          data-testid="application-status-card"
        >
          <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
            <div>
              <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground mb-2">Status</div>
              <div className="font-heading font-black text-3xl tracking-tighter">{application.course} · {application.year}</div>
            </div>
            <StatusBadge status={application.status} size="lg" />
          </div>

          {application.status === "Pending" && (
            <>
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-5 mb-4 flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold mb-1">Under admin review</div>
                  <p className="text-sm text-muted-foreground">
                    Merit score: <span className="font-mono font-bold text-foreground">{application.merit_score?.toFixed?.(1)}</span> · Typical wait: 24-48 hours.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Info label="Percentage" value={`${application.percentage}%`} mono />
                <Info label="Backlogs" value={application.backlogs} mono />
                <Info label="Suggested" value={application.suggested_room_type} />
                <Info label="Applied" value={application.preferred_room_type} />
              </div>

              {!application.waitlist_paid ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border-2 border-accent bg-accent/10 p-5"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Zap className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-bold">Jump the queue — Priority Waitlist</div>
                      <p className="text-sm text-muted-foreground mt-1">Pay refundable ₹{config?.waitlist_amount || 500} to boost your priority and get notified first.</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                    data-testid="dash-join-waitlist-btn"
                    onClick={() => payWaitlist(application.id, { name: application.name, email: application.email, phone: application.phone }, load)}
                    disabled={paying || !config?.enabled}
                    className="w-full h-11 rounded-full bg-accent text-accent-foreground font-bold text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
                  >
                    {paying ? <><Loader2 className="h-4 w-4 animate-spin" /> Opening...</> : <><Sparkles className="h-4 w-4" /> Join Waitlist · ₹{config?.waitlist_amount || 500}</>}
                  </motion.button>
                  {config && !config.enabled && (
                    <p className="text-[11px] text-muted-foreground mt-2 text-center">Online payments not yet configured.</p>
                  )}
                </motion.div>
              ) : (
                <div className="rounded-xl border border-accent bg-accent/10 p-4 flex items-center gap-3">
                  <Zap className="h-5 w-5 text-accent" />
                  <div>
                    <div className="font-bold text-sm">On Priority Waitlist 🔥</div>
                    <p className="text-xs text-muted-foreground mt-0.5">We'll email you when your room opens.</p>
                  </div>
                </div>
              )}
            </>
          )}

          {application.status === "Rejected" && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-5 flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-bold mb-1">Not eligible</div>
                <p className="text-sm text-muted-foreground">{application.reject_reason || "Admin decision"}</p>
              </div>
            </div>
          )}
        </motion.div>
      </PageTransition>
    );
  }

  // Approved — show room
  return (
    <PageTransition>
      <div className="mb-10">
        <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground mb-2">Student / Home</div>
        <h1 className="font-heading font-black text-4xl lg:text-5xl tracking-tighter leading-none">
          Welcome, {user?.name?.split(" ")[0]}.
        </h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        data-testid="student-room-card"
        className="relative overflow-hidden rounded-2xl bg-foreground text-background p-8 md:p-10 mb-6"
      >
        <div className="hero-noise absolute inset-0 opacity-30" />
        <div className="relative grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-background/60 mb-4">Your Allotment</div>
            <div className="font-heading font-black text-6xl lg:text-8xl tracking-tighter leading-none">
              #{student.room_number}
            </div>
            <div className="text-lg text-background/70 mt-2">{student.room_type} · Bed #{student.bed_number}</div>
          </div>
          <div className="space-y-4">
            <MetaRow icon={Wallet} label="Fees" value={<StatusBadge status={student.fees_status} />} />
            <MetaRow icon={BedDouble} label="Bed" value={`#${student.bed_number}`} />
            <MetaRow icon={Home} label="Room Type" value={student.room_type} />
          </div>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-4">
        <QuickCard icon={Wallet} label="Fees Amount" value={`₹${(student.fees_amount || 0).toLocaleString()}`} delay={0.1} />
        <QuickCard icon={GraduationCap} label="Course" value={student.course || "—"} delay={0.2} />
        <QuickCard icon={Phone} label="Phone" value={student.phone} delay={0.3} mono />
      </div>

      {student.fees_status === "Pending" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-5"
        >
          <div className="flex items-start gap-3 mb-4">
            <Clock className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-bold mb-1">Hostel Fees Pending</div>
              <p className="text-sm text-muted-foreground">
                Settle your hostel fees of <span className="font-bold text-foreground">₹{(student.fees_amount || 0).toLocaleString()}</span> to secure your allotment.
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
            data-testid="pay-fees-online-btn"
            onClick={() => payFees(load)}
            disabled={paying || !config?.enabled}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-accent text-accent-foreground text-sm font-bold disabled:opacity-60"
          >
            {paying ? <><Loader2 className="h-4 w-4 animate-spin" /> Opening...</> : <><CreditCard className="h-4 w-4" /> Pay Online · ₹{(student.fees_amount || 0).toLocaleString()}</>}
          </motion.button>
          {config && !config.enabled && (
            <p className="text-xs text-muted-foreground mt-2">Online payments not configured. Visit admin office.</p>
          )}
        </motion.div>
      )}

      {student.fees_status === "Paid" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 flex items-start gap-3"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-bold mb-1">All Settled</div>
            <p className="text-sm text-muted-foreground">Your fees are paid. Enjoy your stay at WIT Boys Hostel.</p>
          </div>
        </motion.div>
      )}
    </PageTransition>
  );
}

function MetaRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-background/10 flex items-center justify-center">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-background/60">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}

function QuickCard({ icon: Icon, label, value, delay, mono }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      whileHover={{ y: -4 }}
      className="rounded-xl border border-border bg-card p-6"
    >
      <Icon className="h-4 w-4 text-muted-foreground mb-4" />
      <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground">{label}</div>
      <div className={`font-heading font-black text-2xl tracking-tighter mt-1 ${mono ? "font-mono" : ""}`}>{value}</div>
    </motion.div>
  );
}

function Info({ label, value, mono }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground mb-1">{label}</div>
      <div className={`text-sm font-semibold ${mono ? "font-mono" : ""}`}>{value || "—"}</div>
    </div>
  );
}
