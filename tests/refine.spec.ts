import { test, expect, type Page } from "@playwright/test";
import { reducer } from "../src/engine/useChat";
import { initial, restaurants, defaultPlan, route } from "../src/engine/script";
const skip = async (p: Page) => {
  const b = p
    .getByRole("button", { name: /^Skip wait/ })
    .filter({ visible: true })
    .first();
  if (await b.count()) await b.click();
};
async function request(p: Page, flow = "normal") {
  await p.goto(`?flow=${flow}&debug=1`);
  await p.getByRole("textbox", { name: "Message Main Pal" }).click();
  await p.getByRole("button", { name: "Send message", exact: true }).click();
  await skip(p);
}
test("ride cancellation preserves pending 8 PM confirmation and dinner completion", async ({
  page: p,
}) => {
  await request(p, "exception");
  await p.getByRole("button", { name: "Looks good", exact: true }).click();
  await p
    .getByRole("button", { name: "Allow for tonight", exact: true })
    .click();
  await skip(p);
  await p.getByRole("button", { name: "Choose", exact: true }).first().click();
  await skip(p);
  await p.getByRole("button", { name: "Share & book table" }).click();
  await skip(p);
  await expect(p.locator(".handoff-pal")).toHaveAttribute(
    "aria-label",
    "Main Pal attention",
  );
  await p.getByRole("textbox", { name: "Message Main Pal" }).fill("8 is fine");
  await p.getByRole("button", { name: "Send message" }).click();
  await skip(p);
  await p
    .getByRole("button", { name: "Yes, book 8:00 PM", exact: true })
    .click();
  await expect(p.getByText(/Got it — 8:00 PM.*7:35 PM/).last()).toBeVisible();
  await expect(p.locator(".working-slot")).toHaveCount(2);
  await skip(p);
  await p
    .getByRole("textbox", { name: "Message Main Pal" })
    .fill("cancel the ride");
  await p.getByRole("button", { name: "Send message" }).click();
  await skip(p);
  await expect(
    p.getByRole("button", { name: "Book table for 8:00 PM" }),
  ).toBeEnabled();
  await p.getByRole("button", { name: "Book table for 8:00 PM" }).click();
  await skip(p);
  await expect(p.locator(".handoff-pal")).toHaveAttribute(
    "aria-label",
    "Main Pal done",
  );
  await skip(p);
  await expect(p.locator(".tonight-plan").last()).toBeVisible();
  await expect(p.locator(".handoff-pal")).toHaveAttribute(
    "aria-label",
    "Main Pal idle",
  );
});
test("text-first idle, editing, menu and desktop viewport fit", async ({
  page: p,
}) => {
  await p.goto("?flow=normal");
  await expect(
    p.getByRole("textbox", { name: "Message Main Pal" }),
  ).toBeVisible();
  await expect(p.getByRole("button", { name: "Use voice" })).toBeVisible();
  await expect(p.locator(".mobile-demo-controls")).toHaveCount(0);
  await p.getByRole("textbox", { name: "Message Main Pal" }).click();
  await p.getByRole("button", { name: "Send message" }).click();
  await expect(p.getByRole("button", { name: "Use voice" })).toBeVisible();
  await p.getByRole("button", { name: "More", exact: true }).click();
  await expect(p.locator(".more-menu button")).toHaveCount(1);
  await p.keyboard.press("Escape");
  for (const [width, height] of [
    [1280, 800],
    [1440, 900],
  ]) {
    await p.setViewportSize({ width, height });
    const box = await p.locator(".phone").boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(20);
    expect(box!.y + box!.height).toBeLessThanOrEqual(height - 20);
  }
  await p.screenshot({ path: "design-reference/refined-desktop.png" });
});
test("recording stop/send lifecycle and unsupported browser fallback", async ({
  page: p,
}) => {
  await p.addInitScript(() => {
    (window as any).SpeechRecognition = class {
      onresult: any;
      onend: any;
      start() {
        this.onresult?.({ results: [[{ transcript: "Dinner for two at 7" }]] });
      }
      stop() {
        this.onend?.();
      }
      abort() {}
    };
  });
  await p.goto("?flow=normal");
  await p.getByRole("button", { name: "Use voice" }).click();
  await expect(p.getByRole("button", { name: "Stop recording" })).toBeVisible();
  await p.getByRole("button", { name: "Stop recording" }).click();
  await expect(
    p.getByRole("textbox", { name: "Message Main Pal" }),
  ).toHaveValue("");
  await expect(p.getByRole("button", { name: "Use voice" })).toBeVisible();
  await p.getByRole("button", { name: "Record message" }).click();
  await p.getByRole("button", { name: "Send recording" }).click();
  await expect(p.getByRole("button", { name: "Use voice" })).toBeVisible();
  await p.evaluate(() => {
    (window as any).SpeechRecognition = undefined;
    (window as any).webkitSpeechRecognition = undefined;
  });
  await p.getByRole("button", { name: "Use voice" }).click();
  await expect(p.getByRole("status")).toContainText("Please type your message");
});
test("restaurant data, clock arithmetic and cancellation state across pending dinner steps", () => {
  const expected = [
    ["Longtang Bistro", 160, 22, "1.8", "32–38"],
    ["Shikumen Kitchen", 185, 26, "2.4", "38–45"],
    ["Lane 18 Canteen", 140, 18, "1.5", "28–34"],
    ["Plane Tree House", 175, 15, "1.2", "24–30"],
    ["Shanghai Table", 150, 20, "1.6", "30–36"],
    ["Riverside Kitchen", 190, 25, "2.1", "35–42"],
    ["Pearl Dim Sum", 150, 12, "1.0", "20–26"],
    ["Canton House", 180, 20, "1.6", "30–36"],
    ["Harbour Kitchen", 190, 25, "2.1", "35–42"],
  ];
  restaurants.forEach((r, i) =>
    expect([
      r.name,
      r.price,
      r.minutes,
      r.distance,
      route(r, defaultPlan).ranges[0],
    ]).toEqual(expected[i]),
  );
  expect(route(restaurants[0], defaultPlan)).toMatchObject({
    leave: "6:35 PM",
    arrive: "6:57 PM",
  });
  expect(route(restaurants[3], defaultPlan)).toMatchObject({
    leave: "6:45 PM",
    arrive: "7:00 PM",
  });
  for (const step of ["request", "booking", "updated"] as const) {
    let s = initial("normal");
    s.step = step;
    s.tasks.dining = "Waiting for you";
    s.messages = [];
    s = reducer(s, { type: "CANCEL_PROMPT", value: "ride" });
    s = reducer(s, { type: "CANCEL_CONFIRM" });
    s = reducer(s, { type: "TICK" });
    expect(s.step).toBe(step);
    expect(s.version).toBe(0);
    expect(s.plan.ride).toBe(false);
    expect(s.tasks.dining).toBe("Waiting for you");
  }
});
