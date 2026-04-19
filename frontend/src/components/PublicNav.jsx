import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, ArrowUpRight } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";

export function PublicNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const applyHref = !user ? "/signup" : user.role === "student" ? "/apply" : "/";

  const links = [
    { label: "Home", href: "/" },
    { label: "Apply", href: applyHref },
    { label: "Check Status", href: "/status" },
  ];

  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 inset-x-0 z-50 glass"
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link to="/" data-testid="logo-home" className="flex items-center gap-2 group">
          <div className="h-8 w-8 bg-foreground text-background flex items-center justify-center rounded-md">
            <Building2 className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-heading font-black text-sm tracking-tighter">WIT BOYS</span>
            <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Hostel / 2026</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.href}
              to={l.href}
              data-testid={`nav-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={`link-underline text-sm font-medium ${location.pathname === l.href ? "text-foreground" : "text-muted-foreground"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user?.role === "admin" ? (
            <button
              data-testid="nav-admin-dashboard"
              onClick={() => navigate("/admin")}
              className="hidden sm:inline-flex items-center gap-1 rounded-full bg-foreground text-background px-4 h-10 text-sm font-semibold hover:bg-foreground/90 transition"
            >
              Dashboard <ArrowUpRight className="h-4 w-4" />
            </button>
          ) : user?.role === "student" ? (
            <button
              data-testid="nav-student-dashboard"
              onClick={() => navigate("/student")}
              className="hidden sm:inline-flex items-center gap-1 rounded-full bg-foreground text-background px-4 h-10 text-sm font-semibold hover:bg-foreground/90 transition"
            >
              My Room <ArrowUpRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              data-testid="nav-login"
              onClick={() => navigate("/student/login")}
              className="hidden sm:inline-flex items-center gap-1 rounded-full bg-foreground text-background px-4 h-10 text-sm font-semibold hover:bg-foreground/90 transition"
            >
              Login <ArrowUpRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.header>
  );
}
