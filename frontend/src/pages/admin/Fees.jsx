import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Download, Search, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { api, formatError, API } from "../../lib/api";
import { PageTransition } from "../../components/PageTransition";
import { StatusBadge } from "../../components/StatusBadge";

export function Fees() {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showOnly, setShowOnly] = useState("all");
  const [payingId, setPayingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([api.get("/students"), api.get("/payments")]);
      setStudents(s.data);
      setPayments(p.data);
    } catch (e) { toast.error(formatError(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const m = (s.name + s.phone + (s.room_number || "")).toLowerCase().includes(q.toLowerCase());
      if (showOnly === "pending") return m && s.fees_status === "Pending";
      if (showOnly === "paid") return m && s.fees_status === "Paid";
      return m;
    });
  }, [students, q, showOnly]);

  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingCount = students.filter((s) => s.fees_status === "Pending").length;
  const paidCount = students.filter((s) => s.fees_status === "Paid").length;

  const markPaid = async (student) => {
    setPayingId(student.id);
    try {
      await api.post("/payments", { student_id: student.id, amount: student.fees_amount, method: "Cash" });
      toast.success(`Payment recorded for ${student.name}`);
      load();
    } catch (e) { toast.error(formatError(e)); }
    finally { setPayingId(null); }
  };

  const exportCSV = () => {
    const token = localStorage.getItem("auth_token");
    fetch(`${API}/export/payments`, { headers: { Authorization: `Bearer ${token}` }, credentials: "include" })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "payments.csv"; a.click();
        URL.revokeObjectURL(url);
      }).catch(() => toast.error("Export failed"));
  };

  return (
    <PageTransition>
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground mb-2">Hostel / Fees</div>
          <h1 className="font-heading font-black text-4xl tracking-tighter">Fees</h1>
        </div>
        <button data-testid="export-payments-csv" onClick={exportCSV} className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-border hover:border-foreground text-sm font-bold">
          <Download className="h-4 w-4" /> CSV
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <StatBlock label="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} accent />
        <StatBlock label="Paid Students" value={paidCount} />
        <StatBlock label="Pending" value={pendingCount} danger={pendingCount > 0} />
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input data-testid="fees-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student..."
            className="w-full h-11 rounded-lg bg-card border border-border pl-11 pr-4 text-sm focus:border-foreground transition-colors" />
        </div>
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
          {[{ v: "all", l: "All" }, { v: "pending", l: "Pending" }, { v: "paid", l: "Paid" }].map((f) => (
            <button key={f.v} data-testid={`fees-filter-${f.v}`} onClick={() => setShowOnly(f.v)}
              className={`h-9 px-4 rounded-md text-xs font-bold uppercase tracking-wider ${showOnly === f.v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>{f.l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Wallet className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">No students match.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {["Student", "Room", "Amount", "Status", "Action"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] tracking-[0.2em] uppercase font-bold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((s, idx) => (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      data-testid={`fees-row-${s.id}`}
                      className={`border-b border-border last:border-0 ${s.fees_status === "Pending" ? "bg-amber-500/5" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center font-heading font-bold">{s.name?.[0]?.toUpperCase()}</div>
                          <div>
                            <div className="font-semibold">{s.name}</div>
                            <div className="text-xs text-muted-foreground">{s.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="font-heading font-bold">#{s.room_number}</span> <span className="text-xs text-muted-foreground">({s.room_type})</span></td>
                      <td className="px-4 py-3 font-mono font-bold">₹{(s.fees_amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.fees_status} /></td>
                      <td className="px-4 py-3">
                        {s.fees_status === "Pending" ? (
                          <button data-testid={`mark-paid-${s.id}`} disabled={payingId === s.id} onClick={() => markPaid(s)}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 disabled:opacity-60">
                            <Check className="h-3 w-3" /> {payingId === s.id ? "Recording..." : "Mark Paid"}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-semibold"><Check className="h-3 w-3" /> Settled</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageTransition>
  );
}

function StatBlock({ label, value, accent, danger }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-6 ${accent ? "bg-foreground text-background border-foreground" : danger ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-card"}`}>
      <div className={`text-[10px] tracking-[0.25em] uppercase font-bold mb-4 ${accent ? "text-background/70" : "text-muted-foreground"}`}>{label}</div>
      <div className="font-heading font-black text-4xl tracking-tighter">{value}</div>
    </motion.div>
  );
}
