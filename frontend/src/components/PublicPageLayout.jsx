import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";

export default function PublicPageLayout({ eyebrow, title, description, children }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
          <span className="overline text-muted-foreground">{eyebrow}</span>
          <h1 className="mt-3 font-serif text-3xl text-primary sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
          <div className="mt-8 space-y-8">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
