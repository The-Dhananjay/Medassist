import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";

export default function FloatingHero({ children, className = "" }) {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  const smoothX = useSpring(pointerX, { stiffness: 120, damping: 22, mass: 0.4 });
  const smoothY = useSpring(pointerY, { stiffness: 120, damping: 22, mass: 0.4 });

  const rotateY = useTransform(smoothX, [-0.5, 0.5], reduceMotion ? [0, 0] : [-4, 4]);
  const rotateX = useTransform(smoothY, [-0.5, 0.5], reduceMotion ? [0, 0] : [4, -4]);

  const handleMouseMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  };

  const handleMouseLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <motion.div
      className={`absolute inset-0 isolate ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: 1100 }}
    >
      <motion.div
        className="absolute inset-0"
        animate={reduceMotion ? {} : { y: [0, -6, 0] }}
        transition={{ duration: 7.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        <motion.div
          className="absolute left-1/2 top-1/2 -z-10 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/18 blur-3xl"
          animate={reduceMotion ? {} : { opacity: [0.16, 0.24, 0.16], scale: [0.98, 1.04, 0.98] }}
          transition={{ duration: 7.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 z-10" style={{ transform: "translateZ(18px)" }}>
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
