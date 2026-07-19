import { useEffect, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

export default function AnimatedNumber({ value, className = "" }) {
  const reduceMotion = useReducedMotion();
  const numericValue = Number(value);
  const isNumeric = Number.isFinite(numericValue);
  const motionValue = useMotionValue(reduceMotion || !isNumeric ? numericValue || 0 : 0);
  const springValue = useSpring(motionValue, { stiffness: 90, damping: 24 });
  const [display, setDisplay] = useState(isNumeric ? Math.round(motionValue.get()) : value);

  useEffect(() => {
    if (!isNumeric) {
      setDisplay(value);
      return undefined;
    }

    if (reduceMotion) {
      setDisplay(Math.round(numericValue));
      return undefined;
    }

    motionValue.set(numericValue);
    const unsubscribe = springValue.on("change", (latest) => {
      setDisplay(Math.round(latest));
    });
    return unsubscribe;
  }, [isNumeric, motionValue, numericValue, reduceMotion, springValue, value]);

  return <motion.div className={className}>{display}</motion.div>;
}
