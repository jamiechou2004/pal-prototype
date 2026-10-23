import {
  restaurants,
  route,
  type Action,
  type Plan,
  type State,
} from "./script";
export type Decision = {
  id?: number;
  question: string;
  label: string;
  action: Action;
  draft?: Plan;
};
export function customDecision(_s: State, draft: Plan): Decision {
  const extra = draft.preferences?.trim();
  return {
    question: `Got it — ${draft.cuisine} at ${draft.time} for ${draft.party}, under ¥${draft.budget}${extra ? `, ${extra.replace(/[.!?]+$/, "")}` : ""}. Search now?`,
    label: "Yes, search",
    action: { type: "CUSTOMIZE", value: draft },
    draft,
  };
}
/** Scripted intent interpretation: every inferred action is reviewable before execution. */
export function inferDecision(s: State, text: string): Decision | undefined {
  const t = text.toLowerCase().trim();
  const vague =
    /^(ok(?:ay)?|sure(?:,? either works)?|either(?: works)?|yes|fine|sounds good|go ahead)[.!?]*$/.test(
      t,
    );
  const later = /\b(8(?::00)?|eight|later|a is fine|option a|first one)\b/.test(
    t,
  );
  const cheap = /cheap|value|便宜/.test(t);
  if (s.step === "exception") {
    if (later || vague)
      return {
        question: vague
          ? `Just to check — 8:00 PM at ${s.restaurant.name}?`
          : `Got it — 8:00 PM at ${s.restaurant.name}.${s.plan.ride ? ` Same route; your ride just leaves at ${route(s.restaurant, { ...s.plan, time: "8:00 PM" }).leave} instead.` : ""} Go ahead?`,
        label: vague ? "Yes" : "Yes, book 8:00 PM",
        action: { type: "CHOOSE_A" },
      };
    if (/another|different|second|\bb\b|\b7/.test(t))
      return {
        question: "Keep 7:00 PM and find another restaurant instead. Go ahead?",
        label: "Yes, find another",
        action: { type: "CHOOSE_B" },
      };
  }
  if (
    s.step === "restaurants" &&
    (cheap || vague || /first|second|third/.test(t))
  ) {
    const list = restaurants
      .slice(s.batch * 3, s.batch * 3 + 3)
      .filter((r) => r.price <= s.plan.budget);
    const r = cheap
      ? [...list].sort((a, b) => a.price - b.price)[0]
      : list[/third/.test(t) ? 2 : /second/.test(t) ? 1 : 0];
    if (r)
      return {
        question: `${r.name} is ¥${r.price} per person.${cheap ? " It is the lowest-priced option in this group." : ""} Choose it for ${s.plan.time}?`,
        label: "Yes, choose it",
        action: { type: "SELECT_RESTAURANT", value: r },
      };
  }
  if (
    s.step === "rideType" &&
    (cheap || vague || /first|economy|comfort|premium/.test(t))
  ) {
    const value = /premium/.test(t)
      ? 2
      : /comfort/.test(t)
        ? 1
        : cheap
          ? 0
          : s.carType;
    return {
      question: `Look for ${["Economy", "Comfort", "Premium"][value]} cars, around ¥${route(s.restaurant, s.plan).ranges[value]}?`,
      label: "Yes, find cars",
      action: { type: "CONFIRMED_CAR_TYPE", value },
    };
  }
  if (s.step === "cars" && (cheap || vague || /first|second/.test(t))) {
    const index = cheap || /second/.test(t) ? 1 : 0;
    return {
      question: `Book the ${index ? "silver" : "white"} sedan to ${s.restaurant.name}, estimated ¥${route(s.restaurant, s.plan).estimates[s.carType] - index}?`,
      label: "Yes, book this car",
      action: { type: "CALL_CAR", value: index },
    };
  }
  if (vague && ["booking", "updated"].includes(s.step))
    return {
      question: `Share your contact and book ${s.restaurant.name} for ${s.plan.party} at ${s.plan.time}?`,
      label: "Yes, book the table",
      action: { type: "BOOK" },
    };
  if (vague && s.step === "request")
    return {
      question: `Find ${s.plan.cuisine} dinner for ${s.plan.party} at ${s.plan.time}, under ¥${s.plan.budget}${s.plan.ride ? ", then arrange a ride" : ""}?`,
      label: "Yes, that’s right",
      action: { type: "APPROVE_REQUEST" },
    };
  if (vague && s.step === "permission")
    return {
      question:
        "Share your location with Dining Pal and Mobility Pal once, for this plan?",
      label: "Yes, allow once",
      action: { type: "PERMISSION", value: "once" },
    };
  if (
    later &&
    ["request", "restaurants", "booking", "updated"].includes(s.step) &&
    !s.booked
  )
    return customDecision(s, { ...s.plan, time: "8:00 PM" });
  if (vague && s.step === "complete")
    return {
      question: `Keep tonight's plan as shown?`,
      label: "Yes, keep it",
      action: { type: "ACK_PLAN" },
    };
  return undefined;
}
