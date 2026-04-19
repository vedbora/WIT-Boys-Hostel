import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Download, CheckCircle2, XCircle, FileText, X, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { api, formatError, API } from "../../lib/api";
import { PageTransition } from "../../components/PageTransition";
import { StatusBadge } from "../../components/StatusBadge";

export function Applications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("Pending");
  const [sortBy, setSortBy] = useState("merit");
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get("/applications"); setApps(data); }
    catch (e) { toast.error(formatError(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let r = apps.filter((a) => (a.name + a.email + a.phone + (a.course || "")).toLowerCase().includes(q.toLowerCase()));
    if (filter !== "All") r = r.filter((a) => a.status === filter);
    if (sortBy === "merit") r = r.sort((a, b) => (b.merit_score || 0) - (a.merit_score || 0));
    else if (sortBy === "percentage") r = r.sort((a, b) => b.percentage - a.percentage);
    else if (sortBy === "backlogs") r = r.sort((a, b) => a.backlogs - b.backlogs);
    else if (sortBy === "date") r = r.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return r;
  }, [apps, q, filter, sortBy]);

  const exportCSV = () => {
    const token = localStorage.getItem("auth_token");
    fetch(`${API}/export/applications`, { headers: { Authorization: `Bearer ${token}` }, credentials: "include" })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "applications.csv"; a.click();
        URL.revokeObjectURL(url);
      }).catch(() => toast.error("Export failed"));
  };

  return (
    <PageTransition>
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground mb-2">Hostel / Applications</div>
          <h1 className="font-heading font-black text-4xl tracking-tighter">Applications</h1>
        </div>
        <button data-testid="export-applications-csv" onClick={exportCSV} className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-border hover:border-foreground text-sm font-bold">
          <Download className="h-4 w-4" /> CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input data-testid="applications-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search applicant..."
            className="w-full h-11 rounded-lg bg-card border border-border pl-11 pr-4 text-sm focus:border-foreground transition-colors" />
        </div>
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
          {["All", "Pending", "Approved", "Rejected"].map((f) => (
            <button key={f} data-testid={`applications-filter-${f.toLowerCase()}`} onClick={() => setFilter(f)}
              className={`h-9 px-4 rounded-md text-xs font-bold uppercase tracking-wider ${filter === f ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>{f}</button>
          ))}
        </div>
        <select data-testid="applications-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          className="h-11 rounded-lg bg-card border border-border px-4 text-sm font-medium cursor-pointer">
          <option value="merit">Sort: Merit</option>
          <option value="percentage">Sort: Percentage</option>
          <option value="backlogs">Sort: Backlogs</option>
          <option value="date">Sort: Recent</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">No applications match your filters.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence initial={false}>
            {filtered.map((a, idx) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ delay: idx * 0.03 }}
                whileHover={{ x: 4 }}
                data-testid={`application-row-${a.id}`}
                onClick={() => setSelected(a)}
                className="cursor-pointer rounded-xl border border-border bg-card hover:border-foreground/50 p-5 transition-colors"
              >
                <div className="grid md:grid-cols-6 gap-4 items-center">
                  <div className="md:col-span-2">
                    <div className="font-heading font-bold">{a.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{a.email}</div>
                  </div>
                  <div>
                    <div className="text-[9px] tracking-[0.2em] uppercase font-bold text-muted-foreground">Course</div>
                    <div className="text-sm font-semibold">{a.course}</div>
                  </div>
                  <div>
                    <div className="text-[9px] tracking-[0.2em] uppercase font-bold text-muted-foreground">Merit</div>
                    <div className="font-mono font-bold">{a.percentage}% / {a.backlogs}B</div>
                  </div>
                  <div>
                    <div className="text-[9px] tracking-[0.2em] uppercase font-bold text-muted-foreground">Suggested</div>
                    <div className="text-sm font-semibold">{a.suggested_room_type}</div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {a.waitlist_paid && (
                      <span data-testid={`priority-badge-${a.id}`} className="inline-flex items-center gap-1 rounded-full bg-accent/15 text-accent border border-accent/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                        <Zap className="h-3 w-3" /> Priority
                      </span>
                    )}
                    <StatusBadge status={a.status} />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {selected && <ApplicationDetail app={selected} onClose={() => setSelected(null)} onUpdated={load} />}
      </AnimatePresence>
    </PageTransition>
  );
}

function ApplicationDetail({ app, onClose, onUpdated }) {
  const [override, setOverride] = useState(app.suggested_room_type);
  const [processing, setProcessing] = useState(false);
  const [creds, setCreds] = useState(null);

  const approve = async () => {
    setProcessing(true);
    try {
      const { data } = await api.post(`/applications/${app.id}/approve`, { override_room_type: override });
      toast.success("Application approved · bed allocated");
      setCreds(data.login_credentials);
      onUpdated();
    } catch (e) { toast.error(formatError(e)); }
    finally { setProcessing(false); }
  };

  const reject = async () => {
    if (!window.confirm("Reject this application?")) return;
    setProcessing(true);
    try { await api.post(`/applications/${app.id}/reject`); toast.success("Rejected"); onUpdated(); onClose(); }
    catch (e) { toast.error(formatError(e)); }
    finally { setProcessing(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()} data-testid="application-detail-modal"
        className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-8 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg"><X className="h-4 w-4" /></button>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-foreground text-background flex items-center justify-center font-heading font-bold">{app.name?.[0]?.toUpperCase()}</div>
          <div>
            <div className="font-heading font-black text-2xl tracking-tighter">{app.name}</div>
            <StatusBadge status={app.status} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Info label="Email" value={app.email} mono />
          <Info label="Phone" value={app.phone} mono />
          <Info label="Course" value={app.course} />
          <Info label="Year" value={app.year} />
          <Info label="Percentage" value={`${app.percentage}%`} mono />
          <Info label="Backlogs" value={app.backlogs} mono />
          <Info label="Preferred" value={app.preferred_room_type} />
          <Info label="Merit Score" value={app.merit_score?.toFixed?.(1)} mono />
        </div>

        {app.status === "Pending" && (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-accent" />
                <div className="text-[10px] tracking-[0.3em] uppercase font-bold">Room Allocation</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["2 Seater", "3 Seater", "4 Seater"].map((t) => (
                  <button key={t} data-testid={`detail-override-${t.replace(" ", "-").toLowerCase()}`} onClick={() => setOverride(t)}
                    className={`h-11 rounded-lg border font-bold text-xs uppercase tracking-wider ${override === t ? "border-foreground bg-foreground text-background" : "border-border"}`}>{t}</button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">System suggested: <span className="font-bold">{app.suggested_room_type}</span></p>
            </div>

            <div className="flex gap-2">
              <button data-testid="app-reject-btn" onClick={reject} disabled={processing}
                className="flex-1 h-12 rounded-full border border-red-500/50 text-red-500 hover:bg-red-500/10 text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60">
                <XCircle className="h-4 w-4" /> Reject
              </button>
              <button data-testid="app-approve-btn" onClick={approve} disabled={processing}
                className="flex-1 h-12 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60">
                <CheckCircle2 className="h-4 w-4" /> {processing ? "Approving..." : "Approve & Allocate"}
              </button>
            </div>
          </>
        )}

        {app.status === "Approved" && !creds && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-5 space-y-2">
            <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-emerald-500">Allotted</div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><span className="text-muted-foreground">Room:</span> <span className="font-bold">{app.assigned_room_number}</span></div>
              <div><span className="text-muted-foreground">Bed:</span> <span className="font-bold">#{app.bed_number}</span></div>
              <div><span className="text-muted-foreground">Type:</span> <span className="font-bold">{app.assigned_room_type}</span></div>
            </div>
          </div>
        )}

        {creds && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-xl bg-accent/10 border border-accent/40 p-5"
            data-testid="approval-credentials">
            <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-accent mb-3">Student Login Credentials</div>
            <div className="space-y-2 text-sm font-mono">
              <div><span className="text-muted-foreground">Phone:</span> {creds.phone}</div>
              <div><span className="text-muted-foreground">Password:</span> <span className="font-bold">{creds.password}</span></div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Share these with the student. (Shown once only)</p>
          </motion.div>
        )}

        {app.status === "Rejected" && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-5">
            <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-red-500 mb-2">Rejected</div>
            <p className="text-sm text-muted-foreground">Reason: <span className="font-bold text-foreground">{app.reject_reason || "Admin decision"}</span></p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function Info({ label, value, mono }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground mb-1">{label}</div>
      <div className={`text-sm font-semibold ${mono ? "font-mono" : ""}`}>{value || "—"}</div>
    </div>
  );
}
