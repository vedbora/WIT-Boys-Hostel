import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageSquareWarning, Send, X } from "lucide-react";
import { toast } from "sonner";
import { api, formatError } from "../../lib/api";
import { PageTransition } from "../../components/PageTransition";
import { StatusBadge } from "../../components/StatusBadge";

const CATEGORIES = ["General", "Plumbing", "Electrical", "Cleaning", "Wi-Fi", "Mess", "Security", "Other"];

export function StudentComplaints() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get("/complaints/me"); setItems(data); }
    catch (e) { toast.error(formatError(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <PageTransition>
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground mb-2">Student / Complaints</div>
          <h1 className="font-heading font-black text-4xl tracking-tighter">My Complaints</h1>
        </div>
        <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} data-testid="new-complaint-btn"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-foreground text-background text-sm font-bold">
          <Plus className="h-4 w-4" /> New Complaint
        </motion.button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <MessageSquareWarning className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-heading font-black text-2xl tracking-tighter mb-2">All good!</h3>
          <p className="text-sm text-muted-foreground">No complaints raised. Let us know if something's off.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence initial={false}>
            {items.map((c, idx) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ delay: idx * 0.05 }}
                data-testid={`my-complaint-${c.id}`}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground">{c.category}</span>
                    <h3 className="font-heading font-bold text-lg mt-1">{c.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{c.description}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Raised {new Date(c.created_at).toLocaleDateString()} · Updated {new Date(c.updated_at).toLocaleDateString()}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showForm && <ComplaintForm onClose={() => setShowForm(false)} onSaved={load} />}
      </AnimatePresence>
    </PageTransition>
  );
}

function ComplaintForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: "", description: "", category: "General" });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return toast.error("Fill all fields");
    setSaving(true);
    try { await api.post("/complaints", form); toast.success("Complaint submitted"); onSaved(); onClose(); }
    catch (err) { toast.error(formatError(err)); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()} data-testid="complaint-form-modal"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-8">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg"><X className="h-4 w-4" /></button>
        <h2 className="font-heading font-black text-2xl tracking-tighter mb-1">Raise Complaint</h2>
        <p className="text-sm text-muted-foreground mb-6">We'll route this to the right team.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground mb-2 block">Category</label>
            <select data-testid="complaint-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full h-11 rounded-lg bg-background border border-border px-4 text-sm font-medium cursor-pointer">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground mb-2 block">Title</label>
            <input data-testid="complaint-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Short summary" className="w-full h-11 rounded-lg bg-background border border-border px-4 text-sm font-medium focus:border-foreground" />
          </div>
          <div>
            <label className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground mb-2 block">Description</label>
            <textarea data-testid="complaint-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Tell us what's happening..." rows={4}
              className="w-full rounded-lg bg-background border border-border px-4 py-3 text-sm focus:border-foreground resize-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border border-border text-sm font-bold">Cancel</button>
            <button disabled={saving} data-testid="complaint-submit" type="submit" className="flex-1 h-11 rounded-full bg-foreground text-background text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? "Sending..." : <><Send className="h-3 w-3" /> Submit</>}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
