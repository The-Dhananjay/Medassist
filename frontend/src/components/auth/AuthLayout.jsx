import { Stethoscope } from "lucide-react";
import { useState } from "react";
import AuthImageMotion from "@/components/animations/AuthImageMotion";

const SIDE_IMG =
  "https://images.unsplash.com/photo-1576091160550-2173dba999ef?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85";

export default function AuthLayout({
  eyebrow,
  title,
  description,
  quote,
  quoteSource,
  children,
}) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="grid min-h-screen grid-cols-1 overflow-x-hidden bg-background lg:grid-cols-[minmax(0,1.08fr)_minmax(430px,0.92fr)]">
      <div className="relative hidden overflow-hidden lg:block">
        <div
          className={`absolute inset-0 bg-secondary transition-opacity duration-500 ${
            imageLoaded ? "opacity-0" : "opacity-100"
          }`}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_65%,hsl(var(--primary)/0.16),transparent_34%),linear-gradient(135deg,hsl(var(--secondary)),hsl(var(--background)))]" />
          <div className="absolute bottom-0 left-0 h-1/2 w-full bg-gradient-to-t from-primary/15 to-transparent" />
          <div className="absolute left-16 top-20 h-2 w-32 rounded-full bg-primary/10" />
          <div className="absolute left-16 top-28 h-2 w-48 rounded-full bg-primary/10" />
        </div>
        <AuthImageMotion>
          <img
            src={SIDE_IMG}
            alt=""
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onLoad={() => setImageLoaded(true)}
            className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        </AuthImageMotion>
        <div className="absolute inset-0 bg-primary/24" />
        <div className="absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-background/8 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-primary-foreground">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-background/95 text-primary">
              <Stethoscope className="h-4 w-4" />
            </div>
            <div className="font-serif text-lg">MedAssist</div>
          </div>
          <blockquote className="max-w-md">
            <p className="font-serif text-3xl leading-tight">{quote}</p>
            <div className="mt-3 overline opacity-80">{quoteSource}</div>
          </blockquote>
        </div>
      </div>

      <div className="relative flex items-center justify-center bg-background p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-md">
          <span className="overline text-muted-foreground">{eyebrow}</span>
          <h1 className="mt-2 font-serif text-3xl text-primary sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
