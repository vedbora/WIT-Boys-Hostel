import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, Phone, Lock } from "lucide-react";
import { toast } from "sonner";
import { api, setAuthToken, formatError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { SocialAuthButtons } from "../components/SocialAuthButtons";
import { PageTransition } from "../components/PageTransition";

export function Signup() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: k === "phone" ? e.target.value.replace(/\D/g, "") : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error("Password must be 6+ characters");
    if (!/^\d{7,15}$/.test(form.phone)) return toast.error("Valid phone required");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/student/register", form);
      setAuthToken(data.token);
      await refresh();
      toast.success(`Welcome, ${data.user.name.split(" ")[0]}!`);
      navigate("/apply");
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen grid md:grid-cols-2">
        <div className="flex flex-col min-h-screen p-6 md:p-12">
          <div className="flex items-center justify-between">
            <Link to="/" data-testid="signup-back" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
            <ThemeToggle />
          </div>

          <div className="flex-1 flex items-center">
            <div className="w-full max-w-md mx-auto">
              <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground mb-4">Create Account</div>
              <h1 className="font-heading font-black text-5xl tracking-tighter leading-none mb-3">Let's get you<br />a room.</h1>
              <p className="text-muted-foreground mb-10">Create your account first, then submit your hostel application.</p>

              <form onSubmit={submit} className="space-y-4">
                <Field icon={User} label="Full Name" tid="signup-name" value={form.name} onChange={update("name")} required />
                <Field icon={Mail} label="Email" tid="signup-email" type="email" value={form.email} onChange={update("email")} required />
                <Field icon={Phone} label="Phone" tid="signup-phone" value={form.phone} onChange={update("phone")} placeholder="10-digit" required />
                <Field icon={Lock} label="Password (6+ chars)" tid="signup-password" type="password" value={form.password} onChange={update("password")} required />

                <motion.button
                  whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                  data-testid="signup-submit"
                  disabled={loading} type="submit"
                  className="w-full h-12 rounded-full bg-foreground text-background font-bold text-sm disabled:opacity-60"
                >
                  {loading ? "Creating account..." : "Create Account"}
                </motion.button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full h-px bg-border" /></div>
                  <div className="relative flex justify-center"><span className="bg-background px-3 text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground">Or</span></div>
                </div>

                <SocialAuthButtons />

                <div className="pt-6 text-center text-sm">
                  <Link to="/student/login" data-testid="signup-to-login" className="text-muted-foreground hover:text-foreground link-underline">
                    Already have an account? Login →
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="hidden md:block relative overflow-hidden bg-accent text-accent-foreground">
          <div className="absolute inset-0 hero-noise opacity-50" />
          <div className="absolute inset-0 flex flex-col justify-end p-12">
            <div className="text-[10px] tracking-[0.3em] uppercase font-bold mb-4 opacity-70">WIT Boys Hostel / 2026</div>
            <h2 className="font-heading font-black text-6xl tracking-tighter leading-none mb-4">
              Join 500+<br />residents.
            </h2>
            <p className="opacity-80 max-w-md">Merit-based allotment. Zero queues. Zero politics. Apply in 60 seconds after signup.</p>
          </div>
          <motion.div
            animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full border border-accent-foreground/10"
          />
          <motion.div
            animate={{ y: [0, -30, 0] }} transition={{ duration: 6, repeat: Infinity }}
            className="absolute top-40 right-20 h-32 w-32 rounded-full bg-accent-foreground/10"
          />
        </div>
      </div>
    </PageTransition>
  );
}

function Field({ icon: Icon, label, tid, value, onChange, type = "text", required, placeholder }) {
  return (
    <div>
      <label className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground mb-2 block">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
        <input
          data-testid={tid}
          type={type} value={value} onChange={onChange} required={required} placeholder={placeholder}
          className="w-full h-12 rounded-lg bg-background border border-border pl-11 pr-4 text-sm font-medium focus:border-foreground transition-colors"
        />
      </div>
    </div>
  );
}
