import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";

export default function AppShell({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="min-w-0 pt-[calc(var(--app-mobile-header-height)+var(--app-safe-top))] lg:pl-64 lg:pt-0">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
