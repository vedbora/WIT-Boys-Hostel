import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit3, BedDouble, Search, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { api, formatError } from "../../lib/api";
import { PageTransition } from "../../components/PageTransition";

const TYPES = ["2 Seater", "3 Seater", "4 Seater"];

export function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("available");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/rooms");
      setRooms(data);
    } catch (e) { toast.error(formatError(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const f = rooms.filter((r) =>
      r.room_number.toLowerCase().includes(q.toLowerCase()) ||
      r.room_type.toLowerCase().includes(q.toLowerCase())
    );
    if (sortBy === "available") {
      return f.sort((a, b) => (b.total_beds - b.occupied_beds) - (a.total_beds - a.occupied_beds));
    }
    if (sortBy === "number") return f.sort((a, b) => a.room_number.localeCompare(b.room_number));
    if (sortBy === "type") return f.sort((a, b) => a.room_type.localeCompare(b.room_type));
    return f;
  }, [rooms, q, sortBy]);

  const remove = async (id) => {
    if (!window.confirm("Delete this room?")) return;
    try {
      await api.delete(`/rooms/${id}`);
      toast.success("Room deleted");
      load();
    } catch (e) { toast.error(formatError(e)); }
  };

  return (
    <PageTransition>
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground mb-2">Hostel / Rooms</div>
          <h1 className="font-heading font-black text-4xl tracking-tighter">Rooms</h1>
        </div>
        <motion.button
          whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
          data-testid="add-room-btn"
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-foreground text-background text-sm font-bold"
        >
          <Plus className="h-4 w-4" /> New Room
        </motion.button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            data-testid="rooms-search"
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search room number or type..."
            className="w-full h-11 rounded-lg bg-card border border-border pl-11 pr-4 text-sm focus:border-foreground transition-colors"
          />
        </div>
        <select
          data-testid="rooms-sort"
          value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          className="h-11 rounded-lg bg-card border border-border px-4 text-sm font-medium cursor-pointer"
        >
          <option value="available">Sort: Most Available</option>
          <option value="number">Sort: Room Number</option>
          <option value="type">Sort: Type</option>
        </select>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onAdd={() => setShowForm(true)} />
      ) : (
        <motion.div
          initial="hidden" animate="show"
          variants={{ show: { transition: { staggerChildren: 0.05 } } }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filtered.map((r) => {
            const available = r.total_beds - r.occupied_beds;
            const full = available === 0;
            return (
              <motion.div
                key={r.id}
                variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -4 }}
                data-testid={`room-card-${r.room_number}`}
                className={`relative overflow-hidden rounded-xl border p-6 transition-all ${full ? "border-red-500/40 bg-red-500/5" : "border-emerald-500/40 bg-emerald-500/5"}`}
              >
                <div className="absolute top-4 right-4">
                  <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase ${full ? "bg-red-500/20 text-red-500" : "bg-emerald-500/20 text-emerald-500"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${full ? "bg-red-500" : "bg-emerald-500 pulse-dot"}`} />
                    {full ? "Full" : "Available"}
                  </span>
                </div>

                <BedDouble className="h-5 w-5 text-muted-foreground mb-4" />
                <div className="font-heading font-black text-4xl tracking-tighter">#{r.room_number}</div>
                <div className="text-sm text-muted-foreground mt-1">{r.room_type}</div>

                <div className="mt-6 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-[9px] tracking-[0.2em] uppercase font-bold text-muted-foreground">Beds</div>
                    <div className="font-mono font-bold text-base">{r.occupied_beds}/{r.total_beds}</div>
                  </div>
                  <div>
                    <div className="text-[9px] tracking-[0.2em] uppercase font-bold text-muted-foreground">Free</div>
                    <div className="font-mono font-bold text-base">{available}</div>
                  </div>
                  <div>
                    <div className="text-[9px] tracking-[0.2em] uppercase font-bold text-muted-foreground">Fees</div>
                    <div className="font-mono font-bold text-base">₹{(r.fees / 1000).toFixed(0)}K</div>
                  </div>
                </div>

                <div className="mt-4 h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${full ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${(r.occupied_beds / r.total_beds) * 100}%` }} />
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    data-testid={`edit-room-${r.room_number}`}
                    onClick={() => { setEditing(r); setShowForm(true); }}
                    className="flex-1 h-9 rounded-lg border border-border hover:border-foreground text-xs font-bold inline-flex items-center justify-center gap-1"
                  ><Edit3 className="h-3 w-3" /> Edit</button>
                  <button
                    data-testid={`delete-room-${r.room_number}`}
                    onClick={() => remove(r.id)}
                    className="h-9 w-9 rounded-lg border border-border hover:border-red-500 hover:text-red-500 inline-flex items-center justify-center"
                  ><Trash2 className="h-3 w-3" /></button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <AnimatePresence>
        {showForm && <RoomForm initial={editing} onClose={() => setShowForm(false)} onSaved={load} />}
      </AnimatePresence>
    </PageTransition>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-12 text-center">
      <BedDouble className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
      <h3 className="font-heading font-black text-2xl tracking-tighter mb-2">No rooms yet</h3>
      <p className="text-sm text-muted-foreground mb-6">Create your first room to start allocating beds.</p>
      <button onClick={onAdd} className="h-11 px-6 rounded-full bg-foreground text-background text-sm font-bold">Add Room</button>
    </div>
  );
}

function RoomForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    room_number: initial?.room_number || "",
    room_type: initial?.room_type || "4 Seater",
    fees: initial?.fees || 28000,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial) {
        await api.patch(`/rooms/${initial.id}`, { room_number: form.room_number, room_type: form.room_type, fees: parseFloat(form.fees) });
        toast.success("Room updated");
      } else {
        await api.post("/rooms", { room_number: form.room_number, room_type: form.room_type, fees: parseFloat(form.fees) });
        toast.success("Room created");
      }
      onSaved();
      onClose();
    } catch (err) { toast.error(formatError(err)); }
    finally { setSaving(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-8"
        data-testid="room-form-modal"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg"><X className="h-4 w-4" /></button>
        <h2 className="font-heading font-black text-2xl tracking-tighter mb-1">{initial ? "Edit Room" : "New Room"}</h2>
        <p className="text-sm text-muted-foreground mb-6">Configure bed count & fees.</p>
        <form onSubmit={submit} className="space-y-4">
          <FormInput label="Room Number" tid="room-form-number" value={form.room_number} onChange={(v) => setForm({ ...form, room_number: v })} required />
          <div>
            <label className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground mb-2 block">Room Type</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t} type="button"
                  data-testid={`room-form-type-${t.replace(" ", "-").toLowerCase()}`}
                  onClick={() => setForm({ ...form, room_type: t })}
                  className={`h-11 rounded-lg border font-bold text-xs uppercase tracking-wider ${form.room_type === t ? "border-foreground bg-foreground text-background" : "border-border"}`}
                >{t}</button>
              ))}
            </div>
          </div>
          <FormInput label="Fees (₹/yr)" tid="room-form-fees" type="number" value={form.fees} onChange={(v) => setForm({ ...form, fees: v })} required />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border border-border text-sm font-bold">Cancel</button>
            <button disabled={saving} data-testid="room-form-save" type="submit" className="flex-1 h-11 rounded-full bg-foreground text-background text-sm font-bold disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
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
      <input
        data-testid={tid}
        type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full h-11 rounded-lg bg-background border border-border px-4 text-sm font-medium focus:border-foreground transition-colors"
      />
    </div>
  );
}
