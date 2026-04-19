import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, BedDouble, BedSingle, Wallet, MessageSquareWarning, FileText, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { StatsCard } from "../../components/StatsCard";
import { PageTransition } from "../../components/PageTransition";
import { api, formatError } from "../../lib/api";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";

const COLORS = ["#3B82F6", "#FF2A00", "#10B981", "#A3A3A3"];

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/dashboard/stats").then(({ data }) => setStats(data)).catch((e) => toast.error(formatError(e)));
  }, []);

  const occupancyRate = stats ? Math.round((stats.occupied_beds / Math.max(stats.total_beds, 1)) * 100) : 0;

  return (
    <PageTransition>
      <div className="mb-10">
        <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground mb-2">Control Room / Overview</div>
        <h1 className="font-heading font-black text-4xl lg:text-5xl tracking-tighter leading-none">
          Hey {user?.name?.split(" ")[0] || "Admin"},<br />here's what's happening.
        </h1>
      </div>

      {!stats ? (
        <div className="grid md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8">
            <StatsCard testid="stat-students" label="Total Students" value={stats.total_students} icon={Users} delay={0} />
            <StatsCard testid="stat-rooms" label="Total Rooms" value={stats.total_rooms} icon={BedDouble} delay={0.05} />
            <StatsCard testid="stat-available-beds" label="Available Beds" value={stats.available_beds} icon={BedSingle} delay={0.1} />
            <StatsCard testid="stat-occupied-beds" label="Occupied Beds" value={stats.occupied_beds} icon={BedDouble} delay={0.15} accent />
            <StatsCard testid="stat-complaints" label="Pending Complaints" value={stats.pending_complaints} icon={MessageSquareWarning} delay={0.2} />
            <StatsCard testid="stat-revenue" label="Revenue Collected" value={`₹${(stats.revenue / 1000).toFixed(1)}`} suffix="K" icon={Wallet} delay={0.25} />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Occupancy chart */}
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              data-testid="occupancy-chart"
              className="lg:col-span-2 rounded-xl border border-border bg-card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground mb-1">Room Type / Occupancy</div>
                  <div className="font-heading font-black text-2xl tracking-tighter">Bed Distribution</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] tracking-[0.2em] uppercase font-bold text-muted-foreground">Overall</div>
                  <div className="font-heading font-black text-3xl tracking-tighter">{occupancyRate}%</div>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={stats.room_type_breakdown.map((b) => ({ type: b.type, occupied: b.occupied, available: b.total - b.occupied }))}>
                    <XAxis dataKey="type" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      cursor={{ fill: "hsl(var(--muted))" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="occupied" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="available" stackId="a" fill="hsl(var(--muted))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Applications status */}
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="rounded-xl border border-border bg-card p-6"
              data-testid="applications-pie"
            >
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4" />
                <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground">Applications</div>
              </div>
              <div className="font-heading font-black text-3xl tracking-tighter mb-2">{stats.pending_applications}</div>
              <div className="text-sm text-muted-foreground mb-6">Pending review</div>

              <div className="space-y-3">
                <StatRow label="Total Beds" value={stats.total_beds} />
                <StatRow label="Occupied" value={stats.occupied_beds} />
                <StatRow label="Available" value={stats.available_beds} />
                <StatRow label="In Progress" value={stats.in_progress_complaints} />
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span className="text-muted-foreground">Revenue:</span>
                  <span className="font-heading font-bold">₹{stats.revenue?.toLocaleString?.()}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </PageTransition>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-bold">{value}</span>
    </div>
  );
}
