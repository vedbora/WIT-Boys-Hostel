import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Download, Trash2, Edit3, Users, X, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { api, formatError, API } from "../../lib/api";
import { PageTransition } from "../../components/PageTransition";
import { StatusBadge } from "../../components/StatusBadge";

export function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/students");
      setStudents(data);
    } catch (e) { toast.error(formatError(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matches = (s.name + s.phone + (s.email || "") + (s.room_number || "")).toLowerCase().includes(q.toLowerCase());
      if (filter === "all") return matches;
      if (filter === "paid") return matches && s.fees_status === "Paid";
      if (filter === "pending") return matches && s.fees_status === "Pending";
      return matches;
    });
  }, [students, q, filter]);

  const remove = async (id) => {
    if (!window.confirm("Remove student? This frees the bed.")) return;
    try { await api.delete(`/students/${id}`); toast.success("Student removed"); load(); }
    catch (e) { toast.error(formatError(e)); }
  };

  const exportCSV = () => {
    const token = localStorage.getItem("auth_token");
    fetch(`${API}/export/students`, { headers: { Authorization: `Bearer ${token}` }, credentials: "include" })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "students.csv"; a.click();
        URL.revokeObjectURL(url);
      }).catch(() => toast.error("Export failed"));
  };

  return (
    <PageTransition>
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground mb-2">Hostel / Students</div>
          <h1 className="font-heading font-black text-4xl tracking-tighter">Students</h1>
        </div>
        <div className="flex gap-2">
          <button data-testid="export-students-csv" onClick={exportCSV} className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-border hover:border-foreground text-sm font-bold">
            <Download className="h-4 w-4" /> CSV
          </button>
          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} data-testid="add-student-btn"
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-foreground text-background text-sm font-bold">
            <Plus className="h-4 w-4" /> New Student
          </motion.button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input data-testid="students-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, email, room..."
            className="w-full h-11 rounded-lg bg-card border border-border pl-11 pr-4 text-sm focus:border-foreground transition-colors" />
        </div>
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
          {[{ v: "all", l: "All" }, { v: "paid", l: "Paid" }, { v: "pending", l: "Pending" }].map((f) => (
            <button key={f.v} data-testid={`students-filter-${f.v}`} onClick={() => setFilter(f.v)}
              className={`h-9 px-4 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${filter === f.v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">No students match.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <Th>Student</Th>
                  <Th>Contact</Th>
                  <Th>Room</Th>
                  <Th>Bed</Th>
                  <Th>Fees</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((s, idx) => (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      data-testid={`student-row-${s.id}`}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center font-heading font-bold">{s.name?.[0]?.toUpperCase()}</div>
                          <div>
                            <div className="font-semibold">{s.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{s.id.slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3" />{s.phone}</div>
                        {s.email && <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><Mail className="h-3 w-3" />{s.email}</div>}
                      </td>
                      <td className="px-4 py-3"><span className="font-heading font-bold">#{s.room_number}</span><div className="text-xs text-muted-foreground">{s.room_type}</div></td>
                      <td className="px-4 py-3 font-mono">#{s.bed_number}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.fees_status} /></td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button data-testid={`edit-student-${s.id}`} onClick={() => { setEditing(s); setShowForm(true); }}
                            className="h-8 w-8 rounded-lg border border-border hover:border-foreground inline-flex items-center justify-center"><Edit3 className="h-3 w-3" /></button>
                          <button data-testid={`delete-student-${s.id}`} onClick={() => remove(s.id)}
                            className="h-8 w-8 rounded-lg border border-border hover:border-red-500 hover:text-red-500 inline-flex items-center justify-center"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showForm && <StudentForm initial={editing} onClose={() => setShowForm(false)} onSaved={load} />}
      </AnimatePresence>
    </PageTransition>
  );
}

function Th({ children, className = "" }) {
  return <th className={`px-4 py-3 text-left text-[10px] tracking-[0.2em] uppercase font-bold text-muted-foreground ${className}`}>{children}</th>;
}

function StudentForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: initial?.name || "", phone: initial?.phone || "", email: initial?.email || "",
    preferred_room_type: "4 Seater",
    fees_status: initial?.fees_status || "Pending",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial) {
        await api.patch(`/students/${initial.id}`, {
          name: form.name, phone: form.phone, email: form.email || null, fees_status: form.fees_status,
        });
        toast.success("Student updated");
      } else {
        await api.post("/students", {
          name: form.name, phone: form.phone, email: form.email || null, preferred_room_type: form.preferred_room_type,
        });
        toast.success("Student added & bed allocated");
      }
      onSaved(); onClose();
    } catch (err) { toast.error(formatError(err)); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()} data-testid="student-form-modal"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-8">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg"><X className="h-4 w-4" /></button>
        <h2 className="font-heading font-black text-2xl tracking-tighter mb-1">{initial ? "Edit Student" : "New Student"}</h2>
        <p className="text-sm text-muted-foreground mb-6">{initial ? "Update details." : "Auto-allocates a bed."}</p>
        <form onSubmit={submit} className="space-y-4">
          <FormInput label="Name" tid="student-form-name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <FormInput label="Phone" tid="student-form-phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v.replace(/\D/g, "") })} required />
          <FormInput label="Email (optional)" tid="student-form-email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          {!initial && (
            <div>
              <label className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground mb-2 block">Preferred Room Type</label>
              <div className="grid grid-cols-3 gap-2">
                {["2 Seater", "3 Seater", "4 Seater"].map((t) => (
                  <button key={t} type="button" data-testid={`student-form-type-${t.replace(" ", "-").toLowerCase()}`}
                    onClick={() => setForm({ ...form, preferred_room_type: t })}
                    className={`h-11 rounded-lg border font-bold text-xs uppercase tracking-wider ${form.preferred_room_type === t ? "border-foreground bg-foreground text-background" : "border-border"}`}>{t}</button>
                ))}
              </div>
            </div>
          )}
          {initial && (
            <div>
              <label className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground mb-2 block">Fees Status</label>
              <div className="grid grid-cols-2 gap-2">
                {["Pending", "Paid"].map((s) => (
                  <button key={s} type="button" data-testid={`student-form-fees-${s.toLowerCase()}`}
                    onClick={() => setForm({ ...form, fees_status: s })}
                    className={`h-11 rounded-lg border font-bold text-xs uppercase tracking-wider ${form.fees_status === s ? "border-foreground bg-foreground text-background" : "border-border"}`}>{s}</button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border border-border text-sm font-bold">Cancel</button>
            <button disabled={saving} data-testid="student-form-save" type="submit" className="flex-1 h-11 rounded-full bg-foreground text-background text-sm font-bold disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function FormInput({ label, tid, value, onChange, type = "text", required }) {
  return (
    <div>
      <label className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground mb-2 block">{label}</label>
      <input data-testid={tid} type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full h-11 rounded-lg bg-background border border-border px-4 text-sm font-medium focus:border-foreground transition-colors" />
    </div>
  );
}
