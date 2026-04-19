import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";
import "@/App.css";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

import { Landing } from "@/pages/Landing";
import { Apply } from "@/pages/Apply";
import { CheckStatus } from "@/pages/CheckStatus";
import { AdminLogin } from "@/pages/AdminLogin";
import { StudentLogin } from "@/pages/StudentLogin";
import { Signup } from "@/pages/Signup";
import { AuthCallback } from "@/pages/AuthCallback";

import { AdminLayout } from "@/components/AdminLayout";
import { StudentLayout } from "@/components/StudentLayout";

import { Dashboard as AdminDashboard } from "@/pages/admin/Dashboard";
import { Rooms } from "@/pages/admin/Rooms";
import { Students } from "@/pages/admin/Students";
import { Applications } from "@/pages/admin/Applications";
import { Fees } from "@/pages/admin/Fees";
import { AdminComplaints } from "@/pages/admin/Complaints";

import { StudentDashboard } from "@/pages/student/Dashboard";
import { StudentComplaints } from "@/pages/student/Complaints";
import { StudentProfile } from "@/pages/student/Profile";

function Protected({ role, children }) {
  const { user, loading } = useAuth();
  // Skip auth check if returning from OAuth callback - AuthCallback will handle it
  if (typeof window !== "undefined" && window.location.hash?.includes("session_id=")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
      </div>
    );
  }
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to={role === "student" ? "/student/login" : "/login"} replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const location = useLocation();
  // CRITICAL: Process session_id synchronously during render (NOT in useEffect) to prevent race conditions
  if (location.hash && location.hash.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/apply" element={<Apply />} />
        <Route path="/status" element={<CheckStatus />} />
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route path="/admin" element={<Protected role="admin"><AdminLayout /></Protected>}>
          <Route index element={<AdminDashboard />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="students" element={<Students />} />
          <Route path="applications" element={<Applications />} />
          <Route path="fees" element={<Fees />} />
          <Route path="complaints" element={<AdminComplaints />} />
        </Route>

        <Route path="/student" element={<Protected role="student"><StudentLayout /></Protected>}>
          <Route index element={<StudentDashboard />} />
          <Route path="complaints" element={<StudentComplaints />} />
          <Route path="profile" element={<StudentProfile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="App min-h-screen bg-background text-foreground">
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                classNames: {
                  toast: "bg-card text-card-foreground border border-border",
                },
              }}
            />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
