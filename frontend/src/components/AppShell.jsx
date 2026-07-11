import Navbar from "@/components/Navbar";

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="min-w-0 pt-16 lg:pl-64 lg:pt-0">
        {children}
      </div>
    </div>
  );
}
