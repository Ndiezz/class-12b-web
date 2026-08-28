import { motion } from "motion/react";
import { ReactNode } from "react";

export function FadeIn({ children, className = "", delay = 0, amount = 0.1 }: { children: ReactNode, className?: string, delay?: number, amount?: number | "some" | "all" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
