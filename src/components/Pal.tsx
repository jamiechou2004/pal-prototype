import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import type { Header, Role } from "../engine/script";
export const asset = (name: string) => `${import.meta.env.BASE_URL}img/${name}`;
export function Pal({
  role = "main",
  state = "idle",
  size = 32,
}: {
  role?: Role;
  state?: string;
  size?: number;
}) {
  return (
    <span
      className="pal"
      style={{ width: size, height: size }}
      aria-label={`${role} Pal ${state}`}
    >
      <img
        alt=""
        width="240"
        height="240"
        style={{ transform: `scale(${size / 240})` }}
        src={`${import.meta.env.BASE_URL}pal/pal-a-${role}-${state}.svg`}
      />
    </span>
  );
}
export function HandoffPal({
  header,
  size = 32,
}: {
  header: Header;
  size?: number;
}) {
  const reduced = useReducedMotion();
  const [briefing, setBriefing] = useState(false);
  useEffect(() => {
    if (
      header.branch === "working" &&
      header.from &&
      header.from !== header.role
    ) {
      setBriefing(true);
      const t = setTimeout(() => setBriefing(false), 1100);
      return () => clearTimeout(t);
    }
    setBriefing(false);
  }, [header.role, header.branch, header.activity]);
  return (
    <span
      className="handoff-pal"
      style={{ width: size, height: size }}
      aria-label={
        briefing
          ? `${header.from} briefing ${header.role}`
          : `${header.role} is responsible`
      }
    >
      <AnimatePresence initial={false} mode="sync">
        {briefing ? (
          <motion.span
            key="sender"
            className="sender"
            initial={false}
            animate={{ scale: 0.85, x: -2 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, x: -9 }}
          >
            <Pal role={header.from || "main"} size={size} />
          </motion.span>
        ) : null}
        <motion.span
          className="recipient"
          key={header.role}
          initial={reduced ? false : { scale: 0.2, x: 8, y: 8, opacity: 0 }}
          animate={
            briefing
              ? { scale: 0.4, x: size * 0.47, y: size * 0.4, opacity: 1 }
              : { scale: 1, x: 0, y: 0, opacity: 1 }
          }
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 300, damping: 26 }
          }
        >
          <Pal
            role={header.role}
            state={
              header.branch === "working"
                ? "working"
                : header.branch === "done"
                  ? "done"
                  : header.branch === "attention"
                    ? "attention"
                    : "idle"
            }
            size={size}
          />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
