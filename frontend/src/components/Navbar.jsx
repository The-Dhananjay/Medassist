import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Stethoscope, LogOut, LayoutDashboard, FileText, Plus } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const active = (p) => location.pathname === p;

  const linkClass = (p) =>
    `text-sm font-medium px-3 py-2 rounded-md transition-colors duration-150 ${
      active(p) ? "text-primary bg-secondary" : "text-muted-foreground hover:text-primary hover:bg-muted"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-7xl px-6 flex h-16 items-center justify-between">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2" data-testid="nav-logo">
          <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground grid place-items-center">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div className="leading-tight">
            <div className="font-serif text-lg tracking-tight">MedAssist</div>
            <div className="overline text-muted-foreground text-[10px]">AI Diagnosis</div>
          </div>
        </Link>

        {user ? (
          <nav className="flex items-center gap-1">
            <Link to="/dashboard" className={linkClass("/dashboard")} data-testid="nav-dashboard">
              <LayoutDashboard className="inline w-4 h-4 mr-1" /> Dashboard
            </Link>
            <Link to="/diagnose" className={linkClass("/diagnose")} data-testid="nav-diagnose">
              <Plus className="inline w-4 h-4 mr-1" /> New
            </Link>
            <Link to="/reports" className={linkClass("/reports")} data-testid="nav-reports">
              <FileText className="inline w-4 h-4 mr-1" /> Reports
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => { await logout(); navigate("/"); }}
              data-testid="nav-logout"
              className="ml-2"
            >
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </nav>
        ) : (
          <nav className="flex items-center gap-2">
            <Link to="/login" data-testid="nav-login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link to="/register" data-testid="nav-register">
              <Button size="sm" className="rounded-full px-4">Get started</Button>
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
