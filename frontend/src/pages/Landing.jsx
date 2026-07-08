import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, ShieldCheck, HeartPulse, Activity } from "lucide-react";

const HERO_IMG = "https://images.unsplash.com/photo-1782397132123-0166b524d6bc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBjbGluaWMlMjBpbnRlcmlvciUyMGNhbG0lMjBsaWdodGluZ3xlbnwwfHx8fDE3ODM1MTIwMzZ8MA&ixlib=rb-4.1.0&q=85";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 relative">
            <span className="overline text-muted-foreground" data-testid="hero-eyebrow">
              — Preliminary triage, in seconds
            </span>
            <h1 className="mt-4 font-serif text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight text-primary">
              A calmer way <br />
              to understand <br />
              <em className="not-italic text-primary/80">your symptoms.</em>
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted-foreground leading-relaxed">
              MedAssist listens to what you're feeling and offers AI-guided
              possibilities, home remedies, and clear signals for when to see
              a doctor. Not a replacement for a physician — a companion
              before one.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" data-testid="hero-cta-register">
                <Button size="lg" className="rounded-full px-6">
                  Try a free diagnosis <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/login" data-testid="hero-cta-login">
                <Button size="lg" variant="outline" className="rounded-full px-6">
                  I already have an account
                </Button>
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
              {[
                { k: "2-4", v: "Conditions per report" },
                { k: "<10s", v: "Median response" },
                { k: "24/7", v: "Available" },
              ].map((s) => (
                <div key={s.k} className="border-l border-border pl-3">
                  <div className="font-serif text-2xl text-primary">{s.k}</div>
                  <div className="text-xs text-muted-foreground">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="absolute -inset-6 bg-secondary/50 rounded-3xl -z-10 rotate-1" />
            <img
              src={HERO_IMG}
              alt="Modern clinic interior"
              className="w-full h-[520px] object-cover rounded-2xl shadow-xl"
              data-testid="hero-image"
            />
            <div className="absolute bottom-6 left-6 right-6 bg-background/95 backdrop-blur rounded-xl p-4 border border-border shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary grid place-items-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-primary">Powered by Claude Sonnet 4.5</div>
                  <div className="text-xs text-muted-foreground">Careful medical reasoning, structured results.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-6 py-20 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: HeartPulse, title: "Symptom-aware", body: "Multi-select common symptoms or type your own. Suggestions guide you." },
            { icon: Activity, title: "Structured reports", body: "Possible causes, OTC options, home remedies, precautions, and doctor cues." },
            { icon: ShieldCheck, title: "Private by design", body: "Your reports live in your account. Delete any time." },
          ].map((f) => (
            <div key={f.title} className="bg-card border border-border rounded-xl p-6 hover:-translate-y-0.5 transition-transform duration-200">
              <div className="w-10 h-10 rounded-md bg-secondary grid place-items-center mb-4">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-serif text-xl text-primary">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col sm:flex-row justify-between gap-2 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} MedAssist — Preliminary AI triage.</div>
          <div>Not medical advice. In emergencies call your local emergency number.</div>
        </div>
      </footer>
    </div>
  );
}
