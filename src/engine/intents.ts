export type Intent =
  | "cancelAll"
  | "cancelTable"
  | "cancelRide"
  | "later"
  | "another"
  | "customize"
  | "unknown";
export function intent(text: string): Intent {
  const t = text.toLowerCase();
  if (
    /cancel.*(everything|both|all)|cancel (?:the )?(?:table (?:and|&) (?:the )?ride|ride (?:and|&) (?:the )?table)|全部取消|取消全部/.test(
      t,
    )
  )
    return "cancelAll";
  if (/cancel.*(ride|car|taxi)|取消.*(车|出行)/.test(t)) return "cancelRide";
  if (/cancel.*(table|dinner|reservation)|取消.*(餐|订位)/.test(t))
    return "cancelTable";
  // Cuisine/budget take precedence over the time embedded in a customized request.
  if (
    /cantonese|sichuan|hunan|budget|cheaper|closer|粤菜|川菜|便宜|预算/.test(t)
  )
    return "customize";
  if (/\b(8(:00)?|eight|later|fine)\b|八点|8点/.test(t)) return "later";
  if (
    /\b(7(:00)?|seven|another|different place|other restaurant)\b|七点|换一家/.test(
      t,
    )
  )
    return "another";
  return "unknown";
}
export function parsePlan(text: string) {
  const t = text.toLowerCase();
  const p: Record<string, any> = {};
  if (/cantonese|粤菜/.test(t)) p.cuisine = "Cantonese";
  else if (/sichuan|川菜/.test(t)) p.cuisine = "Sichuan";
  else if (/hunan|湘菜/.test(t)) p.cuisine = "Hunan";
  const time = t.match(/\b([6-9])(?::([03]0))?\s*(?:pm|p\.m\.|tonight|点)?\b/);
  if (time) p.time = `${time[1]}:${time[2] || "00"} PM`;
  const budget = t.match(/(?:under|budget|¥|￥)\s*(\d{2,4})/);
  if (budget) p.budget = Number(budget[1]);
  const party = t.match(/(?:for|party of)\s*(\d|two|three|four)/);
  if (party)
    p.party =
      ({ two: 2, three: 3, four: 4 } as any)[party[1]] || Number(party[1]);
  return p;
}
