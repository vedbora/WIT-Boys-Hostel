import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight, BedDouble, ShieldCheck, Zap, Sparkles, Building2, Users, Trophy } from "lucide-react";
import { PublicNav } from "../components/PublicNav";
import { PageTransition, stagger, staggerItem } from "../components/PageTransition";
import { useAuth } from "../context/AuthContext";

const HERO_IMG = "https://images.pexels.com/photos/15577446/pexels-photo-15577446.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1400";
const LOUNGE_IMG = "https://images.unsplash.com/photo-1586638920189-f4a05ac92005?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1Mjh8MHwxfHNlYXJjaHwyfHxjb2xsZWdlJTIwc3R1ZGVudHMlMjBzdHVkeWluZyUyMHRvZ2V0aGVyJTIwbG91bmdlfGVufDB8fHx8MTc3NjM4NTEyNHww&ixlib=rb-4.1.0&q=85";
const ROOM_IMG = "https://images.unsplash.com/photo-1762803733564-fecc7669a91a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDZ8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMjBtaW5pbWFsaXN0JTIwYmVkcm9vbSUyMGludGVyaW9yJTIwZGFya3xlbnwwfHx8fDE3NzYzODUxMzV8MA&ixlib=rb-4.1.0&q=85";

const ROOM_TIERS = [
  { type: "2 Seater", tag: "PREMIUM", fee: "₹45,000/yr", merit: "≥ 80%", perks: ["Attached Bath", "AC", "Study Desk", "High-Speed Wi-Fi"] },
  { type: "3 Seater", tag: "STANDARD", fee: "₹35,000/yr", merit: "≥ 60%", perks: ["Attached Bath", "Cooler", "Storage", "Wi-Fi"] },
  { type: "4 Seater", tag: "ECONOMY", fee: "₹28,000/yr", merit: "General", perks: ["Shared Bath", "Fan", "Storage", "Wi-Fi"] },
];

export function Landing() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const { user } = useAuth();
  const applyHref = !user ? "/signup" : user.role === "student" ? "/apply" : "/";

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <PageTransition>
      <PublicNav />

      {/* HERO */}
      <section ref={heroRef} className="relative min-h-screen overflow-hidden pt-16">
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="absolute inset-0"
        >
          <img src={HERO_IMG} alt="Hostel" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        </motion.div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-10 pt-20 lg:pt-32 pb-20">
          <motion.div initial="initial" animate="animate" variants={stagger} className="grid md:grid-cols-12 gap-8">
            <motion.div variants={staggerItem} className="md:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur px-4 py-1.5 mb-8">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-dot" />
                <span className="text-[10px] tracking-[0.25em] uppercase font-bold">Admissions Open / 2026</span>
              </div>

              <h1 className="font-heading font-black text-5xl sm:text-7xl lg:text-8xl tracking-tighter leading-[0.9]">
                A hostel<br />
                built on<br />
                <span className="text-accent">merit.</span>
              </h1>

              <p className="mt-8 max-w-xl text-base lg:text-lg text-muted-foreground leading-relaxed">
                WIT Boys Hostel pairs every student with the right room based on academics, backlogs and preference. No queues. No politics. Just transparent merit-based allotment.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <Link to={applyHref} data-testid="hero-apply-cta">
                  <motion.button
                    whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="group inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 h-12 text-sm font-bold tracking-wide"
                  >
                    Apply for Hostel
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
                  </motion.button>
                </Link>
                <Link to="/status" data-testid="hero-status-cta">
                  <motion.button
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur px-6 h-12 text-sm font-bold"
                  >
                    Check Status
                  </motion.button>
                </Link>
              </div>
            </motion.div>

            <motion.div variants={staggerItem} className="md:col-span-5 md:pl-8">
              <div className="grid grid-cols-2 gap-3 md:mt-20">
                {[
                  { icon: Building2, num: "24", label: "Rooms Available" },
                  { icon: Users, num: "500+", label: "Students Hosted" },
                  { icon: Trophy, num: "98%", label: "Satisfaction" },
                  { icon: Zap, num: "24/7", label: "Wi-Fi & Security" },
                ].map((it, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
                    className="rounded-xl border border-border bg-card/60 backdrop-blur p-5"
                  >
                    <it.icon className="h-4 w-4 mb-3 text-muted-foreground" />
                    <div className="font-heading font-black text-3xl tracking-tighter">{it.num}</div>
                    <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-1">{it.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Marquee strip */}
        <div className="relative z-10 border-y border-border bg-foreground text-background overflow-hidden">
          <div className="marquee-track flex gap-16 whitespace-nowrap py-4 font-heading font-black text-2xl tracking-tighter">
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className="flex items-center gap-6">
                MERIT-BASED ALLOTMENT <Sparkles className="h-5 w-5" /> NO POLITICS <Sparkles className="h-5 w-5" /> TRANSPARENT <Sparkles className="h-5 w-5" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-10 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="grid md:grid-cols-12 gap-8 items-end mb-16"
        >
          <div className="md:col-span-8">
            <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground mb-4">01 / The Flow</div>
            <h2 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl tracking-tighter leading-none">
              Four steps.<br />Zero friction.
            </h2>
          </div>
          <div className="md:col-span-4 text-muted-foreground">
            Our merit engine evaluates your percentage and backlogs to suggest the best-fit room in real time. Admin approves, you get your bed. Done.
          </div>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-0 border-t border-b border-border">
          {[
            { n: "01", title: "Apply", desc: "Fill the form with your academics and room preference." },
            { n: "02", title: "Merit Check", desc: "System auto-suggests a room tier based on your profile." },
            { n: "03", title: "Admin Review", desc: "Admin approves. Room + bed number gets assigned." },
            { n: "04", title: "Move In", desc: "Login with your phone, access your dashboard, settle in." },
          ].map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
              className="p-8 border-r border-border last:border-r-0 hover:bg-muted/40 transition-colors"
            >
              <div className="font-mono text-xs text-muted-foreground mb-8">{s.n}</div>
              <div className="font-heading font-black text-2xl tracking-tight mb-3">{s.title}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ROOM TIERS */}
      <section className="bg-foreground text-background py-24 md:py-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-background/60 mb-4">02 / Rooms</div>
            <h2 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl tracking-tighter leading-none">
              Three tiers. Your score picks.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {ROOM_TIERS.map((r, i) => (
              <motion.div
                key={r.type}
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }}
                whileHover={{ y: -6 }}
                className="rounded-2xl border border-background/20 bg-background/5 p-6 flex flex-col"
              >
                <div className="flex items-center justify-between mb-8">
                  <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-background/60">{r.tag}</span>
                  <BedDouble className="h-5 w-5 text-accent" />
                </div>
                <div className="font-heading font-black text-4xl tracking-tighter mb-2">{r.type}</div>
                <div className="font-mono text-sm text-background/60 mb-6">Merit: {r.merit}</div>
                <div className="font-heading font-black text-3xl tracking-tighter mb-6">{r.fee}</div>
                <ul className="space-y-2 mb-8 flex-1">
                  {r.perks.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm text-background/80">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" /> {p}
                    </li>
                  ))}
                </ul>
                <Link to={applyHref} data-testid={`room-apply-${r.type.replace(" ", "-").toLowerCase()}`}>
                  <button className="w-full h-11 rounded-full bg-background text-foreground font-bold text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                    Apply for {r.type}
                  </button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* BENTO GRID - life at hostel */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-10 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted-foreground mb-4">03 / Life</div>
          <h2 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl tracking-tighter leading-none">
            Built for focus.<br />Tuned for community.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-12 gap-4 md:gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="md:col-span-8 md:row-span-2 relative h-80 md:h-auto rounded-2xl overflow-hidden border border-border group"
          >
            <img src={LOUNGE_IMG} alt="Students lounge" className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-8 text-white">
              <div className="text-[10px] tracking-[0.3em] uppercase font-bold mb-2 text-white/70">Common Lounge</div>
              <div className="font-heading font-black text-3xl tracking-tighter">Study hard. Together.</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: 0.1, duration: 0.5 }}
            className="md:col-span-4 rounded-2xl border border-border bg-card p-8"
          >
            <Zap className="h-5 w-5 mb-6" />
            <div className="font-heading font-black text-3xl tracking-tighter mb-3">24/7 Wi-Fi</div>
            <p className="text-sm text-muted-foreground">Gigabit fiber on every floor. No dead zones. No excuses.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: 0.2, duration: 0.5 }}
            className="md:col-span-4 rounded-2xl border border-border bg-card p-8"
          >
            <ShieldCheck className="h-5 w-5 mb-6" />
            <div className="font-heading font-black text-3xl tracking-tighter mb-3">CCTV + Guards</div>
            <p className="text-sm text-muted-foreground">Round-the-clock security. Biometric entry. Peace of mind.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }} transition={{ delay: 0.3, duration: 0.6 }}
            className="md:col-span-6 relative h-64 rounded-2xl overflow-hidden border border-border group"
          >
            <img src={ROOM_IMG} alt="Room" className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 text-white">
              <div className="text-[10px] tracking-[0.3em] uppercase font-bold mb-1 text-white/70">Your Space</div>
              <div className="font-heading font-black text-2xl tracking-tighter">Minimal. Focused.</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: 0.4, duration: 0.5 }}
            className="md:col-span-6 rounded-2xl border-2 border-accent bg-accent text-accent-foreground p-8 flex flex-col justify-between"
          >
            <div>
              <div className="text-[10px] tracking-[0.3em] uppercase font-bold mb-4">Ready?</div>
              <div className="font-heading font-black text-4xl tracking-tighter leading-none">Start your<br />application<br />in 60 seconds.</div>
            </div>
            <Link to={applyHref} data-testid="bento-apply-cta">
              <motion.button
                whileHover={{ x: 4 }}
                className="mt-8 inline-flex items-center gap-2 text-sm font-bold tracking-wide"
              >
                Apply Now <ArrowUpRight className="h-4 w-4" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-foreground text-background flex items-center justify-center rounded-md">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="leading-none">
              <div className="font-heading font-black tracking-tighter">WIT BOYS HOSTEL</div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mt-1">Est. 2026 / A merit house</div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to={applyHref} className="link-underline">Apply</Link>
            <Link to="/status" className="link-underline">Status</Link>
            <Link to="/login" className="link-underline">Admin</Link>
            <Link to="/student/login" className="link-underline">Student</Link>
          </div>
        </div>
      </footer>
    </PageTransition>
  );
}
