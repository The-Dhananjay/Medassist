import { motion, useReducedMotion } from "framer-motion";

export default function ECGLoader({ message = "Loading..." }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <div className="relative h-12 w-40 overflow-hidden">
        <svg viewBox="0 0 160 48" className="h-full w-full" aria-hidden="true">
          <motion.path
            d="M4 25 H34 L42 25 L48 11 L56 38 L64 25 H92 L100 25 L106 17 L112 31 L118 25 H156"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
            initial={false}
            animate={reduceMotion ? {} : { pathLength: [0.2, 1, 0.2], opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
        <motion.span
          className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_16px_currentColor]"
          initial={false}
          animate={reduceMotion ? {} : { left: ["0%", "96%"], opacity: [0, 1, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <motion.div
        className="overline"
        initial={false}
        animate={reduceMotion ? {} : { opacity: [0.65, 1, 0.65] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      >
        {message}
      </motion.div>
    </div>
  );
}
