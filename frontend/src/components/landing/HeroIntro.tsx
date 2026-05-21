"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const CONTAINER: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const ITEM: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.23, 1, 0.32, 1] },
  },
};

type Props = {
  children: ReactNode;
  className?: string;
};

export function HeroIntro({ children, className = "" }: Props) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={CONTAINER}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function HeroIntroItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={ITEM} className={className}>
      {children}
    </motion.div>
  );
}
