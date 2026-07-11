import { Link } from "react-router-dom";

const footerLinks = [
  { label: "About", to: "/about" },
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "Terms & Conditions", to: "/terms-and-conditions" },
  { label: "Contact", to: "/contact" },
  { label: "FAQ", to: "/faq" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-4">
          {footerLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="transition-colors duration-150 hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>&copy; {new Date().getFullYear()} MedAssist. Preliminary AI triage.</div>
          <div>Not medical advice. In emergencies call your local emergency number.</div>
        </div>
      </div>
    </footer>
  );
}
