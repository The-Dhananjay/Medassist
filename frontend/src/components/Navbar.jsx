import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Stethoscope,
  UserRound,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
    testId: "nav-dashboard",
    isActive: ({ pathname, hash }) => pathname === "/dashboard" && hash !== "#profile-security",
  },
  {
    label: "New Diagnosis",
    to: "/diagnose",
    icon: Plus,
    testId: "nav-diagnose",
    isActive: ({ pathname }) => pathname === "/diagnose",
  },
  {
    label: "Reports",
    to: "/reports",
    icon: FileText,
    testId: "nav-reports",
    isActive: ({ pathname }) => pathname === "/reports" || pathname.startsWith("/reports/"),
  },
  {
    label: "Profile",
    to: "/profile",
    icon: UserRound,
    testId: "nav-profile",
    isActive: ({ pathname, hash }) =>
      pathname === "/profile" ||
      pathname === "/settings" ||
      pathname === "/sessions" ||
      (pathname === "/dashboard" && hash === "#profile-security"),
  },
  {
    label: "Change Password",
    to: "/forgot-password",
    icon: KeyRound,
    testId: "nav-change-password",
    isActive: ({ pathname }) => pathname === "/forgot-password",
  },
];

function Brand({ textVisibility = "always" }) {
  return (
    <Link to="/dashboard" className="flex items-center gap-3" data-testid="nav-logo">
      <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
        <Stethoscope className="h-5 w-5" />
      </div>
      {textVisibility !== "hidden" ? (
        <div
          className={cn(
            "leading-tight",
            textVisibility === "desktop-expanded" ? "hidden lg:block" : "block"
          )}
        >
          <div className="font-serif text-xl font-semibold tracking-tight">MedAssist</div>
        </div>
      ) : null}
    </Link>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const showAppNavigation =
    !!user &&
    ["/dashboard", "/diagnose", "/reports", "/sessions", "/profile", "/settings"].some(
      (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
    );

  const itemClass = (active, compact = false) =>
    cn(
      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150",
      active ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted hover:text-primary",
      compact ? "justify-center px-0 lg:justify-start lg:px-3" : "justify-start"
    );

  const renderNavItem = (item, compact = false) => {
    const Icon = item.icon;
    const active = item.isActive(location);
    return (
      <Link
        key={item.label}
        to={item.to}
        className={itemClass(active, compact)}
        data-testid={item.testId}
        aria-current={active ? "page" : undefined}
        onClick={() => setMobileOpen(false)}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className={compact ? "hidden lg:inline" : undefined}>{item.label}</span>
      </Link>
    );
  };

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    navigate("/");
  };

  if (showAppNavigation) {
    return (
      <>
        <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Brand textVisibility="hidden" />
            <div className="h-9 w-9" aria-hidden="true" />
          </div>
        </header>

        <aside className="fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:flex md:w-20 md:flex-col lg:w-64">
          <div className="flex h-16 items-center border-b border-border px-4 lg:px-6">
            <Brand textVisibility="desktop-expanded" />
          </div>

          <div className="flex flex-1 flex-col justify-between p-3 lg:p-4">
            <nav className="space-y-1">
              {navItems.map((item) => renderNavItem(item, true))}
            </nav>

            <Button
              variant="ghost"
              onClick={handleLogout}
              data-testid="nav-logout"
              className={cn(itemClass(false, true), "h-auto w-full")}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">Logout</span>
            </Button>
          </div>
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[260px] border-r border-border bg-background p-0 sm:max-w-[260px]">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription>Open MedAssist pages and account actions.</SheetDescription>
            </SheetHeader>

            <div className="flex h-full flex-col">
              <div className="border-b border-border px-5 py-4">
                <Brand />
              </div>

              <nav className="flex-1 space-y-1 p-4">
                {navItems.map((item) => renderNavItem(item))}
              </nav>

              <div className="border-t border-border p-4">
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  data-testid="nav-logout-mobile"
                  className={cn(itemClass(false), "h-auto w-full")}
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2" data-testid="nav-logo">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Stethoscope className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="font-serif text-lg tracking-tight">MedAssist</div>
            <div className="overline text-[10px] text-muted-foreground">AI Diagnosis</div>
          </div>
        </Link>

        {user ? (
          <nav className="flex items-center gap-1">
            <Link
              to="/dashboard"
              className={itemClass(location.pathname === "/dashboard" && location.hash !== "#profile-security")}
              data-testid="nav-dashboard"
            >
              <LayoutDashboard className="mr-1 inline h-4 w-4" /> Dashboard
            </Link>
            <Link
              to="/diagnose"
              className={itemClass(location.pathname === "/diagnose")}
              data-testid="nav-diagnose"
            >
              <Plus className="mr-1 inline h-4 w-4" /> New
            </Link>
            <Link
              to="/reports"
              className={itemClass(location.pathname === "/reports" || location.pathname.startsWith("/reports/"))}
              data-testid="nav-reports"
            >
              <FileText className="mr-1 inline h-4 w-4" /> Reports
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              data-testid="nav-logout"
              className="ml-2"
            >
              <LogOut className="mr-1 h-4 w-4" /> Logout
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
