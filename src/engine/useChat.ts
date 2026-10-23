import { useEffect, useReducer } from "react";
import {
  initial,
  restaurants,
  route,
  type State,
  type Action,
  type Message,
  type CardKind,
  type Role,
  type Step,
} from "./script";
export function reducer(state: State, a: Action): State {
  if (a.type === "RESET") return initial(a.value);
  const s: State = {
    ...state,
    messages: [...state.messages],
    plan: { ...state.plan },
    tasks: { ...state.tasks },
    header: { ...state.header },
  };
  const msg = (kind: Message["kind"], text: string, role?: Role) =>
    s.messages.push({ id: s.seq++, kind, text, role });
  const card = (kind: CardKind, extra: Partial<Message> = {}) =>
    s.messages.push({
      id: s.seq++,
      kind: "card",
      card: kind,
      plan: { ...s.plan },
      restaurant: s.restaurant,
      version: s.version,
      batch: s.batch,
      carType: s.carType,
      carIndex: s.carIndex,
      ...extra,
    });
  const off = () => {
    s.header = { branch: "off", activity: "", role: s.header.role };
  };
  const work = (
    role: Role,
    activity: string,
    both = false,
    from: Role = s.header.role,
  ) => {
    s.header = {
      branch: "working",
      activity,
      role,
      both,
      from: from === role ? undefined : from,
    };
    s.tasks[role] = "Working";
    if (both) {
      s.tasks.dining = "Working";
      s.tasks.mobility = "Working";
    }
  };
  const done = (role: Role, activity: string) => {
    s.header = { branch: "done", activity, role };
    s.tasks[role] = "Done";
  };
  const wait = (step: Step, ms: number) => {
    s.step = step;
    s.pending = { id: s.seq++, ms };
  };
  const clear = () => {
    s.pending = undefined;
    s.thinking = "";
    s.tasks.main = "Done";
  };
  const booking = () => {
    s.step = "booking";
    s.version++;
    msg(
      "main",
      `To hold the table at ${s.restaurant.name}, the restaurant needs a contact. I've filled this in from your profile.`,
    );
    card("booking");
    s.tasks.dining = "Waiting for you";
    if (s.plan.ride) {
      work("mobility", "Mobility · Route & fare");
      msg("event", "Messaged", "mobility");
    }
  };
  const find = (batch: number) => {
    s.batch = batch;
    s.version++;
    work(
      "dining",
      s.plan.cuisine === "Cantonese"
        ? "Dining · Cantonese"
        : "Dining · Finding tables",
    );
    msg("event", "Messaged", "dining");
    wait("finding", 2200);
  };
  switch (a.type) {
    case "PAUSE":
      s.paused = !s.paused;
      return s;
    case "SEND_REQUEST":
      if (s.step !== "welcome") return state;
      msg("alex", a.value.text);
      Object.assign(s.plan, a.value.plan);
      s.thinking = "Reading your request…";
      s.tasks.main = "Working";
      wait("reading", 1600);
      break;
    case "EDIT_REQUEST":
      Object.assign(s.plan, a.value);
      s.version++;
      msg(
        "main",
        `Updated: ${s.plan.cuisine} dinner at ${s.plan.time}, for ${s.plan.party}, under ¥${s.plan.budget} per person. Does this look right?`,
      );
      s.step = "request";
      card("request");
      break;
    case "APPROVE_REQUEST":
      if (s.step !== "request") return state;
      msg("alex", "Looks good");
      msg(
        "main",
        "Got it, I'm on it. Dining Pal is finding restaurants first. Once you pick one, Mobility Pal will plan your ride.",
      );
      find(s.plan.cuisine === "Cantonese" ? 2 : 0);
      break;
    case "MORE":
      if (s.step !== "restaurants") return state;
      s.batch = s.plan.cuisine === "Cantonese" ? 2 : s.batch === 0 ? 1 : 0;
      work("dining", "Dining · Finding more");
      wait("finding", 1800);
      break;
    case "SELECT_RESTAURANT":
      if (s.step !== "restaurants") return state;
      s.restaurant = a.value;
      msg("alex", s.restaurant.name);
      s.thinking = s.plan.ride ? "Lining up your ride…" : "Checking the table…";
      wait("lining", 1400);
      break;
    case "PERMISSION":
      if (!["permission", "denied"].includes(s.step)) return state;
      if (a.value === "deny") {
        msg("alex", "Don't allow");
        msg(
          "main",
          "No problem. You can type your hotel name or pickup spot, or skip the ride for now.",
        );
        s.step = "denied";
        card("denied");
      } else {
        if (a.value === "skip") {
          s.plan.ride = false;
          msg("alex", "Skip the ride");
        } else {
          s.permission = true;
          if (a.value !== "allow") s.plan.pickup = a.value;
          msg("alex", a.value === "allow" ? "Allow" : `Use pickup: ${a.value}`);
        }
        booking();
      }
      break;
    case "BOOK":
      if (!["booking", "updated"].includes(s.step)) return state;
      msg(
        "alex",
        s.step === "updated"
          ? `Book table for ${s.plan.time}`
          : "Share & book table",
      );
      s.version++;
      msg("event", "Messaged", "dining");
      work(
        "dining",
        s.plan.ride ? "2 Pals working" : "Dining · Booking table",
        s.plan.ride,
      );
      wait("bookingWork", 3000);
      break;
    case "CHOOSE_A":
      if (s.step !== "exception") return state;
      msg("alex", a.value || "Take 8:00 PM");
      s.plan.time = "8:00 PM";
      s.exceptionResolved = true;
      s.version++;
      msg(
        "main",
        `Got it — 8:00 PM at ${s.restaurant.name}${s.plan.ride ? ", and I'll move your ride" : ""}. Nothing is booked yet.`,
      );
      msg("event", "Messaged · Dining & Mobility");
      work("dining", "Updating both to 8 PM", s.plan.ride);
      wait("updating", 2000);
      break;
    case "CHOOSE_B":
      if (s.step !== "exception") return state;
      msg("alex", a.value || "Keep 7:00 PM");
      s.exceptionResolved = true;
      msg(
        "main",
        "Got it — keep 7:00 PM at another restaurant. I'll refresh the route after you choose.",
      );
      find(1);
      break;
    case "CUSTOMIZE":
      if (!["exception", "restaurants", "request"].includes(s.step))
        return state;
      Object.assign(s.plan, a.value);
      s.exceptionResolved = true;
      msg(
        "alex",
        `Change to ${s.plan.cuisine}, ${s.plan.time}, under ¥${s.plan.budget}`,
      );
      msg(
        "main",
        `Got it — ${s.plan.cuisine} at ${s.plan.time}. I'll look for matching places; nothing is booked yet.`,
      );
      find(s.plan.cuisine === "Cantonese" ? 2 : 1);
      break;
    case "CONTACT":
      s.plan.contact = a.value;
      break;
    case "NOTE":
      s.plan.note = a.value;
      break;
    case "RIDE_TYPE":
      if (s.step !== "rideType") return state;
      s.carType = a.value;
      break;
    case "CONFIRM_TYPE":
      if (s.step !== "rideType") return state;
      msg(
        "alex",
        `${["Economy", "Comfort", "Premium"][s.carType]} · ¥${route(s.restaurant, s.plan).ranges[s.carType]}`,
      );
      msg("event", "Messaged", "mobility");
      s.version++;
      work("mobility", "Mobility · Finding cars");
      wait("findingCars", 2200);
      break;
    case "CALL_CAR":
      if (s.step !== "cars") return state;
      s.carIndex = a.value;
      msg("alex", "Book this car");
      msg("event", "Messaged", "mobility");
      s.version++;
      work("mobility", "Mobility · Calling car");
      wait("calling", 2500);
      break;
    case "CANCEL_PROMPT":
      if (s.cancelPrompt) return state;
      if (s.step === "welcome") {
        msg("main", "Nothing is planned or booked yet.");
        break;
      }
      s.cancelPrompt = a.value;
      s.resumeStep = s.step;
      s.resumePending = s.pending;
      s.pending = undefined;
      s.thinking = "";
      msg(
        "main",
        a.value === "ride"
          ? `I'll cancel only the ride. ${s.booked ? `Your table at ${s.restaurant.name} stays booked.` : "Dining can continue."} Cancel ride?`
          : "I can stop the dinner and ride plan. Please review both tasks before confirming.",
      );
      card("cancel", { cancel: a.value });
      break;
    case "KEEP":
      s.cancelPrompt = undefined;
      s.pending = s.resumePending
        ? { ...s.resumePending, id: s.seq++ }
        : undefined;
      s.resumePending = undefined;
      s.resumeStep = undefined;
      msg("main", "Kept your plan as it is.");
      break;
    case "CANCEL_CONFIRM":
      if (!s.cancelPrompt) return state;
      s.version++;
      msg("alex", s.cancelPrompt === "ride" ? "Cancel ride" : "Cancel both");
      work(
        "mobility",
        s.cancelPrompt === "ride" ? "Cancelling ride" : "Cancelling both",
        s.cancelPrompt === "all",
      );
      wait("cancelling", 1800);
      break;
    case "TEXT":
      msg("alex", a.value);
      msg(
        "main",
        s.step === "exception"
          ? "I can move dinner to 8:00 PM, find another 7:00 PM table, or change your preferences. Which would you like?"
          : "I'm following tonight's plan. Use the current card to confirm a booking, or ask me to cancel the ride or everything.",
      );
      break;
    case "TICK":
      if (!s.pending) return state;
      clear();
      switch (s.step) {
        case "reading":
          s.step = "request";
          msg(
            "main",
            "Hi Alex! Here's what I understood. Does this look right?",
          );
          card("request");
          break;
        case "finding":
          s.step = "restaurants";
          s.version++;
          done("dining", "Dining · Found 3 places");
          msg("event", "Message from", "dining");
          const matches = restaurants
            .slice(s.batch * 3, s.batch * 3 + 3)
            .filter(
              (r) =>
                r.price <= s.plan.budget &&
                !["Sichuan", "Hunan"].includes(s.plan.cuisine),
            );
          msg(
            "main",
            matches.length
              ? `Here are ${matches.length} ${s.plan.cuisine === "Cantonese" ? "Cantonese " : ""}places with a table at ${s.plan.time}, all under ¥${s.plan.budget} per person.`
              : `I don't have a matching ${s.plan.cuisine} place within ¥${s.plan.budget} in this demo. Please adjust your preferences.`,
          );
          card("carousel");
          s.pending = { id: s.seq++, ms: 1400 };
          break;
        case "lining":
          if (!s.plan.ride || s.permission) booking();
          else {
            s.step = "permission";
            msg(
              "main",
              "Great choice. To plan your ride, Mobility Pal needs your hotel address.",
            );
            card("permission");
          }
          break;
        case "bookingWork":
          if (
            s.flow === "exception" &&
            !s.exceptionResolved &&
            s.plan.time === "7:00 PM"
          ) {
            s.step = "exception";
            s.version++;
            s.header = {
              branch: "attention",
              activity: "Dining · 7:00 PM full",
              role: "dining",
            };
            s.tasks.dining = "Waiting for you";
            s.tasks.mobility = s.plan.ride ? "Waiting for you" : "Not started";
            msg("event", "Message from", "dining");
            msg(
              "main",
              `${s.restaurant.name} just ran out of tables at 7:00 PM. 8:00 PM is still open. I've paused your ride plan, so nothing changes until you decide.`,
            );
            card("change");
          } else {
            s.booked = true;
            done("dining", "Dining · Table booked");
            msg("event", "Message from", "dining");
            msg(
              "main",
              `You're booked! ${s.restaurant.name}, tonight at ${s.plan.time}, table for ${s.plan.party}.`,
            );
            card("bookingSuccess");
            wait("booked", 1600);
          }
          break;
        case "updating":
          s.step = "updated";
          done("dining", "Both Pals updated");
          s.tasks.mobility = s.plan.ride ? "Done" : "Not started";
          msg("event", "Message from · Dining & Mobility");
          msg(
            "main",
            `Here's your updated plan. Book the table for ${s.plan.time}?`,
          );
          card("updated");
          s.pending = { id: s.seq++, ms: 1400 };
          break;
        case "booked":
          off();
          if (s.plan.ride) {
            s.step = "rideType";
            s.tasks.mobility = "Waiting for you";
            s.header.role = "mobility";
            msg("event", "Message from", "mobility");
            msg(
              "main",
              "Your ride plan is ready. What kind of car would you like?",
            );
            card("rideType");
          } else {
            s.step = "complete";
            msg(
              "main",
              `You're all set: table at ${s.plan.time}. No ride has been called.`,
            );
          }
          break;
        case "findingCars":
          s.step = "cars";
          done("mobility", "Mobility · 2 cars found");
          msg(
            "main",
            "2 cars nearby in your range. Pick one and I'll call it.",
          );
          card("cars");
          s.pending = { id: s.seq++, ms: 1400 };
          break;
        case "calling":
          s.rideBooked = true;
          done("mobility", "Ride booked · 4 min away");
          msg("event", "Message from", "mobility");
          msg(
            "main",
            `Your driver is on the way. You'll arrive around ${route(s.restaurant, s.plan).arrive}.`,
          );
          card("rideSuccess");
          wait("rideBooked", 1600);
          break;
        case "rideBooked":
          s.step = "complete";
          off();
          msg(
            "main",
            `You're all set: table at ${s.plan.time}, driver here in 4 min. I'll ping you if anything changes.`,
          );
          break;
        case "cancelling": {
          const all = s.cancelPrompt === "all";
          const resume = s.resumeStep;
          const pending = s.resumePending;
          s.rideBooked = false;
          s.plan.ride = false;
          s.tasks.mobility = "Cancelled";
          if (all) {
            s.booked = false;
            s.tasks.dining =
              s.tasks.dining === "Not started" ? "Not started" : "Cancelled";
          }
          s.cancelResult = all
            ? "Dinner plan cancelled. Ride cancelled. No fee in this demo."
            : `Ride cancelled · no fee. ${s.booked ? "Your table stays booked." : "Dining continues."}`;
          msg("main", s.cancelResult);
          card("cancelResult", { result: s.cancelResult });
          s.cancelPrompt = undefined;
          s.resumeStep = undefined;
          s.resumePending = undefined;
          done("mobility", "Ride cancelled · no fee");
          s.tasks.mobility = "Cancelled";
          s.step = "complete";
          s.pending = { id: s.seq++, ms: 1400 };
          if (!all && !s.booked && resume) {
            s.step = resume;
            s.pending = pending ? { ...pending, id: s.seq++ } : undefined;
            off();
            s.header.role = "dining";
            if (resume === "request") card("request");
            if (resume === "booking") card("booking");
            if (resume === "restaurants") card("carousel");
            if (resume === "permission" || resume === "denied") booking();
            if (resume === "exception") {
              s.header = {
                branch: "attention",
                activity: "Dining · 7:00 PM full",
                role: "dining",
              };
              card("change");
            }
            if (resume === "updated") card("updated");
          }
          break;
        }
        default:
          off();
          break;
      }
      break;
    default:
      return state;
  }
  return s;
}
export function useChat(flow: "normal" | "exception") {
  const [state, dispatch] = useReducer(reducer, flow, initial);
  useEffect(() => {
    if (!state.pending || state.paused) return;
    const t = setTimeout(() => dispatch({ type: "TICK" }), state.pending.ms);
    return () => clearTimeout(t);
  }, [state.pending?.id, state.paused]);
  return { state, dispatch };
}
