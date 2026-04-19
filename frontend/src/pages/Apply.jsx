import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles, GraduationCap, Percent, AlertTriangle, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PublicNav } from "../components/PublicNav";
import { PageTransition } from "../components/PageTransition";
import { api, formatError } from "../lib/api";
import { useRazorpay } from "../lib/useRazorpay";
import { useAuth } from "../context/AuthContext";

const STEPS = [
  { key: "academic", label: "Academic" },
  { key: "preference", label: "Preference" },
  { key: "review", label: "Review" },
];

const COURSES = ["B.Tech CSE", "B.Tech ECE", "B.Tech ME", "B.Tech CE", "B.Tech EE", "BBA", "MBA", "B.Sc", "M.Tech"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

function suggestRoom(pct) {
  if (pct >= 80) return "2 Seater";
  if (pct >= 60) return "3 Seater";
  return "4 Seater";
}

function SubmittedView({ submitted, setSubmitted, navigate }) {
  const { config, loading: paying, payWaitlist } = useRazorpay();
  const [onWaitlist, setOnWaitlist] = useState(!!submitted.waitlist_paid);
  const isRejected = submitted.status === "Rejected";

  return (
    <PageTransition>
      <PublicNav />
      <div className="min-h-screen flex items-center justify-center p-6 pt-24">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="max-w-xl w-full rounded-2xl border border-border bg-card p-10"
        >
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-6 ${isRejected ? "bg-red-500/15 text-red-500" : "bg-emerald-500/15 text-emerald-500"}`}
          >
            {isRejected ? <AlertTriangle className="h-8 w-8" /> : <CheckCircle2 className="h-8 w-8" />}
          </motion.div>
          <h2 className="font-heading font-black text-3xl tracking-tighter mb-2 text-center">
            {isRejected ? "Application Rejected" : "Application Received"}
          </h2>
          <p className="text-muted-foreground mb-6 text-center">
            {isRejected
              ? "Not eligible for hostel allotment (more than 2 backlogs)."
              : "Your application is now Pending admin review."}
          </p>
          <div className="rounded-xl bg-muted p-4 mb-6 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Applicant</span><span className="font-semibold">{submitted.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-mono text-xs">{submitted.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Suggested Room</span><span className="font-semibold">{submitted.suggested_room_type}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Merit Score</span><span className="font-mono">{submitted.merit_score?.toFixed?.(1)}</span></div>
          </div>

          {/* Priority Waitlist CTA - only for Pending apps */}
          {!isRejected && !onWaitlist && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              data-testid="priority-waitlist-banner"
              className="rounded-xl border-2 border-accent bg-accent/10 p-5 mb-6"
            >
              <div className="flex items-start gap-3 mb-3">
                <Zap className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-heading font-bold mb-1">Jump the queue · Priority Waitlist</div>
                  <p className="text-sm text-muted-foreground">
                    Pay a <span className="font-bold text-foreground">refundable ₹{config?.waitlist_amount || 500}</span> deposit to get notified the moment your preferred room opens. Refunded if not allotted.
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                data-testid="join-waitlist-btn"
                onClick={() => payWaitlist(submitted.id, { name: submitted.name, email: submitted.email, phone: submitted.phone }, () => { setOnWaitlist(true); setSubmitted({ ...submitted, waitlist_paid: true }); })}
                disabled={paying || !config?.enabled}
                className="w-full h-11 rounded-full bg-accent text-accent-foreground font-bold text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {paying ? <><Loader2 className="h-4 w-4 animate-spin" /> Opening...</> : <><Sparkles className="h-4 w-4" /> Join Waitlist · ₹{config?.waitlist_amount || 500}</>}
              </motion.button>
              {config && !config.enabled && (
                <p className="text-[11px] text-muted-foreground mt-2 text-center">Online payments not yet configured.</p>
              )}
            </motion.div>
          )}

          {onWaitlist && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-accent bg-accent/10 p-5 mb-6 flex items-center gap-3">
              <Zap className="h-5 w-5 text-accent" />
              <div>
                <div className="font-bold">You're on the Priority Waitlist 🔥</div>
                <p className="text-xs text-muted-foreground mt-1">Refundable ₹{config?.waitlist_amount || 500} received. We'll email you when your room opens.</p>
              </div>
            </motion.div>
          )}

          <div className="flex gap-3">
            <button data-testid="apply-goto-status" onClick={() => navigate("/status")} className="flex-1 h-11 rounded-full bg-foreground text-background font-bold text-sm">Check Status</button>
            <button data-testid="apply-back-home" onClick={() => navigate("/")} className="flex-1 h-11 rounded-full border border-border font-bold text-sm">Back Home</button>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}

export function Apply() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    course: "B.Tech CSE", year: "1st Year", percentage: "", backlogs: "0",
    preferred_room_type: "4 Seater",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [checking, setChecking] = useState(true);

  // Redirect to signup if not authenticated; check for existing application
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/signup", { replace: true, state: { next: "/apply" } });
      return;
    }
    if (user.role !== "student") {
      navigate("/", { replace: true });
      return;
    }
    // Check if already applied
    api.get("/applications/me").then(({ data }) => {
      if (data) {
        setSubmitted(data);
      }
      setChecking(false);
    }).catch(() => setChecking(false));
  }, [user, authLoading, navigate]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validateStep = () => {
    if (step === 0) {
      const p = parseFloat(form.percentage);
      if (isNaN(p) || p < 0 || p > 100) return "Percentage must be 0-100";
      const b = parseInt(form.backlogs, 10);
      if (isNaN(b) || b < 0) return "Backlogs must be a non-negative integer";
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) return toast.error(err);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    const err = validateStep();
    if (err) return toast.error(err);
    setSubmitting(true);
    try {
      const { data } = await api.post("/applications", {
        course: form.course,
        year: form.year,
        percentage: parseFloat(form.percentage),
        backlogs: parseInt(form.backlogs, 10),
        preferred_room_type: form.preferred_room_type,
      });
      setSubmitted(data);
      toast.success("Application submitted!");
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const pct = parseFloat(form.percentage);
  const bkl = parseInt(form.backlogs, 10);
  const autoReject = !isNaN(bkl) && bkl > 2;
  const suggestion = !isNaN(pct) ? suggestRoom(pct) : null;

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
      </div>
    );
  }

  if (submitted) {
    return <SubmittedView submitted={submitted} setSubmitted={setSubmitted} navigate={navigate} />;
  }

  return (
    <PageTransition>
      <PublicNav />
      <div className="min-h-screen pt-24 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <Link to="/" data-testid="apply-back-link" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>

          <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground mb-4">Hostel Application / 2026</div>
          <h1 className="font-heading font-black text-5xl sm:text-6xl tracking-tighter leading-none mb-10">
            Apply in <span className="text-accent">60 seconds.</span>
          </h1>

          {/* Stepper */}
          <div className="flex items-center gap-2 mb-10">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`h-8 w-8 flex items-center justify-center rounded-full font-heading font-bold text-sm ${i <= step ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
                    {i + 1}
                  </div>
                  <span className={`text-xs tracking-[0.2em] uppercase font-bold hidden sm:block ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? "bg-foreground" : "bg-border"}`} />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35 }}
              className="rounded-2xl border border-border bg-card p-6 md:p-10 space-y-6"
            >
              {step === 0 && (
                <>
                  <div className="rounded-xl bg-muted/50 border border-border p-4 mb-2">
                    <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground mb-2">Applying as</div>
                    <div className="font-heading font-bold">{user?.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{user?.email} · {user?.phone}</div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Select icon={GraduationCap} label="Course" tid="apply-course"
                      value={form.course} onChange={(v) => update("course", v)} options={COURSES} />
                    <Select label="Year" tid="apply-year"
                      value={form.year} onChange={(v) => update("year", v)} options={YEARS} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field icon={Percent} label="Percentage (%)" tid="apply-percentage" type="number"
                      value={form.percentage} onChange={(v) => update("percentage", v)} placeholder="e.g. 78.5" />
                    <Field label="Backlogs" tid="apply-backlogs" type="number"
                      value={form.backlogs} onChange={(v) => update("backlogs", v)} placeholder="0" />
                  </div>

                  {!isNaN(pct) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={`rounded-xl p-4 border ${autoReject ? "border-red-500/40 bg-red-500/10" : "border-emerald-500/40 bg-emerald-500/10"}`}
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles className={`h-5 w-5 ${autoReject ? "text-red-500" : "text-emerald-500"}`} />
                        <div className="text-sm">
                          {autoReject ? (
                            <span className="text-red-500 font-semibold">Auto-reject: more than 2 backlogs.</span>
                          ) : (
                            <><span className="text-muted-foreground">Merit engine suggests: </span><span className="font-heading font-bold">{suggestion}</span></>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </>
              )}

              {step === 1 && (
                <>
                  <div>
                    <label className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground mb-3 block">Preferred Room Type</label>
                    <div className="grid grid-cols-3 gap-3">
                      {["2 Seater", "3 Seater", "4 Seater"].map((t) => (
                        <button
                          key={t}
                          type="button"
                          data-testid={`apply-room-${t.replace(" ", "-").toLowerCase()}`}
                          onClick={() => update("preferred_room_type", t)}
                          className={`h-24 rounded-xl border-2 font-heading font-bold text-lg transition-all ${form.preferred_room_type === t ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="rounded-xl bg-muted p-4 text-sm space-y-2">
                    <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground mb-2">Review</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-muted-foreground">Name:</span> <span className="font-semibold">{user?.name}</span></div>
                      <div><span className="text-muted-foreground">Email:</span> <span className="font-mono text-xs">{user?.email}</span></div>
                      <div><span className="text-muted-foreground">Course:</span> <span className="font-semibold">{form.course}</span></div>
                      <div><span className="text-muted-foreground">Year:</span> <span className="font-semibold">{form.year}</span></div>
                      <div><span className="text-muted-foreground">Percentage:</span> <span className="font-mono">{form.percentage}%</span></div>
                      <div><span className="text-muted-foreground">Backlogs:</span> <span className="font-mono">{form.backlogs}</span></div>
                      <div><span className="text-muted-foreground">Preferred:</span> <span className="font-semibold">{form.preferred_room_type}</span></div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
                <button
                  data-testid="apply-prev"
                  onClick={prev} disabled={step === 0}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-border text-sm font-bold disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                {step < STEPS.length - 1 ? (
                  <button
                    data-testid="apply-next"
                    onClick={next}
                    className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-foreground text-background text-sm font-bold"
                  >
                    Next <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    data-testid="apply-submit"
                    onClick={submit} disabled={submitting}
                    className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-accent text-accent-foreground text-sm font-bold disabled:opacity-60"
                  >
                    {submitting ? "Submitting..." : "Submit Application"} <Sparkles className="h-4 w-4" />
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
}

function Field({ icon: Icon, label, tid, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <label className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground mb-2 block">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
        <input
          data-testid={tid}
          type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full h-12 rounded-lg bg-background border border-border ${Icon ? "pl-11" : "pl-4"} pr-4 text-sm font-medium focus:border-foreground transition-colors`}
        />
      </div>
    </div>
  );
}

function Select({ icon: Icon, label, tid, value, onChange, options }) {
  return (
    <div>
      <label className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground mb-2 block">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />}
        <select
          data-testid={tid}
          value={value} onChange={(e) => onChange(e.target.value)}
          className={`w-full h-12 rounded-lg bg-background border border-border ${Icon ? "pl-11" : "pl-4"} pr-4 text-sm font-medium focus:border-foreground transition-colors appearance-none cursor-pointer`}
        >
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    </div>
  );
}
