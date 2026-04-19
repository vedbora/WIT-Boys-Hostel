import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, MessageSquareWarning, User, LogOut, Building2, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "./ThemeToggle";

const items = [
  { to: "/student", end: true, label: "Dashboard", icon: Home, tid: "student-nav-dashboard" },
  { to: "/student/complaints", label: "Complaints", icon: MessageSquareWarning, tid: "student-nav-complaints" },
  { to: "/student/profile", label: "Profile", icon: User, tid: "student-nav-profile" },
];

export function StudentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/student/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground grain">
      <div className="md:hidden sticky top-0 z-40 glass flex items-center justify-between px-4 h-14 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 bg-foreground text-background flex items-center justify-center rounded-md">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="font-heading font-black tracking-tighter">MY HOSTEL</span>
        </div>
        <button data-testid="student-mobile-menu" onClick={() => setOpen(!open)} className="p-2">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex">
        <motion.aside
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className={`${open ? "block" : "hidden"} md:block fixed md:sticky top-0 left-0 z-30 h-screen w-64 bg-card/60 backdrop-blur-xl border-r border-border`}
        >
          <div className="p-6 border-b border-border hidden md:block">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-foreground text-background flex items-center justify-center rounded-md">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="leading-none">
                <div className="font-heading font-black tracking-tighter">MY HOSTEL</div>
                <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mt-1">Student Portal</div>
              </div>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                data-testid={it.tid}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`
                }
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </NavLink>
            ))}
          </nav>

          <div className="absolute bottom-0 inset-x-0 p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center font-heading font-bold">
                {user?.name?.[0]?.toUpperCase() || "S"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{user?.name}</div>
                <div className="text-xs text-muted-foreground truncate">{user?.phone}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                data-testid="student-logout-button"
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border hover:border-foreground px-3 h-10 text-sm font-medium transition-colors"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          </div>
        </motion.aside>

        <main className="flex-1 min-h-screen min-w-0">
          <div className="p-6 md:p-10 lg:p-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
