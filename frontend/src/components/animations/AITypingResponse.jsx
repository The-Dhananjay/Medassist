import { useMemo } from "react";
import { motion } from "framer-motion";

export default function AITypingResponse({ children }) {
  const lines = useMemo(() => {
    const text = String(children || "");
    return text.split("\n").map((line, index) => ({ line, index }));
  }, [children]);

  return (
    <div className="space-y-2">
      {lines.map(({ line, index }) => (
        <motion.div
          key={`${index}-${line}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: Math.min(index * 0.08, 0.48), ease: "easeOut" }}
        >
          {line}
          {index === lines.length - 1 ? (
            <motion.span
              className="ml-1 inline-block h-4 w-0.5 translate-y-0.5 bg-primary"
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : null}
        </motion.div>
      ))}
    </div>
  );
}
