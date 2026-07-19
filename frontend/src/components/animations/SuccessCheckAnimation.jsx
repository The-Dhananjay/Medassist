import { motion, useReducedMotion } from "framer-motion";

const particles = [
  [-18, -18],
  [18, -16],
  [-22, 6],
  [22, 8],
  [-10, 22],
  [12, 22],
];

export default function SuccessCheckAnimation({ className = "" }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={`relative mx-auto h-16 w-16 ${className}`} aria-hidden="true">
      {!reduceMotion &&
        particles.map(([x, y], index) => (
          <motion.span
            key={`${x}-${y}`}
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-primary"
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{ x, y, scale: [0, 1, 0.6], opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.58, delay: 0.32 + index * 0.025, ease: "easeOut" }}
          />
        ))}
      <motion.svg viewBox="0 0 64 64" className="h-16 w-16 text-primary">
        <motion.circle
          cx="32"
          cy="32"
          r="27"
          fill="currentColor"
          className="text-secondary"
          initial={{ scale: 0.82, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        />
        <motion.circle
          cx="32"
          cy="32"
          r="25"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.34, delay: 0.12, ease: "easeInOut" }}
        />
        <motion.path
          d="M21 33.5 L28.5 41 L44 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.28, delay: 0.32, ease: "easeOut" }}
        />
      </motion.svg>
    </div>
  );
}
