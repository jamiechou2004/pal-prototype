import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
        width={state === "mini" ? 32 : 240}
        height={state === "mini" ? 32 : 240}
        style={{ transform: `scale(${size / (state === "mini" ? 32 : 240)})` }}
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
  const working = header.branch === "working" && header.role !== "main";
  const role = header.both ? "dining" : header.role;
  const state =
    header.branch === "done"
      ? "done"
      : header.branch === "attention"
        ? "attention"
        : "idle";
  return (
    <span
      className="handoff-pal"
      style={{ width: size, height: size }}
      aria-label={
        working ? `Main Pal briefing ${role} Pal` : `Main Pal ${state}`
      }
    >
      <Pal role="main" state={working ? "working" : state} size={size} />
      <AnimatePresence>
        {working && (
          <motion.span
            key={role}
            className="handoff-partner"
            initial={reduced ? false : { scale: 0.4, x: -8, y: -4, opacity: 0 }}
            animate={{ scale: 1, x: 0, y: 0, opacity: 1 }}
            exit={{ scale: 0.4, x: -8, y: -4, opacity: 0 }}
            transition={
              reduced
                ? { duration: 0 }
                : { type: "spring", stiffness: 300, damping: 26 }
            }
          >
            <Pal role={role} size={size * 0.47} state="working" />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
