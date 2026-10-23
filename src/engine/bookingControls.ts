import type { State, Message, Role } from "./script";
export function canStopPlanning(s: State, role: Role) {
  if (s.cancelPrompt || s.tasks[role] !== "Working") return false;
  if (role === "dining")
    return (
      !s.booked && !s.tableOutcome && ["finding", "lining"].includes(s.step)
    );
  if (role === "mobility")
    return (
      s.plan.ride &&
      !s.rideBooked &&
      !s.rideOutcome &&
      ["booking", "bookingWork", "findingCars"].includes(s.step)
    );
  return false;
}
export function ownsCancel(s: State, m: Message, target: "table" | "ride") {
  if (
    target === "table" &&
    !s.booked &&
    s.step !== "bookingWork" &&
    !(s.step === "stopping" && s.stoppedDuringBooking?.table)
  )
    return false;
  if (target === "table" ? !!s.tableOutcome : !!s.rideOutcome || !s.plan.ride)
    return false;
  const latest = s.messages
    .filter(
      (x) =>
        x.restaurant?.id === s.restaurant.id &&
        (x.card === "tonight" ||
          (target === "table"
            ? x.card === "bookingSuccess" ||
              (["booking", "updated"].includes(x.card || "") && x.committed)
            : x.card === "rideSuccess" ||
              (["rideType", "cars"].includes(x.card || "") && x.committed))),
    )
    .at(-1);
  return latest?.id === m.id;
}
