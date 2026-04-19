import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Phone, Mail, Hash, BedDouble, Home, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { api, formatError } from "../../lib/api";
import { PageTransition } from "../../components/PageTransition";

export function StudentProfile() {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/students/me").then(({ data }) => setStudent(data)).catch((e) => toast.error(formatError(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageTransition><div className="h-64 rounded-2xl bg-muted animate-pulse" /></PageTransition>;

  return (
    <PageTransition>
      <div className="mb-10">
        <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground mb-2">Student / Profile</div>
        <h1 className="font-heading font-black text-4xl lg:text-5xl tracking-tighter">Profile</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-8 mb-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-16 w-16 rounded-full bg-foreground text-background flex items-center justify-center font-heading font-black text-2xl">
            {student?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="font-heading font-black text-2xl tracking-tighter">{student?.name}</div>
            <div className="text-sm text-muted-foreground">{student?.course} · {student?.year}</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field icon={Phone} label="Phone" value={student?.phone} mono />
          <Field icon={Mail} label="Email" value={student?.email} />
          <Field icon={Home} label="Room Number" value={`#${student?.room_number}`} />
          <Field icon={BedDouble} label="Bed Number" value={`#${student?.bed_number}`} />
          <Field icon={Hash} label="Room Type" value={student?.room_type} />
          <Field icon={GraduationCap} label="Course / Year" value={`${student?.course} · ${student?.year}`} />
        </div>
      </motion.div>

      <div className="text-xs text-muted-foreground">
        To update personal details, please contact the hostel admin office.
      </div>
    </PageTransition>
  );
}

function Field({ icon: Icon, label, value, mono }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase font-bold text-muted-foreground mb-2">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={`font-semibold ${mono ? "font-mono" : ""}`}>{value || "—"}</div>
    </div>
  );
}
