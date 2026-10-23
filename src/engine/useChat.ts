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
    s.header = { branch: "off", activity: "", role: "main" };
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
    if (s.plan.ride && !s.pickupNeeded) {
      work("mobility", "Mobility · Route & fare");
      msg("event", "Messaged", "mobility");
    }
    msg(
      "main",
      `To hold the table at ${s.restaurant.name}, the restaurant needs a contact. I've filled this in from your profile.`,
    );
    card("booking");
    s.tasks.dining = "Waiting for you";
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
  const summary = (tag: string, tableStatus?: string, rideStatus?: string) =>
    card("tonight", {
      planTag: tag,
      updateNote: s.updateNote,
      tableStatus:
        tableStatus ||
        (s.tableOutcome === "cancelled"
          ? "✓ Cancelled by Dining Pal"
          : s.tableOutcome === "stopped"
            ? "— Not started"
            : s.booked
              ? tag === "All confirmed"
                ? "✓ Table booked"
                : "✓ Table kept"
              : "— Not started"),
      rideStatus:
        rideStatus ||
        (s.rideOutcome === "cancelled"
          ? "✓ Cancelled by Mobility Pal"
          : s.rideOutcome === "stopped" || !s.plan.ride
            ? "— Not started, nothing to cancel"
            : s.rideBooked
              ? "✓ Driver on the way"
              : "— Not started"),
    });
  const finishCancellation = () => {
    const { table, ride } = s.cancelSelection!;
    const hadTable = s.booked,
      hadRide = s.rideBooked;
    const resume = s.resumeStep,
      pending = s.resumePending;
    if (table) {
      s.tableOutcome = hadTable ? "cancelled" : "stopped";
      s.booked = false;
      s.tasks.dining = hadTable ? "Cancelled" : "Stopped";
      msg("event", hadTable ? "Message from" : "Stopped", "dining");
    }
    if (ride) {
      s.askAboutRide = false;
      s.rideOutcome = hadRide ? "cancelled" : "stopped";
      s.rideBooked = false;
      s.plan.ride = false;
      s.pickupNeeded = false;
      s.tasks.mobility = hadRide ? "Cancelled" : "Stopped";
      msg("event", hadRide ? "Message from" : "Stopped", "mobility");
    }
    s.header = {
      branch: "done",
      role: table ? "dining" : "mobility",
      both: table && ride,
      activity:
        table && ride
          ? "Plan cancelled"
          : ride
            ? hadRide
              ? "Ride cancelled"
              : "Mobility Pal · Stopped"
            : hadTable
              ? "Table cancelled"
              : "Dining Pal · Stopped",
    };
    msg(
      "main",
      table && ride
        ? hadTable && hadRide
          ? "Done — your table and your ride are both cancelled. Want me to find something else for tonight?"
          : "Done — dinner and ride planning have stopped. Any confirmed booking has been cancelled."
        : ride
          ? hadRide
            ? `Your ride is cancelled.${s.booked ? " Your table stays." : s.tableOutcome ? "" : " Dining can continue."}`
            : `Got it — no ride. The car was never called, so there's nothing to cancel. ${s.booked ? "Your table stays." : "Dining can continue."}`
          : hadTable
            ? "Your table is cancelled."
            : "Dining planning has stopped. No table was booked.",
    );
    s.cancelPrompt = undefined;
    s.cancelStage = undefined;
    s.cancelSelection = undefined;
    s.resumeStep = undefined;
    s.resumePending = undefined;
    s.step = "complete";
    if ((table && ride) || (ride && s.booked)) s.version++;
    if (ride && !table && !s.booked && resume && !s.tableOutcome) {
      s.step = resume;
      s.pending = pending ? { ...pending, id: s.seq++ } : undefined;
      s.tasks.dining = s.resumeDining || "Waiting for you";
      s.messages = s.messages.map((m) =>
        m.kind === "card" && m.version === s.version && m.plan
          ? { ...m, plan: { ...m.plan, ride: false } }
          : m,
      );
      if (resume === "denied") s.step = "complete";
    } else if (table && !ride && s.plan.ride) {
      s.askAboutRide = true;
      if (
        resume &&
        ["calling", "findingCars", "cars", "rideType", "rideBooked"].includes(
          resume,
        )
      ) {
        s.step = resume;
        s.pending = pending ? { ...pending, id: s.seq++ } : undefined;
      }
    }
    s.messages = s.messages.filter((m) => m.planTag !== "Updating");
    summary(!s.booked && !s.plan.ride ? "Cancelled" : "Updated");
    if (s.askAboutRide)
      msg(
        "main",
        `Your ride is still going to ${s.restaurant.name}. Cancel it too, or keep it?`,
      );
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
      s.version++;
      s.step = "permission";
      msg(
        "main",
        "One quick thing: to find places near you and plan your ride, Dining Pal and Mobility Pal need your location.",
      );
      card("permission");
      break;
    case "MORE":
      if (s.step !== "restaurants") return state;
      s.findingMore = true;
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
    case "PERMISSION": {
      if (s.step !== "permission" && !s.pickupNeeded) return state;
      const initialPermission = s.step === "permission";
      if (a.value === "deny") {
        msg("alex", "Don't allow");
        s.pickupNeeded = s.plan.ride;
        msg(
          "main",
          "No problem. I'll still find restaurants. For the ride, type your hotel name, or skip the ride for now.",
        );
        card("denied");
      } else if (a.value === "skip") {
        s.plan.ride = false;
        s.pickupNeeded = false;
        s.rideOutcome = "stopped";
        msg("alex", "Skip the ride");
      } else {
        s.permission = true;
        s.pickupNeeded = false;
        if (["allow", "once", "tonight"].includes(a.value)) {
          s.permissionScope = a.value === "once" ? "once" : "tonight";
          msg("alex", a.value === "once" ? "Allow once" : "Allow for tonight");
        } else {
          s.plan.pickup = a.value;
          msg("alex", `Use pickup: ${a.value}`);
        }
      }
      if (initialPermission) find(s.plan.cuisine === "Cantonese" ? 2 : 0);
      else if (s.step === "denied") {
        if (s.plan.ride) {
          work("mobility", "Mobility · Route & fare");
          msg("event", "Message to", "mobility");
          wait("booked", 1200);
        } else {
          s.step = "complete";
          msg(
            "main",
            "You're all set. Here's tonight's plan — I'll ping you if anything changes.",
          );
          summary("Updated");
        }
      }
      break;
    }
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
        s.plan.ride && !s.pickupNeeded
          ? "2 Pals working"
          : "Dining · Booking table",
        s.plan.ride && !s.pickupNeeded,
      );
      wait("bookingWork", 3000);
      break;
    case "CHOOSE_A":
      if (s.step !== "exception") return state;
      msg("alex", a.value || "Take 8:00 PM");
      s.plan.time = "8:00 PM";
      s.updateNote = "Plan updated from 7:00 PM to 8:00 PM";
      s.exceptionResolved = true;
      s.version++;
      msg(
        "main",
        `Got it — 8:00 PM at ${s.restaurant.name}${s.plan.ride && !s.pickupNeeded ? `, and I'll move your ride to ${route(s.restaurant, s.plan).leave}. Updating both Pals…` : ". Updating Dining Pal…"} Nothing is booked yet.`,
      );
      msg(
        "event",
        s.plan.ride && !s.pickupNeeded
          ? "Messaged · Dining & Mobility"
          : "Messaged",
        s.plan.ride && !s.pickupNeeded ? undefined : "dining",
      );
      work(
        "dining",
        s.plan.ride && !s.pickupNeeded
          ? "Updating both to 8 PM"
          : "Dining · Updating to 8 PM",
        s.plan.ride && !s.pickupNeeded,
      );
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
      s.updateNote = `Restaurant changed: ${s.exceptionRestaurant || s.restaurant.name} was full at 7:00 PM`;
      find(1);
      break;
    case "CUSTOMIZE":
      if (!["exception", "restaurants", "request"].includes(s.step))
        return state;
      Object.assign(s.plan, a.value);
      if (s.exceptionRestaurant)
        s.updateNote = `Changed to ${s.plan.cuisine} — ${s.exceptionRestaurant} was full at 7:00 PM`;
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
    case "CANCEL_PROMPT": {
      if (
        s.cancelPrompt ||
        s.step === "cancelling" ||
        s.step === "checkingCancel"
      )
        return state;
      const target =
        typeof a.value === "object" ? a.value.target : a.value || "pick";
      const text = typeof a.value === "object" ? a.value.text : undefined;
      if (text) msg("alex", text);
      const table =
        !s.tableOutcome &&
        (s.booked || !["welcome", "complete"].includes(s.step));
      const ride = !s.rideOutcome && s.plan.ride && s.step !== "welcome";
      if (!table && !ride) {
        msg("main", "Nothing is planned or booked that can be cancelled.");
        break;
      }
      s.cancelSelection = {
        table: table && (target === "table" || target === "all"),
        ride: ride && (target === "ride" || target === "all"),
      };
      s.cancelPrompt = target;
      s.resumeStep = s.step;
      s.resumeDining = s.tasks.dining;
      s.resumePending = s.pending;
      s.pending = undefined;
      s.thinking = "";
      const undo =
        (s.cancelSelection.table && (s.booked || s.step === "bookingWork")) ||
        (s.cancelSelection.ride && (s.rideBooked || s.step === "calling"));
      if (
        target !== "pick" &&
        !s.cancelSelection.table &&
        !s.cancelSelection.ride
      ) {
        s.cancelPrompt = undefined;
        s.pending = s.resumePending;
        msg("main", "That task is already stopped or cancelled.");
      } else if (target !== "pick" && !undo) {
        if (!text)
          msg(
            "alex",
            target === "all"
              ? "Stop dinner and ride planning"
              : `Stop ${target === "table" ? "dinner" : "ride"} planning`,
          );
        s.thinking = "Checking what can be cancelled…";
        wait("checkingCancel", 900);
      } else s.cancelStage = "pick";
      break;
    }
    case "CANCEL_TOGGLE":
      if (s.cancelStage !== "pick") return state;
      s.cancelSelection = {
        ...s.cancelSelection!,
        [a.value]: !s.cancelSelection?.[a.value as "table" | "ride"],
      };
      break;
    case "CANCEL_CONTINUE": {
      if (!s.cancelSelection?.table && !s.cancelSelection?.ride) return state;
      const undo =
        (s.cancelSelection.table &&
          (s.booked || s.resumeStep === "bookingWork")) ||
        (s.cancelSelection.ride &&
          (s.rideBooked || s.resumeStep === "calling"));
      if (undo) s.cancelStage = "confirm";
      else {
        s.cancelStage = undefined;
        msg(
          "alex",
          s.cancelSelection.table && s.cancelSelection.ride
            ? "Stop dinner and ride planning"
            : s.cancelSelection.table
              ? "Stop dinner planning"
              : "Stop ride planning",
        );
        s.thinking = "Checking what can be cancelled…";
        wait("checkingCancel", 900);
      }
      break;
    }
    case "CANCEL_BACK":
      s.cancelStage = "pick";
      break;
    case "KEEP":
      s.cancelPrompt = undefined;
      s.cancelStage = undefined;
      s.cancelSelection = undefined;
      s.pending = s.resumePending
        ? { ...s.resumePending, id: s.seq++ }
        : undefined;
      s.resumePending = undefined;
      s.resumeStep = undefined;
      break;
    case "KEEP_RIDE":
      s.askAboutRide = false;
      msg("alex", "Keep the ride");
      msg("main", `Your ride to ${s.restaurant.name} is kept.`);
      break;
    case "CANCEL_CONFIRM": {
      if (!s.cancelPrompt || s.cancelStage !== "confirm") return state;
      const { table, ride } = s.cancelSelection!;
      s.cancelStage = undefined;
      s.askAboutRide = false;
      msg(
        "alex",
        table && ride
          ? "Cancel table & ride"
          : table
            ? "Cancel table"
            : "Cancel ride",
      );
      msg(
        "event",
        table && ride ? "Message to · Dining & Mobility" : "Message to",
        table && ride ? undefined : table ? "dining" : "mobility",
      );
      work(
        table ? "dining" : "mobility",
        table && ride
          ? "Cancelling table · ride"
          : table
            ? "Cancelling table"
            : "Cancelling ride",
        table && ride,
      );
      s.cancelWaitForBooking =
        (table && s.resumeStep === "bookingWork") ||
        (ride && s.resumeStep === "calling");
      msg(
        "main",
        table && ride
          ? "Cancelling your table and your ride now…"
          : table
            ? "Cancelling your table now…"
            : "Cancelling your ride now…",
      );
      if (s.cancelWaitForBooking)
        msg(
          "main",
          "That Pal is finishing the booking request. I'll wait for its answer, then cancel any booking that comes back.",
        );
      summary(
        "Updating",
        table ? "Cancelling…" : undefined,
        ride ? "Cancelling…" : undefined,
      );
      wait(
        "cancelling",
        s.cancelWaitForBooking ? s.resumePending?.ms || 2500 : 1800,
      );
      break;
    }
    case "TRANSLATION_REPLY":
      msg("main", `Driver reply: “${a.value.source}”\n${a.value.translation}`);
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
          done(
            "dining",
            s.findingMore
              ? "Dining · 3 more places"
              : "Dining · Found 3 places",
          );
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
              ? `${matches.length} places have a table at ${s.plan.time}, all under ¥${s.plan.budget}. ${s.batch === 0 ? "Longtang is the classic pick, Shikumen has the most atmosphere, Lane 18 is the best value." : s.batch === 1 ? "Plane Tree is the quietest, Shanghai Table is best for dumplings, Riverside has the best view." : "Pearl is the dim sum pick, Canton House offers roast meats, Harbour is the seafood choice."}`
              : `I don't have a matching ${s.plan.cuisine} place within ¥${s.plan.budget}. Please adjust your preferences.`,
          );
          s.findingMore = false;
          card("carousel");
          s.pending = { id: s.seq++, ms: 1400 };
          break;
        case "lining":
          booking();
          break;
        case "bookingWork":
          if (
            s.flow === "exception" &&
            !s.exceptionResolved &&
            s.plan.time === "7:00 PM"
          ) {
            s.step = "exception";
            s.exceptionRestaurant = s.restaurant.name;
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
            wait("booked", 1400);
          }
          break;
        case "updating":
          s.step = "updated";
          done(
            "dining",
            s.plan.ride && !s.pickupNeeded
              ? "Both Pals updated"
              : "Dining · Plan updated",
          );
          s.tasks.mobility =
            s.plan.ride && !s.pickupNeeded ? "Done" : "Not started";
          msg(
            "event",
            s.plan.ride && !s.pickupNeeded
              ? "Message from · Dining & Mobility"
              : "Message from",
            s.plan.ride && !s.pickupNeeded ? undefined : "dining",
          );
          msg(
            "main",
            `Here's your updated plan. Book the table for ${s.plan.time}?`,
          );
          card("updated");
          s.pending = { id: s.seq++, ms: 1400 };
          break;
        case "booked":
          off();
          if (s.plan.ride && s.pickupNeeded) {
            s.step = "denied";
            msg(
              "main",
              "Your table is booked. Type your hotel name for the ride, or skip the ride for now.",
            );
            card("denied");
          } else if (s.plan.ride) {
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
              "You're all set. Here's tonight's plan — I'll ping you if anything changes.",
            );
            summary(s.tableOutcome ? "Updated" : "All confirmed");
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
          wait("rideBooked", 1400);
          break;
        case "rideBooked":
          s.step = "complete";
          off();
          msg(
            "main",
            "You're all set. Here's tonight's plan — I'll ping you if anything changes.",
          );
          summary(s.tableOutcome ? "Updated" : "All confirmed");
          break;
        case "checkingCancel":
        case "cancelling": {
          // A booking in flight resolves before its cancellation request is sent.
          if (s.cancelWaitForBooking) {
            const selected = s.cancelSelection!;
            if (selected.table && s.resumeStep === "bookingWork")
              s.booked = !(
                s.flow === "exception" &&
                !s.exceptionResolved &&
                s.plan.time === "7:00 PM"
              );
            if (selected.ride && s.resumeStep === "calling")
              s.rideBooked = true;
            s.cancelWaitForBooking = false;
            wait("cancelling", 1600);
            break;
          }
          finishCancellation();
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
