import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Minus, Plus, X } from "lucide-react";
import { TranslateSheet } from "./TranslateSheet";
import { Pal, asset } from "./Pal";
import { Button, Row, RouteMap, type Sheet } from "./Cards";
import {
  type State,
  type Action,
  type Plan,
  type Role,
} from "../engine/script";
export function Sheets({
  sheet,
  close,
  s,
  dispatch,
}: {
  sheet: NonNullable<Sheet>;
  close: () => void;
  s: State;
  dispatch: React.Dispatch<Action>;
}) {
  const [draft, setDraft] = useState<Plan>({
    ...s.plan,
    ...(sheet.type === "edit" ? sheet.value?.prefill : {}),
  });
  const [value, setValue] = useState(
    sheet.type === "address"
      ? ""
      : sheet.type === "contact"
        ? s.plan.contact
        : sheet.type === "note"
          ? s.plan.note
          : "",
  );
  const root = useRef<HTMLDivElement>(null),
    previous = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previous.current = document.activeElement as HTMLElement;
    const t = setTimeout(
      () =>
        root.current
          ?.querySelector<HTMLElement>("button,input,textarea")
          ?.focus(),
      50,
    );
    return () => {
      clearTimeout(t);
      previous.current?.focus();
    };
  }, []);
  const name =
    sheet.type === "edit"
      ? "Edit request"
      : sheet.type === "who"
        ? "Who's working on tonight"
        : sheet.type === "address"
          ? "Enter pickup address"
          : sheet.type === "contact"
            ? "Edit contact"
            : sheet.type === "note"
              ? "Edit note"
              : sheet.type === "staff"
                ? "Show to staff"
                : sheet.type === "driver"
                  ? "Your driver"
                  : sheet.type === "translate"
                    ? "Show this to your driver"
                    : sheet.type === "actions"
                      ? "Tonight’s plan"
                      : sheet.type === "new"
                        ? "Set up a new Pal"
                        : sheet.value?.name || "Route preview";
  const submit = () => {
    if (sheet.type === "edit") {
      dispatch({
        type: sheet.value === "request" ? "EDIT_REQUEST" : "CUSTOMIZE",
        value: draft,
      });
    } else
      dispatch({
        type:
          sheet.type === "address"
            ? "PERMISSION"
            : sheet.type === "contact"
              ? "CONTACT"
              : "NOTE",
        value: value.trim(),
      });
    close();
  };
  const changed = JSON.stringify(draft) !== JSON.stringify(s.plan);
  const r = sheet.value?.r || sheet.value || s.restaurant,
    p = sheet.value?.p || s.plan;
  if (sheet.type === "translate")
    return <TranslateSheet restaurant={r} close={close} dispatch={dispatch} />;
  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        className="scrim"
        tabIndex={-1}
        aria-label="Dismiss sheet"
        onClick={close}
      />
      <motion.div
        ref={root}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={name}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.25 }}
        onDragEnd={(_, i) => {
          if (i.offset.y > 90) close();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
          if (e.key === "Tab") {
            const els = root.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled),input,textarea,select,[tabindex="0"]',
            );
            if (!els?.length) return;
            const first = els[0],
              last = els[els.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <div className="grabber" />
        <div className="sheet-title">
          <button className="chip" onClick={close}>
            {sheet.type === "edit" ? "Cancel" : <X size={17} />}
          </button>
          <h3>{name}</h3>
          <span />
        </div>
        <div className="sheet-content">
          {sheet.type === "edit" && (
            <>
              <div className="between">
                <span>When</span>
                <span className="muted">Tonight, {draft.time}</span>
              </div>
              <div className="chips">
                {["6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM"].map((time) => (
                  <button
                    className={`chip ${draft.time === time ? "selected" : ""}`}
                    key={time}
                    onClick={() => setDraft({ ...draft, time })}
                  >
                    {time}
                  </button>
                ))}
                <label className="chip other-time">
                  Other…
                  <input
                    aria-label="Other dinner time"
                    type="time"
                    onChange={(e) => {
                      if (e.target.value) {
                        const [h, m] = e.target.value.split(":");
                        setDraft({
                          ...draft,
                          time: `${Number(h) % 12 || 12}:${m} ${Number(h) >= 12 ? "PM" : "AM"}`,
                        });
                      }
                    }}
                  />
                </label>
              </div>
              <div className="edit-row">
                <span>Party</span>
                <div className="stepper">
                  <button
                    aria-label="Fewer guests"
                    disabled={draft.party <= 1}
                    onClick={() =>
                      setDraft({ ...draft, party: draft.party - 1 })
                    }
                  >
                    <Minus size={17} />
                  </button>
                  <b>{draft.party}</b>
                  <button
                    aria-label="More guests"
                    disabled={draft.party >= 8}
                    onClick={() =>
                      setDraft({ ...draft, party: draft.party + 1 })
                    }
                  >
                    <Plus size={17} />
                  </button>
                </div>
              </div>
              <div className="edit-row">
                <label htmlFor="cuisine">Cuisine</label>
                <select
                  id="cuisine"
                  value={draft.cuisine}
                  onChange={(e) =>
                    setDraft({ ...draft, cuisine: e.target.value })
                  }
                >
                  {["Shanghainese", "Cantonese", "Sichuan", "Hunan", "Any"].map(
                    (c) => (
                      <option key={c}>{c}</option>
                    ),
                  )}
                </select>
              </div>
              <div className="edit-row">
                <label htmlFor="budget">Budget / person</label>
                <span>
                  ¥{" "}
                  <input
                    id="budget"
                    type="number"
                    min="50"
                    max="1000"
                    step="10"
                    value={draft.budget}
                    onChange={(e) =>
                      setDraft({ ...draft, budget: Number(e.target.value) })
                    }
                  />
                </span>
              </div>
              <div className="edit-row">
                <div>
                  Ride from my hotel
                  <small>Mobility Pal plans after booking</small>
                </div>
                <button
                  role="switch"
                  aria-checked={draft.ride}
                  aria-label="Ride from my hotel"
                  className={`switch ${draft.ride ? "on" : ""}`}
                  onClick={() => setDraft({ ...draft, ride: !draft.ride })}
                >
                  <span />
                </button>
              </div>
              <Button disabled={!changed || draft.budget < 50} onClick={submit}>
                {sheet.value === "request"
                  ? `Update request · ${draft.time}`
                  : `Update · ${draft.cuisine} at ${draft.time}`}
              </Button>
            </>
          )}
          {sheet.type === "who" && (
            <>
              <p className="footnote">
                One conversation. The right Pal for each task.
              </p>
              {(["main", "dining", "mobility"] as Role[]).map((role) => (
                <div
                  className={`pal-row ${s.tasks[role] === "Not started" ? "not-started" : ""}`}
                  key={role}
                >
                  <span
                    className={`pal-status ${s.tasks[role] === "Working" ? "running" : ""}`}
                  >
                    <Pal
                      role={role}
                      size={44}
                      state={
                        s.tasks[role] === "Done"
                          ? "done"
                          : s.tasks[role] === "Working"
                            ? "working"
                            : "idle"
                      }
                    />
                    {s.tasks[role] === "Done" && (
                      <i>
                        <Check size={10} />
                      </i>
                    )}
                  </span>
                  <div>
                    <strong>
                      {role === "main"
                        ? "Main"
                        : role === "dining"
                          ? "Dining"
                          : "Mobility"}{" "}
                      Pal
                    </strong>
                    <p>
                      {s.tasks[role]}
                      {role === "dining" && s.booked
                        ? ` · ${s.restaurant.name}`
                        : role === "mobility" && s.rideBooked
                          ? " · Driver arriving in 4 min"
                          : ""}
                    </p>
                  </div>
                </div>
              ))}
              <p className="footnote">
                During handoff, the sender is large and the receiver is small.
                Once it takes over, the receiver becomes the main character.
              </p>
            </>
          )}
          {["address", "contact", "note"].includes(sheet.type) && (
            <>
              <p className="footnote">
                {sheet.type === "address"
                  ? "Shared with Mobility Pal for tonight’s pickup only. No live location access."
                  : "Only shared for this dinner reservation."}
              </p>
              <textarea
                className="sheet-input"
                aria-label={name}
                placeholder={
                  sheet.type === "address" ? "Hotel name or pickup address" : ""
                }
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <Button disabled={!value.trim()} onClick={submit}>
                {sheet.type === "address"
                  ? "Use this pickup address"
                  : "Save changes"}
              </Button>
            </>
          )}
          {sheet.type === "details" && (
            <>
              <img
                className="details-photo"
                src={asset(r.photo)}
                alt={`${r.name} food`}
              />
              <h2>
                {r.name} <span lang="zh">{r.cn}</span>
              </h2>
              <Row label="Cuisine">
                {r.id === "pearl" || r.id === "canton" || r.id === "harbour"
                  ? "Cantonese"
                  : "Shanghainese"}
              </Row>
              <Row label="Budget">~¥{r.price} / person</Row>
              <Row label="Address">{r.address}</Row>
              <p className="footnote">
                English menu · Foreign cards OK. Restaurant data and addresses
                are illustrative demo content.
              </p>
              <Button secondary onClick={close}>
                Back to choices
              </Button>
            </>
          )}
          {sheet.type === "map" && (
            <>
              <RouteMap label={`${r.minutes} min · ${r.distance} km`} />
              <h3>
                {r.name} · {r.cn}
              </h3>
              <p>
                {s.plan.pickup} → {r.address}
              </p>
              <p className="footnote">
                Illustrative route preview. No live navigation.
              </p>
            </>
          )}
          {sheet.type === "staff" && (
            <>
              <span className="success-tag">Reservation · PAL-2048</span>
              <h2 lang="zh">
                我预订了今晚 {p.time} 的 {p.party} 人桌。
              </h2>
              <p>
                I have a reservation for {p.party} tonight at {p.time}.
              </p>
              <h3>
                {r.name} · {r.cn}
              </h3>
              <p>{r.address}</p>
              <p className="footnote">Demo confirmation only.</p>
            </>
          )}
          {sheet.type === "driver" && (
            <>
              <div className="driver-profile">
                <img src={asset("0ab6d.png")} alt="Driver Wang" />
                <h2>Driver Wang</h2>
                <p>★ 4.9 · {s.carIndex ? "沪A · F1932" : "沪A · D2817"}</p>
              </div>
              <p>Meet at the hotel lobby in 4 min.</p>
              <Row label="Destination">
                {r.name} · {r.cn}
              </Row>
              <p className="footnote">
                Demo driver details. No real car has been called.
              </p>
            </>
          )}
          {sheet.type === "actions" && (
            <>
              <Button
                secondary
                onClick={() => {
                  dispatch({ type: "CANCEL_PROMPT", value: "ride" });
                  close();
                }}
              >
                Cancel the ride
              </Button>
              <Button
                secondary
                onClick={() => {
                  dispatch({ type: "CANCEL_PROMPT", value: "all" });
                  close();
                }}
              >
                Cancel everything
              </Button>
              <p className="footnote">
                You'll review the consequences before anything is cancelled.
              </p>
            </>
          )}
          {sheet.type === "new" && (
            <>
              <p>A Pal for translation, sightseeing, or your next idea.</p>
              <p className="footnote">
                This prototype focuses on Dining and Mobility. Creating
                additional Pals is not connected.
              </p>
              <Button onClick={close}>Got it</Button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
