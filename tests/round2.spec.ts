import { test, expect, type Page } from "@playwright/test";
import { reducer } from "../src/engine/useChat";
import {
  initial,
  restaurants,
  type State,
  type Action,
} from "../src/engine/script";
const act = (s: State, type: string, value?: Action["value"]) =>
  reducer(s, { type, value });
function ready(ride = true) {
  let s = initial("normal");
  for (const [type, value] of [
    ["SEND_REQUEST", { text: "Dinner and ride", plan: {} }],
    ["TICK"],
    ["APPROVE_REQUEST"],
    ["PERMISSION", "tonight"],
    ["TICK"],
    ["SELECT_RESTAURANT", restaurants[0]],
    ["TICK"],
    ["BOOK"],
    ["TICK"],
    ["TICK"],
  ] as [string, any][])
    s = act(s, type, value);
  if (ride)
    for (const [type, value] of [
      ["CONFIRM_TYPE"],
      ["TICK"],
      ["CALL_CAR", 0],
      ["TICK"],
      ["TICK"],
    ] as [string, any][])
      s = act(s, type, value);
  return s;
}
test("early permission and denial never dispatch Mobility without a pickup", () => {
  let s = act(
    act(initial("normal"), "SEND_REQUEST", { text: "Dinner", plan: {} }),
    "TICK",
  );
  s = act(s, "APPROVE_REQUEST");
  expect(s.step).toBe("permission");
  expect(s.tasks.dining).toBe("Not started");
  s = act(s, "PERMISSION", "deny");
  expect(s.tasks.dining).toBe("Working");
  expect(s.tasks.mobility).toBe("Not started");
  s = act(s, "TICK");
  s = act(s, "SELECT_RESTAURANT", restaurants[0]);
  s = act(s, "TICK");
  s = act(s, "BOOK");
  expect(s.tasks.mobility).toBe("Not started");
  s = act(act(s, "TICK"), "TICK");
  expect(s.step).toBe("denied");
  s = act(s, "PERMISSION", "Park Hotel");
  s = act(s, "TICK");
  expect(s.step).toBe("rideType");
  expect(s.plan.pickup).toBe("Park Hotel");
});
test("stop planned ride without a confirmation and preserve table", () => {
  let s = ready(false);
  expect(s.step).toBe("rideType");
  s = act(s, "CANCEL_PROMPT", {
    target: "ride",
    text: "Actually I'll walk. Cancel the ride, keep the table.",
  });
  expect(s.cancelStage).toBeUndefined();
  expect(s.thinking).toBe("Checking what can be cancelled…");
  s = act(s, "TICK");
  expect(s.booked).toBe(true);
  expect(s.rideOutcome).toBe("stopped");
  expect(s.messages.at(-1)?.rideStatus).toBe(
    "— Not started, nothing to cancel",
  );
});
test("cancel scope, back, keep, and per-Pal final reports", () => {
  let s = ready();
  s = act(s, "CANCEL_PROMPT", "pick");
  expect(s.cancelSelection).toEqual({ table: false, ride: false });
  s = act(s, "CANCEL_CONTINUE");
  expect(s.cancelStage).toBe("pick");
  s = act(s, "CANCEL_TOGGLE", "table");
  s = act(s, "CANCEL_TOGGLE", "ride");
  s = act(s, "CANCEL_CONTINUE");
  s = act(s, "CANCEL_BACK");
  expect(s.cancelSelection).toEqual({ table: true, ride: true });
  s = act(s, "CANCEL_CONTINUE");
  s = act(s, "CANCEL_CONFIRM");
  s = act(s, "TICK");
  expect(s.booked).toBe(false);
  expect(s.rideBooked).toBe(false);
  expect(s.messages.at(-1)).toMatchObject({
    planTag: "Cancelled",
    tableStatus: "✓ Cancelled by Dining Pal",
    rideStatus: "✓ Cancelled by Mobility Pal",
  });
  expect(s.messages.slice(-4, -2).map((m) => m.role)).toEqual([
    "dining",
    "mobility",
  ]);
});
test("table-only cancellation asks about active ride and allows keeping it", () => {
  let s = ready();
  s = act(s, "CANCEL_PROMPT", "table");
  s = act(s, "CANCEL_CONTINUE");
  s = act(s, "CANCEL_CONFIRM");
  s = act(s, "TICK");
  expect(s.askAboutRide).toBe(true);
  expect(s.rideBooked).toBe(true);
  expect(s.booked).toBe(false);
  s = act(s, "KEEP_RIDE");
  expect(s.askAboutRide).toBe(false);
  expect(s.rideBooked).toBe(true);
});
test("mid-booking waits for result then cancels; stopping ride leaves dinner request running", () => {
  for (const task of ["table", "ride"] as const) {
    let s = ready(false);
    if (task === "table") {
      s.booked = false;
      s.step = "bookingWork";
    } else s.step = "calling";
    s.pending = { id: 900, ms: 2500 };
    s = act(s, "CANCEL_PROMPT", task);
    expect(s.cancelStage).toBeUndefined();
    expect(s.step).toBe("stopping");
    expect(
      s.messages.at(-1)?.[task === "table" ? "tableStatus" : "rideStatus"],
    ).toBe("Stopping…");
    s = act(s, "TICK");
    expect(task === "table" ? s.tableOutcome : s.rideOutcome).toBe("stopped");
    expect(s.messages.some((m) => m.planTag === "Updating")).toBe(false);
  }
  let s = ready(false);
  s.step = "bookingWork";
  s.booked = false;
  s.tasks.dining = "Working";
  s.pending = { id: 900, ms: 3000 };
  s = act(s, "CANCEL_PROMPT", "ride");
  s = act(s, "TICK");
  expect(s.step).toBe("bookingWork");
  expect(s.pending).toBeDefined();
  s = act(s, "TICK");
  expect(s.booked).toBe(true);
  expect(s.plan.ride).toBe(false);
});
async function tick(p: Page) {
  const b = p
    .getByRole("button", { name: /^Skip wait/ })
    .filter({ visible: true })
    .first();
  if (await b.count()) await b.click();
}
async function browserReady(p: Page, finish = true) {
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto("?flow=normal&debug=1");
  await p.getByRole("textbox", { name: "Message Main Pal" }).click();
  await p.getByRole("button", { name: "Send message", exact: true }).click();
  await tick(p);
  await p.getByRole("button", { name: "Looks good", exact: true }).click();
  await expect(
    p.getByRole("heading", { name: "Share your location?" }),
  ).toBeVisible();
  await p.screenshot({
    path: `design-reference/r2-permission-${test.info().project.name}.png`,
  });
  await p.getByRole("button", { name: "Allow once", exact: true }).click();
  await tick(p);
  await expect(p.locator(".recommend-badge")).toHaveCount(3);
  await expect(p.locator(".recommend-why")).toHaveCount(3);
  await p.locator(".restaurant-card").first().scrollIntoViewIfNeeded();
  await p.screenshot({
    path: `design-reference/r2-restaurants-${test.info().project.name}.png`,
  });
  await p.getByRole("button", { name: "Choose", exact: true }).first().click();
  await tick(p);
  await p.getByRole("button", { name: "Share & book table" }).click();
  await tick(p);
  await tick(p);
  await expect(
    p.getByRole("heading", { name: "Share your location for pickup?" }),
  ).toBeVisible();
  await p
    .getByRole("button", { name: "Allow once", exact: true })
    .last()
    .click();
  await tick(p);
  if (!finish) return;
  await p.getByRole("button", { name: /^Confirm Economy/ }).click();
  await tick(p);
  await p
    .getByRole("button", { name: "Book this car", exact: true })
    .first()
    .click();
  await tick(p);
  await tick(p);
}
test("picker and alert match scope; table-only result asks about ride; cancel remaining ride", async ({
  page: p,
}) => {
  await browserReady(p);
  const final = p.locator(".tonight-plan").last();
  await expect(final).toContainText("All confirmed");
  await final.getByRole("button", { name: "Cancel…" }).scrollIntoViewIfNeeded();
  await p.screenshot({
    path: `design-reference/r2-final-${test.info().project.name}.png`,
  });
  await final.getByRole("button", { name: "Cancel…", exact: true }).click();
  let d = p.getByRole("dialog");
  await expect(
    d.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  await d.getByRole("checkbox", { name: /Table ·/ }).click();
  await p.screenshot({
    path: `design-reference/r2-picker-${test.info().project.name}.png`,
  });
  await d.getByRole("button", { name: "Continue · 1 selected" }).click();
  const alert = p.getByRole("alertdialog");
  await expect(alert).toContainText("Cancel the table?");
  await expect(alert).not.toContainText("Mobility Pal will cancel");
  await p.screenshot({
    path: `design-reference/r2-confirm-${test.info().project.name}.png`,
  });
  await alert.getByRole("button", { name: "Go back" }).click();
  await expect(p.getByRole("checkbox", { name: /Table ·/ })).toBeChecked();
  await d.getByRole("button", { name: "Continue · 1 selected" }).click();
  await p.getByRole("button", { name: "Cancel table", exact: true }).click();
  await tick(p);
  await expect(
    p.getByText("Your ride is still going to Longtang Bistro. Cancel it too?"),
  ).toBeVisible();
  await p.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(p.getByRole("checkbox", { name: /Ride ·/ })).toBeChecked();
  await p.getByRole("button", { name: "Continue · 1 selected" }).click();
  await p.getByRole("button", { name: "Cancel ride", exact: true }).click();
  await tick(p);
  await expect(p.locator(".tonight-plan").last()).toContainText("Cancelled");
  await expect(p.locator(".plan-cancel")).toHaveCount(0);
  await expect(p.locator(".conversation")).not.toContainText(
    /cancellation fee|no fee|¥5\b/i,
  );
});
test("typed walking request stops immediately; reaction hugs one and multiple lines", async ({
  page: p,
}) => {
  await browserReady(p, false);
  await p
    .getByRole("textbox", { name: "Message Main Pal" })
    .fill("Actually I'll walk. Cancel the ride, keep the table.");
  await p.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(p.getByRole("dialog")).toHaveCount(0);
  await tick(p);
  await expect(p.locator(".tonight-plan").last()).toContainText(
    "Not started, nothing to cancel",
  );
  await expect(
    p.locator(".tonight-plan").last().getByRole("button", { name: "Cancel…" }),
  ).toBeEnabled();
  const positions = await p.locator(".alex-wrap").evaluateAll((els) =>
    els.map((el) => {
      const w = el.getBoundingClientRect(),
        r = el.querySelector(".reaction")!.getBoundingClientRect();
      return {
        bottom: w.bottom - r.bottom,
        right: (w.right - r.right) / (r.width / 32),
      };
    }),
  );
  for (const pos of positions) {
    expect(Math.abs(pos.bottom)).toBeLessThan(1);
    expect(pos.right).toBeCloseTo(16, 0);
  }
  await p.screenshot({
    path: `design-reference/r2-stopped-${test.info().project.name}.png`,
  });
});
