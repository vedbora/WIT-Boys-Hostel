import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquareWarning, Search, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api, formatError } from "../../lib/api";
import { PageTransition } from "../../components/PageTransition";
import { StatusBadge } from "../../components/StatusBadge";

const NEXT_STATUS = { Pending: "In Progress", "In Progress": "Resolved", Resolved: "Pending" };

export function AdminComplaints() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get("/complaints"); setItems(data); }
    catch (e) { toast.error(formatError(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let r = items.filter((i) => (i.title + i.description + i.student_name).toLowerCase().includes(q.toLowerCase()));
    if (filter !== "All") r = r.filter((i) => i.status === filter);
    return r.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [items, q, filter]);

  const advance = async (complaint) => {
    const next = NEXT_STATUS[complaint.status];
    try { await api.patch(`/complaints/${complaint.id}`, { status: next }); toast.success(`Moved to ${next}`); load(); }
    catch (e) { toast.error(formatError(e)); }
  };

  return (
    <PageTransition>
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground mb-2">Hostel / Complaints</div>
        <h1 className="font-heading font-black text-4xl tracking-tighter">Complaints</h1>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input data-testid="complaints-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search complaints..."
            className="w-full h-11 rounded-lg bg-card border border-border pl-11 pr-4 text-sm focus:border-foreground transition-colors" />
        </div>
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
          {["All", "Pending", "In Progress", "Resolved"].map((f) => (
            <button key={f} data-testid={`complaints-filter-${f.replace(/\s/g, "-").toLowerCase()}`} onClick={() => setFilter(f)}
              className={`h-9 px-4 rounded-md text-xs font-bold uppercase tracking-wider ${filter === f ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <MessageSquareWarning className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">No complaints. All quiet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence initial={false}>
            {filtered.map((c, idx) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ delay: idx * 0.03 }}
                data-testid={`complaint-row-${c.id}`}
                className="rounded-xl border border-border bg-card p-5 hover:border-foreground/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <span className="font-semibold text-foreground">{c.student_name}</span>
                      <span>·</span>
                      <span>Room #{c.room_number}</span>
                      <span>·</span>
                      <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <h3 className="font-heading font-bold text-lg">{c.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{c.description}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground">{c.category}</span>
                  <button data-testid={`advance-complaint-${c.id}`} onClick={() => advance(c)}
                    className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-foreground link-underline">
                    {c.status === "Pending" && <><Loader2 className="h-3 w-3" /> Mark In Progress</>}
                    {c.status === "In Progress" && <><CheckCircle2 className="h-3 w-3" /> Mark Resolved</>}
                    {c.status === "Resolved" && <><Clock className="h-3 w-3" /> Reopen</>}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </PageTransition>
  );
}
