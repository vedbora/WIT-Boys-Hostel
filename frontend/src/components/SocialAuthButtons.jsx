import { motion } from "framer-motion";
import { toast } from "sonner";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function startGoogleAuth() {
  const redirectUrl = window.location.origin + "/auth/callback";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}

export function SocialAuthButtons({ className = "" }) {
  const onApple = () => toast("Apple sign-in coming soon", { description: "Use email/phone or Google for now." });

  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      <motion.button
        whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
        data-testid="google-auth-button"
        onClick={startGoogleAuth}
        type="button"
        className="h-11 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center gap-2 text-sm font-medium transition-colors"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
          <path d="M22.5 12.23c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.58c2.1-1.94 3.31-4.79 3.31-8.07z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.58-2.75c-.99.66-2.26 1.06-3.7 1.06-2.85 0-5.26-1.93-6.12-4.52H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.88 14.13c-.22-.66-.35-1.36-.35-2.08 0-.72.13-1.42.35-2.08V7.13H2.18A10.97 10.97 0 0 0 1 12.05c0 1.76.42 3.43 1.18 4.92l3.7-2.84z" fill="#FBBC05" />
          <path d="M12 5.45c1.61 0 3.06.55 4.2 1.64l3.15-3.15C17.46 2.08 14.97 1.1 12 1.1 7.7 1.1 3.99 3.57 2.18 7.13l3.7 2.84C6.74 7.38 9.15 5.45 12 5.45z" fill="#EA4335" />
        </svg>
        Google
      </motion.button>
      <motion.button
        whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
        data-testid="apple-auth-button"
        onClick={onApple}
        type="button"
        className="h-11 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center gap-2 text-sm font-medium transition-colors"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
        Apple
      </motion.button>
    </div>
  );
}
