import { LoaderCircle } from "lucide-react";
import { route, type Action, type Message, type State } from "../engine/script";
import { Pal } from "./Pal";
export function TonightPlan({
  m,
  s,
  dispatch,
}: {
  m: Message;
  s: State;
  dispatch: React.Dispatch<Action>;
}) {
  const p = m.plan!,
    r = m.restaurant!;
  const latest =
    s.messages.filter((x) => x.card === "tonight").at(-1)?.id === m.id;
  const car = `${m.carIndex ? "Silver" : "White"} sedan ${m.carIndex ? "沪A · F1932" : "沪A · D2817"}`;
  const tableCancelled = m.tableStatus?.includes("Cancelled");
  const rideCancelled = m.rideStatus?.includes("Cancelled");
  const stopped = m.rideStatus?.includes("nothing to cancel");
  const status = (text?: string) => (
    <span className={`plan-status ${text?.startsWith("—") ? "muted" : ""}`}>
      {text === "Cancelling…" && <LoaderCircle className="spin" size={13} />}
      {text}
    </span>
  );
  return (
    <section className="card tonight-plan">
      <div className="between">
        <h3>Tonight's plan</h3>
        <span
          className={`plan-tag ${m.planTag === "All confirmed" ? "confirmed" : ""}`}
        >
          {m.planTag}
        </span>
      </div>
      <div className="plan-task">
        <div className="plan-mini">
          <Pal role="dining" state="mini" size={20} />
        </div>
        <div>
          <strong>
            {tableCancelled ? "Table cancelled" : `Dinner · ${p.time}`}
          </strong>
          <p>
            {r.name} <span lang="zh">{r.cn}</span> ·{" "}
            {tableCancelled ? p.time : `${p.party} people`}
          </p>
          {status(m.tableStatus)}
        </div>
      </div>
      <div className="plan-divider" />
      <div className="plan-task">
        <div className="plan-mini">
          <Pal role="mobility" state="mini" size={20} />
        </div>
        <div>
          <strong>
            {rideCancelled
              ? "Ride cancelled"
              : stopped
                ? "Ride · not needed"
                : `Ride · pickup ${route(r, p).leave}`}
          </strong>
          <p>
            {rideCancelled
              ? car
              : stopped
                ? "Stopped before booking"
                : `Hotel lobby → ${r.name} · ${car}`}
          </p>
          {status(m.rideStatus)}
        </div>
      </div>
      {m.updateNote && <p className="plan-note">{m.updateNote}</p>}
      {(s.booked ||
        s.rideBooked ||
        (!s.tableOutcome && s.step !== "complete") ||
        (s.plan.ride && !s.rideOutcome)) && (
        <button
          className="plan-cancel"
          disabled={!!s.cancelPrompt || (!latest && s.step === "cancelling")}
          onClick={() => dispatch({ type: "CANCEL_PROMPT", value: "pick" })}
        >
          Cancel…
        </button>
      )}
    </section>
  );
}
