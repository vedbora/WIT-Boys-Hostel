import { motion } from "framer-motion";

const MAP = {
  Pending: { bg: "bg-amber-500/15", text: "text-amber-500", dot: "bg-amber-500", border: "border-amber-500/40" },
  Approved: { bg: "bg-emerald-500/15", text: "text-emerald-500", dot: "bg-emerald-500", border: "border-emerald-500/40" },
  Rejected: { bg: "bg-red-500/15", text: "text-red-500", dot: "bg-red-500", border: "border-red-500/40" },
  "In Progress": { bg: "bg-blue-500/15", text: "text-blue-500", dot: "bg-blue-500", border: "border-blue-500/40" },
  Resolved: { bg: "bg-emerald-500/15", text: "text-emerald-500", dot: "bg-emerald-500", border: "border-emerald-500/40" },
  Paid: { bg: "bg-emerald-500/15", text: "text-emerald-500", dot: "bg-emerald-500", border: "border-emerald-500/40" },
  Removed: { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground", border: "border-border" },
};

export function StatusBadge({ status, size = "sm" }) {
  const s = MAP[status] || MAP.Pending;
  const sizeCls = size === "lg" ? "px-4 py-2 text-sm" : "px-2.5 py-1 text-xs";
  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25 }}
      data-testid={`status-badge-${status?.toLowerCase?.().replace(/\s+/g, "-")}`}
      className={`inline-flex items-center gap-2 rounded-full border font-semibold uppercase tracking-wider ${sizeCls} ${s.bg} ${s.text} ${s.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${status === "Pending" || status === "In Progress" ? "pulse-dot" : ""}`} />
      {status}
    </motion.span>
  );
}
