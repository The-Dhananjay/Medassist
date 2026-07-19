import { motion, useReducedMotion } from "framer-motion";

export default function SecurityShieldAnimation({ className = "" }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={`relative grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary ${className}`}
      initial={false}
      animate={reduceMotion ? {} : { scale: [0.86, 1.04, 1] }}
      transition={{ duration: 0.58, ease: "easeOut" }}
      aria-hidden="true"
    >
      <motion.span
        className="absolute inset-0 rounded-full bg-primary/20 blur-md"
        animate={reduceMotion ? {} : { opacity: [0, 0.75, 0.18], scale: [0.8, 1.35, 1.05] }}
        transition={{ duration: 0.75, ease: "easeOut" }}
      />
      <motion.span
        className="absolute inset-0 rounded-full border border-primary/35"
        animate={reduceMotion ? {} : { rotate: 360, opacity: [0.2, 0.7, 0.2] }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      />
      <motion.svg viewBox="0 0 64 64" className="relative h-7 w-7">
        <path d="M32 7 L52 15 V30 C52 43 43 53 32 57 C21 53 12 43 12 30 V15 Z" fill="currentColor" opacity="0.2" />
        <path d="M32 7 L52 15 V30 C52 43 43 53 32 57 C21 53 12 43 12 30 V15 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <path d="M32 18 V46 M20 32 H44" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <motion.ellipse
          cx="32"
          cy="33"
          rx="25"
          ry="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.55"
          animate={reduceMotion ? {} : { rotate: 360 }}
          style={{ originX: "32px", originY: "33px" }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        />
      </motion.svg>
    </motion.div>
  );
}
