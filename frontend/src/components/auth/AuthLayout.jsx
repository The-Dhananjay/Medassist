import { Stethoscope } from "lucide-react";

const SIDE_IMG =
  "https://images.unsplash.com/photo-1597496610123-889e0aab4816?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2Mzl8MHwxfHNlYXJjaHwyfHxtZWRpY2FsJTIwdGVjaG5vbG9neSUyMGFic3RyYWN0JTIwYmx1ZSUyMHRvbmV8ZW58MHx8fHwxNzgzNTEyMDM3fDA&ixlib=rb-4.1.0&q=85";

export default function AuthLayout({
  eyebrow,
  title,
  description,
  quote,
  quoteSource,
  children,
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:block relative">
        <img src={SIDE_IMG} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-primary/40" />
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

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <span className="overline text-muted-foreground">{eyebrow}</span>
          <h1 className="mt-2 font-serif text-4xl text-primary sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
