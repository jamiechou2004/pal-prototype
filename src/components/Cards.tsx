import { ownsCancel } from "../engine/bookingControls";
import { useRef, useState } from "react";
import {
  RotateCw,
  ChevronRight,
  Check,
  Star,
  BookA,
  CreditCard,
} from "lucide-react";
import {
  restaurants,
  rideNames,
  route,
  type Action,
  type Message,
  type State,
  type Restaurant,
} from "../engine/script";
import { TonightPlan } from "./TonightPlan";
import { asset } from "./Pal";
export type Sheet = { type: string; value?: any } | null;
export function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      className={`button ${secondary ? "secondary" : "primary"}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
export function Row({
  label,
  children,
  edit,
}: {
  label: string;
  children: React.ReactNode;
  edit?: () => void;
}) {
  return (
    <div className="detail-row">
      <span className="label">{label}</span>
      <span className="value">{children}</span>
      {edit && (
        <button className="chip" aria-label={`Edit ${label}`} onClick={edit}>
          Edit
        </button>
      )}
    </div>
  );
}
export function RouteMap({
  distance = "0.8",
  label,
}: {
  distance?: string;
  label?: string;
}) {
  return (
    <div className="route-map">
      <img
        className="map-base"
        src={asset("070fd.png")}
        alt="Shanghai street map"
      />
      <img
        className="map-route"
        src={asset("684f9.svg")}
        alt="Route to pickup"
      />
      <img className="map-car" src={asset("76ade.svg")} alt="Car position" />
      <img className="map-you" src={asset("19308.svg")} alt="Hotel pickup" />
      <span className="distance-chip">
        {label || `${distance} km away · 4 min`}
      </span>
    </div>
  );
}
const recommendations: Record<string, [string, string]> = {
  longtang: [
    "Best match",
    "Quiet tables for two and classic red-braised pork. Closest to what you asked for.",
  ],
  shikumen: [
    "Most atmosphere",
    "Dinner inside a 1920s lane house. A bit pricier and livelier — for the old-Shanghai feel.",
  ],
  lane18: [
    "Best value",
    "Home-style dishes at ~¥140 and the shortest ride. Casual and busy, less quiet.",
  ],
  planetree: [
    "Quietest",
    "Courtyard tables under plane trees. Smaller menu, calmest room of the three.",
  ],
  shanghaitable: [
    "Best for dumplings",
    "Known for soup dumplings and crab dishes. Quick service.",
  ],
  riverside: [
    "Best view",
    "Window tables over the river. The priciest and the longest ride.",
  ],
  pearl: [
    "Best match",
    "Classic dim sum — har gow, siu mai. English photo menu, 12 min away.",
  ],
  canton: [
    "Roast meats",
    "Famous for roast goose and char siu. Lively and a bit loud.",
  ],
  harbour: [
    "Seafood",
    "Steamed fish and seafood in a quieter room. The longest ride.",
  ],
};
function Carousel({
  s,
  m,
  active,
  dispatch,
  open,
}: {
  s: State;
  m: Message;
  active: boolean;
  dispatch: React.Dispatch<Action>;
  open: (sheet: Sheet) => void;
}) {
  const [page, setPage] = useState(0),
    track = useRef<HTMLDivElement>(null);
  const batch = m.batch || 0;
  const items = restaurants
    .slice(batch * 3, batch * 3 + 3)
    .filter(
      (r) =>
        r.price <= (m.plan?.budget || 200) &&
        !["Sichuan", "Hunan"].includes(m.plan?.cuisine || ""),
    );
  return (
    <div className={`carousel-wrap ${s.step === "finding" ? "loading" : ""}`}>
      <div
        className="carousel"
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setPage(
            Math.round(
              el.scrollLeft /
                ((el.firstElementChild as HTMLElement)?.offsetWidth + 12 ||
                  352),
            ),
          );
        }}
      >
        {items.map((r) => (
          <article className="restaurant-card" key={r.id}>
            <img
              className="restaurant-photo"
              src={asset(r.photo)}
              alt={`${r.name} signature dish`}
            />
            <span className="recommend-badge">{recommendations[r.id][0]}</span>
            <h3>
              {r.name} <span lang="zh">{r.cn}</span>
            </h3>
            <p className="muted">
              {batch === 2 ? "Cantonese" : "Shanghainese"} · ¥{r.price} / person
              · {r.distance} km
            </p>
            <div className="recommend-why">
              <img
                className="recommend-pal"
                width={18}
                height={18}
                src={asset("93f98.svg")}
                alt="Main Pal"
              />
              <div>
                <strong>Why Main Pal picked it</strong>
                <p title={recommendations[r.id][1]}>
                  {recommendations[r.id][1]}
                </p>
              </div>
            </div>
            <div className="tags">
              {r.englishMenu && (
                <span>
                  <BookA size={14} aria-hidden="true" />
                  English menu
                </span>
              )}
              {r.foreignCards && (
                <span>
                  <CreditCard size={14} aria-hidden="true" />
                  Foreign cards OK
                </span>
              )}
            </div>
            <div
              className={`trip-row ${m.version !== s.version && (s.exceptionResolved || s.step === "exception") ? "old-estimate" : ""}`}
            >
              <div>
                {r.minutes} min by car · {r.distance} km
                <small>
                  {s.step === "exception" ? "Outdated · " : ""}Est. ¥
                  {route(r, m.plan!).ranges[0]} from your hotel
                </small>
              </div>
              <button
                className="round"
                aria-label={`Map for ${r.name}`}
                onClick={() => open({ type: "map", value: r })}
              >
                <img width={20} height={20} src={asset("62660.svg")} alt="" />
              </button>
            </div>
            <div className="button-row">
              <Button
                secondary
                onClick={() => open({ type: "details", value: r })}
              >
                Details
              </Button>
              <Button
                disabled={!active}
                onClick={() =>
                  dispatch({ type: "SELECT_RESTAURANT", value: r })
                }
              >
                Choose
              </Button>
            </div>
          </article>
        ))}
      </div>
      {items.length === 0 && (
        <div className="card">
          <h3>No matching places</h3>
          <p>Try a budget of ¥150 or more, or change the cuisine.</p>
          <Button onClick={() => open({ type: "edit", value: "custom" })}>
            Adjust preferences
          </Button>
        </div>
      )}
      <div className="carousel-footer">
        <div className="dots">
          {items.map((r, i) => (
            <button
              key={r.id}
              aria-label={`Restaurant ${i + 1}`}
              aria-current={i === page ? "true" : undefined}
              className={i === page ? "active" : ""}
              onClick={() =>
                track.current?.scrollTo({
                  left:
                    i *
                    ((track.current.firstElementChild as HTMLElement)
                      .offsetWidth +
                      12),
                  behavior: "smooth",
                })
              }
            />
          ))}
        </div>
        <button
          className="chip"
          disabled={!active}
          onClick={() => dispatch({ type: "MORE" })}
        >
          <RotateCw size={13} />
          Show 3 others
        </button>
      </div>
    </div>
  );
}
export function Card({
  m,
  s,
  dispatch,
  open,
}: {
  m: Message;
  s: State;
  dispatch: React.Dispatch<Action>;
  open: (sheet: Sheet) => void;
}) {
  const active = m.version === s.version && !s.cancelPrompt && !s.decision;
  const p = m.plan!,
    r = m.restaurant!,
    rr = route(r, p);
  const send = (type: string, value?: any) => () => dispatch({ type, value });
  const live = ["booking", "rideType"].includes(m.card || "") && active;
  const plan = live ? s.plan : p;
  const cancel = (target: "table" | "ride") => {
    const available = ownsCancel(s, m, target);
    return available ? (
      <button
        className="booking-cancel"
        disabled={!!s.cancelPrompt}
        onClick={send("CANCEL_PROMPT", { target, fromCard: true })}
      >
        Cancel
      </button>
    ) : null;
  };
  if (m.card === "decision")
    return (
      <div
        className={`quick-replies ${s.decision?.id !== m.id ? "answered" : ""}`}
      >
        <Button
          disabled={s.decision?.id !== m.id}
          onClick={send("DECISION_YES", m.id)}
        >
          {m.decision?.label}
        </Button>
        <Button
          secondary
          disabled={s.decision?.id !== m.id}
          onClick={() => {
            dispatch({ type: "DECISION_NO", value: m.id });
            if (m.decision?.draft)
              open({ type: "edit", value: { prefill: m.decision.draft } });
          }}
        >
          No
        </Button>
      </div>
    );
  if (m.card === "clarify") {
    const enabled =
      s.clarifying &&
      s.messages.filter((x) => x.card === "clarify").at(-1)?.id === m.id;
    return (
      <div className={`quick-replies ${!enabled ? "answered" : ""}`}>
        <Button
          secondary
          disabled={!enabled || s.step !== "exception"}
          onClick={send("CHOOSE_B")}
        >
          Another place at 7
        </Button>
        <Button
          secondary
          disabled={!enabled || s.booked || s.rideBooked}
          onClick={() =>
            open({ type: "edit", value: { prefill: s.editDraft } })
          }
        >
          Customize…
        </Button>
      </div>
    );
  }
  if (m.card === "carousel")
    return <Carousel {...{ s, m, active, dispatch, open }} />;
  if (m.card === "request")
    return (
      <section className="card">
        <h3>Your request</h3>
        <Row
          label="When"
          edit={
            active ? () => open({ type: "edit", value: "request" }) : undefined
          }
        >
          Tonight, {p.time}
        </Row>
        <Row
          label="Party"
          edit={
            active ? () => open({ type: "edit", value: "request" }) : undefined
          }
        >
          {p.party} people
        </Row>
        <Row
          label="Cuisine"
          edit={
            active ? () => open({ type: "edit", value: "request" }) : undefined
          }
        >
          {p.cuisine}
        </Row>
        <Row
          label="Budget"
          edit={
            active ? () => open({ type: "edit", value: "request" }) : undefined
          }
        >
          Under ¥{p.budget} per person
        </Row>
        <Row
          label="Then"
          edit={
            active ? () => open({ type: "edit", value: "request" }) : undefined
          }
        >
          {p.ride ? "A ride from your hotel" : "Dinner only"}
        </Row>
        <div className="request-actions">
          <Button
            secondary
            disabled={!active}
            onClick={() => open({ type: "edit", value: "request" })}
          >
            Edit
          </Button>
          <Button
            disabled={!active || s.step !== "request"}
            onClick={send("APPROVE_REQUEST")}
          >
            Looks good
          </Button>
        </div>
      </section>
    );
  if (m.card === "permission")
    return (
      <section className="card">
        <h3>Share your location?</h3>
        <Row label="With">Dining Pal · Mobility Pal</Row>
        <Row label="What">Where you are now — or the hotel you type in</Row>
        <Row label="Used for">
          Nearby restaurants, travel time, fare, pickup point
        </Row>
        <Row label="Valid">Once, or until tonight's plan ends</Row>
        <Button
          disabled={s.step !== "permission"}
          onClick={send("PERMISSION", "tonight")}
        >
          Allow for tonight
        </Button>
        <Button
          secondary
          disabled={s.step !== "permission"}
          onClick={send("PERMISSION", "once")}
        >
          Allow once
        </Button>
        <button
          className="text-action"
          disabled={s.step !== "permission"}
          onClick={send("PERMISSION", "deny")}
        >
          Don't allow
        </button>
      </section>
    );
  if (m.card === "denied")
    return (
      <section className="card">
        <h3>You choose what to share</h3>
        <p>Dining can continue. Mobility waits for a pickup spot.</p>
        <Button
          disabled={!s.pickupNeeded}
          onClick={() => open({ type: "address" })}
        >
          Type hotel name
        </Button>
        <Button
          secondary
          disabled={!s.pickupNeeded}
          onClick={send("PERMISSION", "skip")}
        >
          Skip the ride
        </Button>
      </section>
    );
  if (m.card === "booking")
    return (
      <section className="card">
        <div className="booking-title">
          <h3>
            {s.tableOutcome && m.committed
              ? "Table cancelled"
              : `Book ${r.name}`}
          </h3>
          {cancel("table")}
        </div>
        <Row label="When">
          Tonight, {p.time} · {p.party} people
        </Row>
        <Row
          label="Contact"
          edit={active ? () => open({ type: "contact" }) : undefined}
        >
          {plan.contact.replace(/(?:\+?\d[\d ()-]{5,})(\d{4})$/, "••• $1")}
        </Row>
        <Row
          label="Note"
          edit={active ? () => open({ type: "note" }) : undefined}
        >
          {plan.note}
        </Row>
        <p className="footnote">
          Shared with {r.name} through Dining Pal, for this booking only
        </p>
        <Button
          disabled={!active || s.step !== "booking"}
          onClick={send("BOOK")}
        >
          Share &amp; book table
        </Button>
      </section>
    );
  if (m.card === "bookingSuccess")
    return (
      <section className={`card ${!s.booked ? "obsolete" : ""}`}>
        <div className="booking-title">
          <h3>{s.booked ? "Booking confirmed" : "Table cancelled"}</h3>
          {cancel("table")}
        </div>
        <Row label="Restaurant">
          {r.name} <span lang="zh">{r.cn}</span>
        </Row>
        <Row label="Address">{r.address}</Row>
        <Row label="Booking no.">PAL-2048</Row>

        <Button
          secondary
          disabled={!s.booked}
          onClick={() => open({ type: "staff", value: { r, p } })}
        >
          Show to staff
        </Button>
      </section>
    );
  if (m.card === "change")
    return (
      <section className="card">
        <span className="attention-tag">7:00 PM is full</span>
        <h3>What should I do instead?</h3>
        <p className="footnote">Nothing is booked or charged yet.</p>
        {p.ride && (
          <div className="outdated">
            <span>Outdated · previous ride estimate</span>
            <s>
              Leave {rr.leave} · ¥{rr.ranges[0]}
            </s>
          </div>
        )}
        <button
          className="choice"
          disabled={!active || s.step !== "exception"}
          onClick={send("CHOOSE_A")}
        >
          <span>
            <small>OPTION A</small>
            <strong>Take 8:00 PM</strong>
            <span>
              Same restaurant, same route — only your departure moves.
            </span>
          </span>
          <ChevronRight size={18} />
        </button>
        <button
          className="choice"
          disabled={!active || s.step !== "exception"}
          onClick={send("CHOOSE_B")}
        >
          <span>
            <small>OPTION B</small>
            <strong>Keep 7:00 PM</strong>
            <span>Find another Shanghainese place with a table</span>
          </span>
          <ChevronRight size={18} />
        </button>
        <div className="between">
          <span className="footnote">Or change time, budget or cuisine</span>
          <button
            className="chip"
            disabled={!active || s.step !== "exception"}
            onClick={() => open({ type: "edit", value: "custom" })}
          >
            Customize
          </button>
        </div>
      </section>
    );
  if (m.card === "updated")
    return (
      <section className="card">
        <div className="booking-title">
          <h3>
            {s.tableOutcome && m.committed ? "Table cancelled" : "Updated plan"}
          </h3>
          {cancel("table")}
        </div>
        <div className="soft-block">
          <small>Dinner · Dining Pal</small>
          <p>
            {r.name} · {p.party} people
          </p>
          <b className="green">Tonight, {p.time}</b>{" "}
          <s className="footnote">7:00 PM</s>
        </div>
        {p.ride && (
          <div className="soft-block">
            <small>Ride · Mobility Pal</small>
            <b className="green">Same route · leave {rr.leave}</b>{" "}
            <s className="footnote">
              {route(r, { ...p, time: "7:00 PM" }).leave}
            </s>
            <p>Fare refreshed when you pick a car</p>
          </div>
        )}
        <Button
          disabled={!active || s.step !== "updated"}
          onClick={send("BOOK")}
        >
          Book table for {p.time}
        </Button>
      </section>
    );
  if (m.card === "rideType")
    return (
      <section className="card">
        <div className="booking-title">
          <h3>
            {s.rideOutcome && m.committed
              ? "Ride cancelled"
              : `Ride to ${r.name}`}
          </h3>
          {cancel("ride")}
        </div>
        <p className="footnote">
          From your hotel · leave {rr.leave} · about {rr.minutes} min
        </p>
        <div role="radiogroup" aria-label="Car type" className="ride-options">
          {rideNames.map((name, i) => (
            <button
              className={`ride-option ${(live ? s.carType : m.carType) === i ? "selected" : ""}`}
              role="radio"
              aria-checked={(live ? s.carType : m.carType) === i}
              key={name}
              disabled={!active || s.step !== "rideType"}
              onClick={send("RIDE_TYPE", i)}
            >
              <i className="radio" />
              <img
                src={asset(["9dcde.png", "39a7e.png", "8f3d1.png"][i])}
                alt={name}
              />
              <span>
                <strong>{name}</strong>
                <small>
                  {
                    [
                      "4 seats · fastest pickup",
                      "Newer, roomier",
                      "Top-rated drivers",
                    ][i]
                  }
                </small>
              </span>
              <span>¥{rr.ranges[i]}</span>
            </button>
          ))}
        </div>
        <p className="footnote">
          Exact fare shows on each car before you book.
        </p>
        <Button
          disabled={!active || s.step !== "rideType"}
          onClick={send("CONFIRM_TYPE")}
        >
          Confirm {rideNames[live ? s.carType : m.carType || 0]} · ¥
          {rr.ranges[live ? s.carType : m.carType || 0]}
        </Button>
      </section>
    );
  if (m.card === "cars")
    return (
      <div className="car-offers">
        {[0, 1].map((i) => (
          <section className="card car-offer" key={i}>
            <div>
              <div className="booking-title">
                <h3>
                  {i ? "“Easy pickup, friendly driver”" : "“Quiet car, A/C on”"}
                </h3>
                {s.step === "calling" && s.carIndex === i
                  ? cancel("ride")
                  : null}
              </div>
              {i === 0 && <span className="success-tag">Best match</span>}
              <p className="footnote">
                {i ? "0.5 km · 3 min away" : "0.3 km · 2 min away"} ·{" "}
                {i ? "Silver" : "White"} sedan
              </p>
            </div>
            <img
              src={asset(i ? "39a7e.png" : "d99be.png")}
              alt={i ? "Silver sedan" : "White sedan"}
            />
            <div className="between">
              <span>
                {rideNames[m.carType || 0]} · est. ¥
                {rr.estimates[m.carType || 0] - i}
              </span>
              <Button
                disabled={!active || s.step !== "cars"}
                onClick={send("CALL_CAR", i)}
              >
                Book this car
              </Button>
            </div>
          </section>
        ))}
      </div>
    );
  if (m.card === "rideSuccess")
    return (
      <section className={`card ${!s.rideBooked ? "obsolete" : ""}`}>
        <div className="booking-title">
          <h3>
            {s.rideBooked ? "Driver arriving in 4 min" : "Ride cancelled"}
          </h3>
          {cancel("ride")}
        </div>
        <RouteMap distance={rr.distance} />
        <p className="footnote">
          Pickup at your hotel lobby · arrive ~{rr.arrive}
        </p>
        <div className="driver-block">
          <img
            className="driver-car"
            src={asset(m.carIndex ? "39a7e.png" : "d99be.png")}
            alt="Your car"
          />
          <div>
            <h2 lang="zh">{m.carIndex ? "沪A · F1932" : "沪A · D2817"}</h2>
            <small>{m.carIndex ? "Silver" : "White"} sedan</small>
            <small className="driver-name">
              <img src={asset("0ab6d.png")} alt="Driver Wang" />
              Driver Wang · <Star size={11} fill="currentColor" />
              4.9
            </small>
          </div>
        </div>
        <div className="button-row">
          <Button
            secondary
            disabled={!s.rideBooked}
            onClick={() => open({ type: "driver", value: { r, p } })}
          >
            Show driver
          </Button>
          <Button
            secondary
            onClick={() => open({ type: "translate", value: { r, p } })}
          >
            Translate
          </Button>
        </div>
      </section>
    );
  if (m.card === "tonight")
    return <TonightPlan m={m} s={s} dispatch={dispatch} />;
  return null;
}
