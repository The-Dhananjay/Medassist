import { motion, useReducedMotion } from "framer-motion";

const particles = Array.from({ length: 14 }, (_, index) => ({
  id: index,
  left: 10 + ((index * 29) % 78),
  top: 14 + ((index * 19) % 70),
  delay: index * 0.13,
}));

export default function AuthHologramAnimation() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-primary-foreground/35 bg-primary/20 shadow-2xl backdrop-blur-sm"
        initial={{ opacity: 1, rotateX: 18, rotateY: -18, scale: 1 }}
        animate={
          reduceMotion
            ? { opacity: 0.9, rotateX: 0, rotateY: 0, scale: 1 }
            : { opacity: 0.9, rotateX: [18, -10, 18], rotateY: [-18, 16, -18], scale: [0.94, 1, 0.94] }
        }
        transition={{ duration: 8, repeat: reduceMotion ? 0 : Infinity, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
      />

      <motion.div
        className="absolute inset-x-0 top-1/3 h-16 bg-gradient-to-b from-transparent via-primary-foreground/8 to-transparent"
        animate={reduceMotion ? {} : { y: ["-40vh", "72vh"] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      />

      <svg className="absolute inset-x-8 top-[44%] h-28 text-primary-foreground" viewBox="0 0 520 120">
        <motion.path
          d="M0 70 H110 L132 70 L148 28 L170 102 L194 70 H310 L330 70 L348 48 L368 86 L392 70 H520"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={reduceMotion ? {} : { pathLength: [0.12, 1, 0.12], opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>

      <motion.div
        className="absolute bottom-20 left-1/2 h-20 w-72 -translate-x-1/2 rounded-full border border-primary-foreground/45"
        animate={reduceMotion ? {} : { scale: [0.85, 1.16, 0.85], opacity: [0.2, 0.55, 0.2] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />

      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute h-1.5 w-1.5 rounded-full bg-primary-foreground/80 shadow-[0_0_12px_currentColor]"
          style={{ left: `${particle.left}%`, top: `${particle.top}%` }}
          animate={
            reduceMotion
              ? {}
              : {
                  opacity: [0.15, 1, 0.15],
                  scale: [0.7, 1.35, 0.7],
                  y: [0, -16, 0],
                }
          }
          transition={{ duration: 2.8, delay: particle.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
