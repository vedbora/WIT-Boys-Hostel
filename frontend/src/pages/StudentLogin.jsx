import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { SocialAuthButtons } from "../components/SocialAuthButtons";
import { PageTransition } from "../components/PageTransition";

export function StudentLogin() {
  const { studentLogin, formatError } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await studentLogin(identifier, password);
      toast.success("Welcome back!");
      navigate("/student");
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
            <Link to="/" data-testid="student-login-back" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
            <ThemeToggle />
          </div>

          <div className="flex-1 flex items-center">
            <div className="w-full max-w-md mx-auto">
              <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground mb-4">Student / Portal</div>
              <h1 className="font-heading font-black text-5xl tracking-tighter leading-none mb-3">Welcome back.</h1>
              <p className="text-muted-foreground mb-10">Login with your email or phone + password.</p>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground mb-2 block">Email or Phone</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      data-testid="student-identifier"
                      value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="you@example.com or 9876543210"
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
                      data-testid="student-password"
                      type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-12 rounded-lg bg-background border border-border pl-11 pr-4 text-sm font-medium focus:border-foreground transition-colors"
                      required
                    />
                  </div>
                </div>
                <motion.button
                  whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                  data-testid="student-login-submit"
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

                <div className="pt-6 text-center text-sm space-y-2">
                  <Link to="/signup" data-testid="student-to-signup" className="block font-bold text-foreground link-underline">
                    New here? Create account →
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="hidden md:block relative overflow-hidden bg-accent text-accent-foreground">
          <div className="absolute inset-0 hero-noise opacity-50" />
          <div className="absolute inset-0 flex flex-col justify-end p-12">
            <div className="text-[10px] tracking-[0.3em] uppercase font-bold mb-4 opacity-70">Resident Access</div>
            <h2 className="font-heading font-black text-6xl tracking-tighter leading-none mb-4">
              Your room.<br />Your space.
            </h2>
            <p className="opacity-80 max-w-md">Check your allotment, pay fees, raise complaints — all in one place.</p>
          </div>
          <motion.div
            animate={{ y: [0, -30, 0] }} transition={{ duration: 6, repeat: Infinity }}
            className="absolute top-20 right-20 h-32 w-32 rounded-full bg-accent-foreground/10"
          />
        </div>
      </div>
    </PageTransition>
  );
}
