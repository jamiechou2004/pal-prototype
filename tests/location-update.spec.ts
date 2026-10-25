import { test, expect } from "@playwright/test";
import { reducer } from "../src/engine/useChat";
import { initial, restaurants, type State } from "../src/engine/script";
const act = (s: State, type: string, value?: any) =>
  reducer(s, { type, value });
function table(scope: string) {
  let s = initial("normal");
  for (const [type, value] of [
    ["SEND_REQUEST", { text: "Dinner and ride", plan: {} }],
    ["TICK"],
    ["APPROVE_REQUEST"],
    ["PERMISSION", scope],
    ["TICK"],
    ["SELECT_RESTAURANT", restaurants[0]],
    ["TICK"],
    ["BOOK"],
    ["TICK"],
    ["TICK"],
  ] as [string, any][])
    s = act(s, type, value);
  return s;
}
test("once requires pickup permission, denial waits, manual pickup resumes", () => {
  let s = table("once");
  expect(s.step).toBe("denied");
  expect(s.tasks.mobility).toBe("Not started");
  expect(s.messages.at(-1)?.text).toBe("pickup");
  s = act(s, "PERMISSION", "deny");
  expect(s.pending).toBeUndefined();
  expect(s.tasks.mobility).toBe("Not started");
  s = act(s, "PERMISSION", "Park Hotel");
  s = act(s, "TICK");
  expect(s.step).toBe("rideType");
  expect(s.plan.pickup).toBe("Park Hotel");
});
test("tonight does not ask again; pickup once resumes only once", () => {
  expect(table("tonight").step).toBe("rideType");
  let s = act(table("once"), "PERMISSION", "once");
  s = act(s, "TICK");
  expect(s.step).toBe("rideType");
  expect(act(s, "PERMISSION", "once")).toEqual(s);
});
test("compact permission expiry row and short reply geometry", async ({
  page: p,
}) => {
  await p.goto("?flow=normal&debug=1");
  await p.getByRole("textbox", { name: "Message Main Pal" }).click();
  await p.getByRole("button", { name: "Send message", exact: true }).click();
  await p.getByRole("button", { name: /Skip/i }).last().click();
  await p.getByRole("button", { name: "Looks good", exact: true }).click();
  const card = p.locator(".permission-card");
  await expect(card.getByText("Valid", { exact: true })).toHaveCount(0);
  await expect(card.getByText("Ends", { exact: true })).toBeVisible();
  await expect(
    card.getByText("Automatically after your ride", { exact: true }),
  ).toBeVisible();
  await expect(card.locator("p")).toHaveCount(0);
  await expect(card.locator(":scope > button")).toHaveCount(3);
  await expect(card.getByRole("button", { name: "Don't allow" })).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  const bubble = p.locator(".alex-bubble").last();
  const width = await bubble.evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeLessThan(180);
});
