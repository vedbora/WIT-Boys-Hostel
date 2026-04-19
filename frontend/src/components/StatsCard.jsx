import { motion } from "framer-motion";

export function StatsCard({ label, value, icon: Icon, accent = false, delay = 0, testid, suffix = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      data-testid={testid}
      className={`relative overflow-hidden rounded-xl border p-6 transition-all ${
        accent
          ? "bg-foreground text-background border-foreground"
          : "bg-card text-card-foreground border-border hover:border-foreground/30"
      }`}
    >
      <div className="flex items-start justify-between mb-6">
        <span className={`text-[10px] tracking-[0.25em] uppercase font-bold ${accent ? "text-background/70" : "text-muted-foreground"}`}>
          {label}
        </span>
        {Icon && (
          <div className={`h-9 w-9 flex items-center justify-center rounded-lg ${accent ? "bg-background/10" : "bg-muted"}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="font-heading font-black text-5xl tracking-tighter tabular-nums">
        {value}
        {suffix && <span className="text-xl align-top ml-1 font-medium">{suffix}</span>}
      </div>
    </motion.div>
  );
}
