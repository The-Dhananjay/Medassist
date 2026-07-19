import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";

export default function AuthImageMotion({ children, className = "" }) {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);

  const springX = useSpring(pointerX, { stiffness: 90, damping: 24, mass: 0.45 });
  const springY = useSpring(pointerY, { stiffness: 90, damping: 24, mass: 0.45 });

  const imageX = useTransform(springX, [0, 1], reduceMotion ? ["0px", "0px"] : ["10px", "-10px"]);
  const imageY = useTransform(springY, [0, 1], reduceMotion ? ["0px", "0px"] : ["8px", "-8px"]);
  const shineX = useTransform(springX, [0, 1], ["15%", "85%"]);
  const shineY = useTransform(springY, [0, 1], ["20%", "80%"]);
  const shine = useMotionTemplate`radial-gradient(circle at ${shineX} ${shineY}, rgba(255,255,255,0.28), rgba(255,255,255,0.08) 24%, transparent 48%)`;

  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width);
    pointerY.set((event.clientY - rect.top) / rect.height);
  };

  const handleLeave = () => {
    pointerX.set(0.5);
    pointerY.set(0.5);
  };

  return (
    <motion.div
      className={`absolute inset-0 overflow-hidden ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <motion.div
        className="absolute -inset-4"
        style={{ x: imageX, y: imageY, willChange: "transform" }}
      >
        {children}
      </motion.div>

      <motion.div className="absolute inset-0" style={{ background: shine }} aria-hidden="true" />

      <motion.div
        className="absolute left-[12%] top-[22%] w-[58%] rounded-2xl border border-primary-foreground/25 bg-background/12 p-5 text-primary-foreground shadow-2xl backdrop-blur-md"
        initial={false}
        animate={reduceMotion ? {} : { y: [0, -8, 0], opacity: [0.82, 1, 0.82] }}
        transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="h-2 w-24 rounded-full bg-primary-foreground/70" />
            <div className="mt-3 h-2 w-36 rounded-full bg-primary-foreground/30" />
          </div>
          <motion.div
            className="h-9 w-9 rounded-full border border-primary-foreground/45"
            animate={reduceMotion ? {} : { scale: [0.95, 1.08, 0.95] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <svg className="mt-5 h-14 w-full" viewBox="0 0 360 64">
          <motion.path
            d="M0 38 H70 L83 38 L94 14 L109 56 L124 38 H220 L235 38 L248 26 L261 48 L276 38 H360"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={reduceMotion ? {} : { pathLength: [0.15, 1, 0.15] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </motion.div>

      <svg className="absolute inset-x-0 bottom-[18%] h-20 text-primary-foreground/85" viewBox="0 0 700 90" aria-hidden="true">
        <motion.path
          d="M0 58 H140 L160 58 L174 28 L194 76 L215 58 H390 L410 58 L426 42 L445 68 L466 58 H700"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={reduceMotion ? {} : { pathLength: [0.2, 1, 0.2], opacity: [0.45, 0.95, 0.45] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>

      <motion.div
        className="absolute inset-y-0 top-0 w-28 bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent"
        animate={reduceMotion ? {} : { x: ["-20%", "620%"], opacity: [0, 0.85, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      />
    </motion.div>
  );
}
