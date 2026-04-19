import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { SocialAuthButtons } from "../components/SocialAuthButtons";
import { PageTransition } from "../components/PageTransition";

export function AdminLogin() {
  const { adminLogin, formatError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@witboys.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminLogin(email, password);
      toast.success("Welcome back, Admin");
      navigate("/admin");
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen grid md:grid-cols-2">
        {/* Left: form */}
        <div className="flex flex-col min-h-screen p-6 md:p-12">
          <div className="flex items-center justify-between">
            <Link to="/" data-testid="admin-login-back" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
            <ThemeToggle />
          </div>

          <div className="flex-1 flex items-center">
            <div className="w-full max-w-md mx-auto">
              <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground mb-4">Admin / Control Room</div>
              <h1 className="font-heading font-black text-5xl tracking-tighter leading-none mb-3">Welcome back.</h1>
              <p className="text-muted-foreground mb-10">Sign in to manage rooms, students, fees & complaints.</p>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground mb-2 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      data-testid="admin-email"
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-12 rounded-lg bg-background border border-border pl-11 pr-4 text-sm font-medium focus:border-foreground transition-colors"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground mb-2 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      data-testid="admin-password"
                      type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-12 rounded-lg bg-background border border-border pl-11 pr-4 text-sm font-medium focus:border-foreground transition-colors"
                      required
                    />
                  </div>
                </div>
                <motion.button
                  whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                  data-testid="admin-login-submit"
                  disabled={loading} type="submit"
                  className="w-full h-12 rounded-full bg-foreground text-background font-bold text-sm disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </motion.button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full h-px bg-border" /></div>
                  <div className="relative flex justify-center"><span className="bg-background px-3 text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground">Or</span></div>
                </div>

                <SocialAuthButtons />

                <div className="pt-6 text-center text-sm">
                  <Link to="/student/login" data-testid="admin-to-student-login" className="text-muted-foreground hover:text-foreground link-underline">
                    Student login instead →
                  </Link>
                </div>
              </form>

              <div className="mt-8 rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 mb-1"><ShieldCheck className="h-3 w-3" /><span className="font-semibold uppercase tracking-wider">Demo</span></div>
                <div className="font-mono">admin@witboys.com · Admin@123</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: visual */}
        <div className="hidden md:block relative overflow-hidden bg-foreground">
          <div className="absolute inset-0 hero-noise" />
          <div className="absolute inset-0 flex flex-col justify-end p-12 text-background">
            <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-background/60 mb-4">WIT Boys Hostel</div>
            <h2 className="font-heading font-black text-6xl tracking-tighter leading-none mb-4">
              Manage it<br />like a CEO.
            </h2>
            <p className="text-background/70 max-w-md">
              Real-time bed allocation. Merit-based approvals. One-tap CSV exports. Zero spreadsheet chaos.
            </p>
          </div>
          <motion.div
            animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full border border-background/10"
          />
          <motion.div
            animate={{ rotate: -360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full border border-background/10"
          />
        </div>
      </div>
    </PageTransition>
  );
}
