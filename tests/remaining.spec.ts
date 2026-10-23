import { test, expect } from "@playwright/test";
import { reducer, demoState } from "../src/engine/useChat";
import { ownsCancel, canStopPlanning } from "../src/engine/bookingControls";
import { initial } from "../src/engine/script";
test("commitment transfers Cancel to the latest card and never to an option", () => {
  let s = initial("normal");
  const act = (type: string, value?: any) => (s = reducer(s, { type, value }));
  act("SEND_REQUEST", { text: "Dinner", plan: s.plan });
  act("TICK");
  act("APPROVE_REQUEST");
  act("PERMISSION", "tonight");
  act("TICK");
  act("SELECT_RESTAURANT", s.restaurant);
  act("TICK");
  const booking = s.messages.find((m) => m.card === "booking")!;
  expect(ownsCancel(s, booking, "table")).toBe(false);
  act("BOOK");
  expect(ownsCancel(s, booking, "table")).toBe(true);
  expect(canStopPlanning(s, "dining")).toBe(false);
  expect(canStopPlanning(s, "mobility")).toBe(true);
  act("TICK");
  expect(ownsCancel(s, booking, "table")).toBe(false);
  const success = s.messages.find((m) => m.card === "bookingSuccess")!;
  expect(ownsCancel(s, success, "table")).toBe(true);
  act("TICK");
  const ride = s.messages.find((m) => m.card === "rideType")!;
  expect(ownsCancel(s, ride, "ride")).toBe(false);
  act("CONFIRM_TYPE");
  expect(ownsCancel(s, ride, "ride")).toBe(true);
  act("TICK");
  act("CALL_CAR", 0);
  expect(ownsCancel(s, ride, "ride")).toBe(false);
  act("TICK");
  act("TICK");
  expect(s.messages.filter((m) => ownsCancel(s, m, "ride"))).toHaveLength(1);
  expect(s.messages.filter((m) => ownsCancel(s, m, "table"))).toHaveLength(1);
});
test("Stop planning is immediate and rejects completed bookings", () => {
  let s = initial("normal");
  for (const a of [
    { type: "SEND_REQUEST", value: { text: "Dinner", plan: s.plan } },
    { type: "TICK" },
    { type: "APPROVE_REQUEST" },
    { type: "PERMISSION", value: "tonight" },
  ])
    s = reducer(s, a);
  expect(canStopPlanning(s, "dining")).toBe(true);
  s = reducer(s, { type: "STOP_PLANNING", value: "dining" });
  expect(s.tableOutcome).toBe("stopped");
  expect(s.cancelStage).toBeUndefined();
  expect(
    s.messages.some(
      (m) => m.kind === "event" && m.text === "Stopped" && m.role === "dining",
    ),
  ).toBe(true);
  s = demoState("cancel-all");
  expect(reducer(s, { type: "STOP_PLANNING", value: "dining" })).toBe(s);
});
test("working sheet Stop and request card geometry", async ({ page: p }) => {
  await p.goto("?flow=normal&debug=1");
  await p.getByRole("textbox", { name: "Message Main Pal" }).click();
  await p.getByRole("button", { name: "Send message", exact: true }).click();
  await p
    .getByRole("button", { name: /Skip wait/ })
    .filter({ visible: true })
    .first()
    .click();
  await expect(p.locator('[data-message="request"] .card')).toHaveCSS(
    "border-radius",
    "16px",
  );
  await p.getByRole("button", { name: "Looks good", exact: true }).click();
  await p
    .getByRole("button", { name: "Allow for tonight", exact: true })
    .click();
  await p.getByRole("button", { name: "View working Pals" }).click();
  const row = p.locator(".pal-row").filter({ hasText: "Dining Pal" });
  await expect(row).toContainText("Finding Shanghainese");
  await row.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(p.getByRole("dialog")).toHaveCount(0);
  await expect(
    p.getByText("Dining planning has stopped. No table was booked.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(p.locator(".top-fade")).toHaveCSS("height", "56px");
});
test("calendar exports the booking and only final summary retains Cancel", async ({
  page: p,
}) => {
  await p.goto("?flow=cancel-all&debug=1");
  await expect(
    p.getByRole("button", { name: "Cancel", exact: true }),
  ).toHaveCount(0);
  await expect(
    p.getByRole("button", { name: "Cancel…", exact: true }),
  ).toHaveCount(1);
  const download = p.waitForEvent("download");
  await p.getByRole("button", { name: "Add to calendar", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("pal-dinner.ics");
  await p.getByRole("button", { name: "Who's working on tonight" }).click();
  await expect(
    p.getByRole("dialog").getByRole("button", { name: "Stop", exact: true }),
  ).toHaveCount(0);
});
