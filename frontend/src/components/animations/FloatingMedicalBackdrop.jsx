import { Activity, HeartPulse, ShieldCheck, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const floatingItems = [
  { Icon: HeartPulse, className: "left-[12%] top-[20%]", delay: 0 },
  { Icon: ShieldCheck, className: "right-[16%] top-[30%]", delay: 0.18 },
  { Icon: Activity, className: "left-[20%] bottom-[26%]", delay: 0.32 },
  { Icon: Sparkles, className: "right-[22%] bottom-[20%]", delay: 0.46 },
];

export default function FloatingMedicalBackdrop() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {floatingItems.map(({ Icon, className, delay }) => (
        <motion.div
          key={className}
          className={`absolute grid h-12 w-12 place-items-center rounded-2xl border border-primary-foreground/20 bg-background/20 text-primary-foreground shadow-lg backdrop-blur ${className}`}
          initial={{ opacity: 0, scale: 0.86, y: 12 }}
          animate={
            reduceMotion
              ? { opacity: 1, scale: 1, y: 0 }
              : { opacity: 1, scale: 1, y: [0, -10, 0], rotate: [0, 4, 0] }
          }
          transition={{ duration: 3.2, delay, repeat: reduceMotion ? 0 : Infinity, ease: "easeInOut" }}
        >
          <Icon className="h-5 w-5" />
        </motion.div>
      ))}
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <motion.span
          key={item}
          className="absolute h-1.5 w-1.5 rounded-full bg-primary-foreground/65"
          style={{
            left: `${16 + item * 13}%`,
            top: `${22 + (item % 3) * 18}%`,
          }}
          animate={reduceMotion ? {} : { opacity: [0.18, 0.72, 0.18], y: [0, -10, 0] }}
          transition={{ duration: 3.1, delay: item * 0.22, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
