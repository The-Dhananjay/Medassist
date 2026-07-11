import { Link } from "react-router-dom";
import { Activity, ArrowRight, HeartPulse, ShieldCheck, Sparkles } from "lucide-react";

import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";

const HERO_IMG =
  "https://images.unsplash.com/photo-1782397132123-0166b524d6bc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBjbGluaWMlMjBpbnRlcmlvciUyMGNhbG0lMjBsaWdodGluZ3xlbnwwfHx8fDE3ODM1MTIwMzZ8MA&ixlib=rb-4.1.0&q=85";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-16 lg:grid-cols-12">
          <div className="relative lg:col-span-7">
            <span className="overline text-muted-foreground" data-testid="hero-eyebrow">
              Preliminary triage, in seconds
            </span>
            <h1 className="mt-4 font-serif text-4xl leading-[1.02] tracking-tight text-primary sm:text-6xl lg:text-7xl">
              A calmer way <br />
              to understand <br />
              <em className="not-italic text-primary/80">your symptoms.</em>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              MedAssist listens to what you are feeling and offers AI-guided possibilities, home
              remedies, and clear signals for when to see a doctor. Not a replacement for a physician,
              but a companion before one.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
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
            </div>

            <div className="mt-10 grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { k: "2-4", v: "Conditions per report" },
                { k: "<10s", v: "Median response" },
                { k: "24/7", v: "Available" },
              ].map((stat) => (
                <div key={stat.k} className="border-l border-border pl-3">
                  <div className="font-serif text-2xl text-primary">{stat.k}</div>
                  <div className="text-xs text-muted-foreground">{stat.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative lg:col-span-5">
            <div className="absolute -inset-6 -z-10 rotate-1 rounded-3xl bg-secondary/50" />
            <img
              src={HERO_IMG}
              alt="Modern clinic interior"
              className="h-[360px] w-full rounded-2xl object-cover shadow-xl sm:h-[520px]"
              data-testid="hero-image"
            />
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
          </div>
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
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-card p-6 transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-secondary">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-serif text-xl text-primary">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
