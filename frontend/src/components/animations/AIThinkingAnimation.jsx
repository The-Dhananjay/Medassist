import { motion, useReducedMotion } from "framer-motion";
import ECGLoader from "./ECGLoader";

export default function AIThinkingAnimation({ message = "AI is thinking..." }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="rounded-xl border border-border bg-card p-4 shadow-sm"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <motion.div
          className="relative h-16 w-16 shrink-0"
          initial={false}
          animate={reduceMotion ? {} : { y: [0, -5, 0] }}
          transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.span
            className="absolute inset-x-2 bottom-0 h-3 rounded-full bg-primary/20 blur-md"
            initial={false}
            animate={reduceMotion ? {} : { scaleX: [1, 0.74, 1], opacity: [0.45, 0.8, 0.45] }}
            transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.svg viewBox="0 0 80 80" className="relative h-16 w-16" aria-hidden="true">
            <motion.circle
              cx="40"
              cy="66"
              r="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary/35"
              animate={reduceMotion ? {} : { scale: [0.86, 1.12, 0.86], opacity: [0.45, 0.9, 0.45] }}
              style={{ originX: "40px", originY: "66px" }}
              transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
            />
            <rect x="19" y="24" width="42" height="34" rx="15" fill="hsl(var(--secondary))" stroke="currentColor" className="text-primary" strokeWidth="2" />
            <rect x="25" y="28" width="30" height="18" rx="8" fill="hsl(var(--primary))" opacity="0.14" />
            <circle cx="31" cy="37" r="3.5" fill="currentColor" className="text-primary" />
            <circle cx="49" cy="37" r="3.5" fill="currentColor" className="text-primary" />
            <path d="M34 46 Q40 51 46 46" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary" />
            <path d="M40 54 V64 M34 59 H46" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-primary" />
            <rect x="8" y="33" width="12" height="18" rx="6" fill="hsl(var(--secondary))" stroke="currentColor" strokeWidth="2" className="text-primary/80" />
            <rect x="60" y="33" width="12" height="18" rx="6" fill="hsl(var(--secondary))" stroke="currentColor" strokeWidth="2" className="text-primary/80" />
            <path d="M40 19 V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary/70" />
            <circle cx="40" cy="11" r="2.5" fill="currentColor" className="text-primary" />
          </motion.svg>
        </motion.div>
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-sm font-medium text-primary">
            <span>{message}</span>
            {[0, 1, 2].map((dot) => (
              <motion.span
                key={dot}
                className="h-1.5 w-1.5 rounded-full bg-primary"
                initial={false}
                animate={reduceMotion ? {} : { opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                transition={{ duration: 0.9, delay: dot * 0.14, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
          </div>
          <div className="mt-2 max-w-[11rem]">
            <ECGLoader message="Fetching AI response..." />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
