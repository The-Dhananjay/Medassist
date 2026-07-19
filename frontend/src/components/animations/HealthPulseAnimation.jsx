import { motion, useReducedMotion } from "framer-motion";

const specks = [
  [10, 14],
  [74, 18],
  [18, 70],
  [82, 68],
];

export default function HealthPulseAnimation({ message = "Analyzing your health..." }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
      <div className="relative h-24 w-24">
        {!reduceMotion &&
          specks.map(([left, top], index) => (
            <motion.span
              key={`${left}-${top}`}
              className="absolute h-1.5 w-1.5 rounded-full bg-primary/60"
              style={{ left, top }}
              animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 1.8, delay: index * 0.2, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        {[0, 0.26].map((delay) => (
          <motion.span
            key={delay}
            className="absolute inset-2 rounded-full border border-primary/25"
            animate={reduceMotion ? {} : { scale: [0.72, 1.28], opacity: [0.45, 0] }}
            transition={{ duration: 1.5, delay, repeat: Infinity, ease: "easeOut" }}
          />
        ))}
        <motion.svg
          viewBox="0 0 96 96"
          className="relative h-24 w-24 text-primary"
          animate={reduceMotion ? {} : { scale: [1, 1.06, 1] }}
          transition={{ duration: 0.78, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        >
          <ellipse cx="48" cy="78" rx="28" ry="7" fill="currentColor" opacity="0.12" />
          <path
            d="M48 76 C28 61 18 49 18 35 C18 24 26 17 36 17 C42 17 46 20 48 25 C50 20 54 17 60 17 C70 17 78 24 78 35 C78 49 68 61 48 76 Z"
            fill="currentColor"
            opacity="0.22"
          />
          <path
            d="M48 76 C28 61 18 49 18 35 C18 24 26 17 36 17 C42 17 46 20 48 25 C50 20 54 17 60 17 C70 17 78 24 78 35 C78 49 68 61 48 76 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <motion.path
            d="M22 47 H36 L41 36 L48 58 L56 43 L61 47 H75"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={reduceMotion ? {} : { pathLength: [0.2, 1, 0.2], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.svg>
      </div>
      <div className="overline">{message}</div>
    </div>
  );
}
