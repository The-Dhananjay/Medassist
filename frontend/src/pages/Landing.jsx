import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, HeartPulse, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";

const MedAssist3DScene = lazy(() => import("@/components/animations/MedAssist3DScene"));

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-16 lg:grid-cols-12">
          <motion.div
            className="relative lg:col-span-7"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <motion.span className="overline text-muted-foreground" data-testid="hero-eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}>
              Preliminary triage, in seconds
            </motion.span>
            <motion.h1 className="mt-4 font-serif text-4xl leading-[1.02] tracking-tight text-primary sm:text-6xl lg:text-7xl" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12, ease: "easeOut" }}>
              A calmer way <br />
              to understand <br />
              <em className="not-italic text-primary/80">your symptoms.</em>
            </motion.h1>
            <motion.p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.2, ease: "easeOut" }}>
              MedAssist listens to what you are feeling and offers AI-guided possibilities, home
              remedies, and clear signals for when to see a doctor. Not a replacement for a physician,
              but a companion before one.
            </motion.p>
            <motion.div className="mt-8 flex flex-wrap gap-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.28, ease: "easeOut" }}>
              <Link to="/register" data-testid="hero-cta-register">
                <Button size="lg" className="rounded-full px-6">
                  Try a free diagnosis <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login" data-testid="hero-cta-login">
                <Button size="lg" variant="outline" className="rounded-full px-6">
                  I already have an account
                </Button>
              </Link>
            </motion.div>

            <motion.div className="mt-10 grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-3" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.36 } } }}>
              {[
                { k: "2-4", v: "Conditions per report" },
                { k: "<10s", v: "Median response" },
                { k: "24/7", v: "Available" },
              ].map((stat) => (
                <motion.div key={stat.k} className="border-l border-border pl-3" variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.35, ease: "easeOut" }}>
                  <div className="font-serif text-2xl text-primary">{stat.k}</div>
                  <div className="text-xs text-muted-foreground">{stat.v}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div className="relative lg:col-span-5" initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.18, ease: "easeOut" }}>
            <div className="absolute -inset-6 -z-10 rotate-1 rounded-3xl bg-secondary/50" />
            <Suspense fallback={<div className="h-[360px] w-full rounded-2xl bg-secondary/40 shadow-xl sm:h-[520px]" />}>
              <MedAssist3DScene />
            </Suspense>
            <div className="absolute bottom-6 left-6 right-6 rounded-xl border border-border bg-background/95 p-4 shadow-md backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-primary">Powered by gemini-2.5-flash</div>
                  <div className="text-xs text-muted-foreground">
                    Careful medical reasoning and structured results.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-16 sm:px-6 sm:py-20 md:grid-cols-3">
          {[
            {
              icon: HeartPulse,
              title: "Symptom-aware",
              body: "Multi-select common symptoms or type your own. Suggestions guide you.",
            },
            {
              icon: Activity,
              title: "Structured reports",
              body: "Possible causes, OTC options, home remedies, precautions, and doctor cues.",
            },
            {
              icon: ShieldCheck,
              title: "Private by design",
              body: "Your reports live in your account. Delete any time.",
            },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              className="rounded-xl border border-border bg-card p-6 transition-transform duration-200 hover:-translate-y-0.5"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.42, delay: index * 0.08, ease: "easeOut" }}
              whileHover={{ y: -5 }}
            >
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-secondary">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-serif text-xl text-primary">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
