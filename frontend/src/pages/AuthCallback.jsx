import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { api, setAuthToken, formatError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function AuthCallback() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) {
      navigate("/login", { replace: true });
      return;
    }
    const sessionId = match[1];

    (async () => {
      try {
        const { data } = await api.post("/auth/google/session", { session_id: sessionId });
        // Use session_token as Bearer too for cross-origin non-cookie envs
        if (data.session_token) setAuthToken(data.session_token);
        await refresh();
        toast.success(`Welcome, ${data.user?.name?.split(" ")[0] || "friend"}!`);
        // Clear hash and navigate
        window.history.replaceState(null, "", window.location.pathname);
        if (data.user?.role === "admin") navigate("/admin", { replace: true });
        else navigate("/student", { replace: true });
      } catch (e) {
        toast.error(formatError(e) || "Google sign-in failed");
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate, refresh]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="h-12 w-12 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
        <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground">Signing you in...</div>
      </motion.div>
    </div>
  );
}
