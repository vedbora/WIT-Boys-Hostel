import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, BedDouble, Users, FileText,
  Wallet, MessageSquareWarning, LogOut, Building2, Menu, X
} from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";

const items = [
  { to: "/admin", end: true, label: "Dashboard", icon: LayoutDashboard, tid: "sidebar-dashboard" },
  { to: "/admin/rooms", label: "Rooms", icon: BedDouble, tid: "sidebar-rooms" },
  { to: "/admin/students", label: "Students", icon: Users, tid: "sidebar-students" },
  { to: "/admin/applications", label: "Applications", icon: FileText, tid: "sidebar-applications" },
  { to: "/admin/fees", label: "Fees", icon: Wallet, tid: "sidebar-fees" },
  { to: "/admin/complaints", label: "Complaints", icon: MessageSquareWarning, tid: "sidebar-complaints" },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground grain">
      {/* Mobile header */}
      <div className="md:hidden sticky top-0 z-40 glass flex items-center justify-between px-4 h-14 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 bg-foreground text-background flex items-center justify-center rounded-md">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="font-heading font-black tracking-tighter">WIT ADMIN</span>
        </div>
        <button data-testid="mobile-menu-toggle" onClick={() => setOpen(!open)} className="p-2">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <motion.aside
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className={`${open ? "block" : "hidden"} md:block fixed md:sticky top-0 md:top-0 left-0 z-30 h-screen w-64 bg-card/60 backdrop-blur-xl border-r border-border flex-shrink-0`}
        >
          <div className="p-6 border-b border-border hidden md:block">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-foreground text-background flex items-center justify-center rounded-md">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="leading-none">
                <div className="font-heading font-black tracking-tighter">WIT ADMIN</div>
                <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mt-1">Control Room</div>
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
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                {user?.name?.[0]?.toUpperCase() || "A"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{user?.name}</div>
                <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                data-testid="logout-button"
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border hover:border-foreground px-3 h-10 text-sm font-medium transition-colors"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          </div>
        </motion.aside>

        {/* Main */}
        <main className="flex-1 min-h-screen min-w-0">
          <div className="p-6 md:p-10 lg:p-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
