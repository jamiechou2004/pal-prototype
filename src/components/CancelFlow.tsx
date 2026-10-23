import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { route, type Action, type State } from "../engine/script";
import { Pal } from "./Pal";
export function CancelFlow({
  s,
  dispatch,
}: {
  s: State;
  dispatch: React.Dispatch<Action>;
}) {
  const root = useRef<HTMLDivElement>(null);
  const send = (type: string, value?: string) => dispatch({ type, value });
  const confirm = s.cancelStage === "confirm";
  const table = !!s.cancelSelection?.table,
    ride = !!s.cancelSelection?.ride;
  const both = table && ride,
    count = Number(table) + Number(ride);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    root.current
      ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
      ?.focus();
    return () => previous?.focus();
  }, [confirm]);
  return (
    <div
      className={`overlay cancel-overlay ${confirm ? "confirm-overlay" : ""}`}
      ref={root}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          send(confirm ? "CANCEL_BACK" : "KEEP");
        }
        if (e.key === "Tab") {
          const buttons = Array.from(
            root.current!.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
          );
          const first = buttons[0],
            last = buttons.at(-1);
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <div
        className="scrim"
        onClick={() => send(confirm ? "CANCEL_BACK" : "KEEP")}
      />
      {confirm ? (
        <section
          className="cancel-alert"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="cancel-title"
          aria-describedby="cancel-description"
        >
          <div className="cancel-alert-copy">
            <h3 id="cancel-title">
              {both
                ? "Cancel table and ride?"
                : table
                  ? "Cancel the table?"
                  : "Cancel the ride?"}
            </h3>
            <p id="cancel-description">
              {both
                ? "Dining Pal will cancel your table and Mobility Pal will cancel your ride."
                : table
                  ? "Dining Pal will cancel your table."
                  : "Mobility Pal will cancel your ride."}{" "}
              This can't be undone.
            </p>
          </div>
          <button
            className="destructive"
            onClick={() => send("CANCEL_CONFIRM")}
          >
            {both ? "Cancel both" : table ? "Cancel table" : "Cancel ride"}
          </button>
          <button onClick={() => send("CANCEL_BACK")}>Go back</button>
        </section>
      ) : (
        <section
          className="cancel-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-title"
          aria-describedby="cancel-description"
        >
          <div className="grabber" />
          <div>
            <h3 id="cancel-title">What do you want to cancel?</h3>
            <p id="cancel-description">
              Pick one or both. Anything you don't pick stays as it is.
            </p>
          </div>
          <div className="cancel-choices">
            {!s.tableOutcome && (
              <button
                role="checkbox"
                aria-checked={table}
                onClick={() => send("CANCEL_TOGGLE", "table")}
              >
                <Pal role="dining" state="mini" size={24} />
                <span>
                  <strong>Table · {s.restaurant.name}</strong>
                  <small>
                    Tonight {s.plan.time} ·{" "}
                    {s.booked
                      ? "booked by Dining Pal"
                      : s.resumeStep === "bookingWork"
                        ? "booking in progress"
                        : "not booked yet"}
                  </small>
                </span>
                <i className={`cancel-check ${table ? "checked" : ""}`}>
                  {table && <Check size={16} />}
                </i>
              </button>
            )}
            {s.plan.ride && !s.rideOutcome && (
              <button
                role="checkbox"
                aria-checked={ride}
                onClick={() => send("CANCEL_TOGGLE", "ride")}
              >
                <Pal role="mobility" state="mini" size={24} />
                <span>
                  <strong>
                    Ride · {s.carIndex ? "Silver" : "White"} sedan
                  </strong>
                  <small>
                    Pickup {route(s.restaurant, s.plan).leave} ·{" "}
                    {s.rideBooked
                      ? "driver on the way"
                      : s.resumeStep === "calling"
                        ? "booking in progress"
                        : "not called yet"}
                  </small>
                </span>
                <i className={`cancel-check ${ride ? "checked" : ""}`}>
                  {ride && <Check size={16} />}
                </i>
              </button>
            )}
          </div>
          <div className="cancel-buttons">
            <button
              className="button primary"
              disabled={!count}
              onClick={() => send("CANCEL_CONTINUE")}
            >
              {count ? `Continue · ${count} selected` : "Continue"}
            </button>
            <button className="button secondary" onClick={() => send("KEEP")}>
              Keep my plan
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
