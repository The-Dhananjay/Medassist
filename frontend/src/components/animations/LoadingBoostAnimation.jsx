import { motion, useReducedMotion } from "framer-motion";

export default function LoadingBoostAnimation({ message = "Loading..." }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
      <div className="relative h-24 w-24">
        <motion.span
          className="absolute inset-x-5 bottom-2 h-4 rounded-full bg-primary/20 blur-md"
          animate={reduceMotion ? {} : { scaleX: [0.85, 1.25, 0.85], opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.svg
          viewBox="0 0 96 96"
          className="relative h-24 w-24 text-primary"
          animate={reduceMotion ? {} : { y: [3, -5, 3] }}
          transition={{ duration: 2.05, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        >
          <motion.path
            d="M39 65 C35 71 28 74 21 74 C22 67 26 61 33 57"
            fill="currentColor"
            opacity="0.2"
            animate={reduceMotion ? {} : { opacity: [0.12, 0.28, 0.12] }}
            transition={{ duration: 1.45, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.path
            d="M57 65 C61 71 68 74 75 74 C74 67 70 61 63 57"
            fill="currentColor"
            opacity="0.2"
            animate={reduceMotion ? {} : { opacity: [0.12, 0.28, 0.12] }}
            transition={{ duration: 1.45, repeat: Infinity, ease: "easeInOut" }}
          />
          <path
            d="M48 12 C61 22 66 39 60 58 L48 70 L36 58 C30 39 35 22 48 12 Z"
            fill="hsl(var(--secondary))"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="48" cy="34" r="8" fill="hsl(var(--background))" stroke="currentColor" strokeWidth="3" />
          <path d="M40 58 H56" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <motion.path
            d="M42 72 C42 79 48 86 48 86 C48 86 54 79 54 72"
            fill="currentColor"
            opacity="0.8"
            animate={reduceMotion ? {} : { scaleY: [0.75, 1.18, 0.75], opacity: [0.45, 0.9, 0.45] }}
            style={{ originX: "48px", originY: "72px" }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          />
          {[18, 78].map((cx, index) => (
            <motion.circle
              key={cx}
              cx={cx}
              cy={index ? 28 : 42}
              r="2"
              fill="currentColor"
              animate={reduceMotion ? {} : { y: [0, -7, 0], opacity: [0.25, 0.9, 0.25] }}
              transition={{ duration: 1.8, delay: index * 0.28, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </motion.svg>
      </div>
      <div className="overline">{message}</div>
    </div>
  );
}
