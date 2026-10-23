import { test, expect, type Page } from "@playwright/test";
import { demoState, reducer } from "../src/engine/useChat";
import { initial, restaurants, type State } from "../src/engine/script";
const act = (s: State, type: string, value?: any) =>
  reducer(s, { type, value });
test("clear and vague natural language both require concrete confirmation", () => {
  for (const text of [
    "A is fine",
    "8 is fine",
    "the first one",
    "ok",
    "sure, either works",
    "later",
  ]) {
    let s = demoState("decide");
    s = act(s, "INTERPRET", text);
    expect(s.step).toBe("readingChoice");
    expect(s.plan.time).toBe("7:00 PM");
    s = act(s, "TICK");
    expect(s.decision?.question).toContain("8:00 PM");
    s = act(s, "DECISION_YES", s.decision!.id);
    expect(s.plan.time).toBe("8:00 PM");
    expect(s.step).toBe("updating");
    expect(s.booked).toBe(false);
  }
});
test("No keeps the plan; freeform preferences are echoed, confirmed, and retained on No", () => {
  let s = demoState("decide");
  s = act(act(s, "INTERPRET", "ok"), "TICK");
  s = act(s, "DECISION_NO", s.decision!.id);
  expect(s.clarifying).toBe(true);
  expect(s.plan.time).toBe("7:00 PM");
  const draft = {
    ...s.plan,
    cuisine: "Cantonese",
    preferences: "Somewhere quiet, near the Bund",
  };
  s = act(act(s, "PROPOSE_CUSTOM", draft), "TICK");
  expect(
    s.messages.some(
      (m) =>
        m.kind === "alex" &&
        m.text?.includes(
          'Cantonese · 7:00 PM · 2 people · "Somewhere quiet, near the Bund"',
        ),
    ),
  ).toBe(true);
  expect(s.decision?.question).toContain("Somewhere quiet, near the Bund");
  s = act(s, "DECISION_NO", s.decision!.id);
  expect(s.editDraft).toEqual(draft);
  s = act(act(s, "PROPOSE_CUSTOM", s.editDraft), "TICK");
  s = act(s, "DECISION_YES", s.decision!.id);
  expect(s.step).toBe("finding");
  expect(s.plan.preferences).toBe(draft.preferences);
});
test("cheaper is resolved against visible restaurant/car options with no silent action", () => {
  let s = initial("normal");
  s.step = "restaurants";
  s = act(act(s, "INTERPRET", "the cheaper one"), "TICK");
  expect(s.decision?.question).toContain("Lane 18");
  expect(s.restaurant.id).toBe("longtang");
  s = act(s, "DECISION_YES", s.decision!.id);
  expect(s.restaurant.id).toBe("lane18");
  s = demoState("cancel-all");
  s.step = "cars";
  s.rideBooked = false;
  s = act(act(s, "INTERPRET", "the cheaper one"), "TICK");
  expect(s.decision?.question).toContain("silver");
  expect(s.rideBooked).toBe(false);
});
test("mid-booking stops; late success instead asks for explicit cancellation", () => {
  let s = demoState("stopping");
  expect(s.step).toBe("stopping");
  expect(s.header.activity).toBe("Mobility Pal · Stopping…");
  s = act(s, "TICK");
  expect(s.booked).toBe(true);
  expect(s.rideBooked).toBe(false);
  expect(s.messages.at(-1)?.rideStatus).toBe("✓ Stopped by Mobility Pal");
  s = demoState("stopping");
  s = act(s, "STOP_RESULT", "booked");
  expect(s.rideBooked).toBe(true);
  expect(s.cancelStage).toBe("pick");
  expect(s.cancelSelection).toEqual({ table: false, ride: true });
  s = act(s, "KEEP");
  expect(s.rideBooked).toBe(true);
});
async function tick(p: Page) {
  const b = p
    .getByRole("button", { name: /^Skip wait/ })
    .filter({ visible: true })
    .first();
  if (await b.count()) await b.click();
}
async function send(p: Page, text: string) {
  await p.getByRole("textbox", { name: "Message Main Pal" }).fill(text);
  await p.getByRole("button", { name: "Send message", exact: true }).click();
}
test("NL No opens quick options and keyboard; custom form No retains chips and words", async ({
  page: p,
}) => {
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto("?flow=decide&debug=1");
  await expect(
    p.getByRole("textbox", { name: "Message Main Pal" }),
  ).toHaveValue("A is fine");
  await p.getByRole("button", { name: "Send message", exact: true }).click();
  await tick(p);
  await expect(
    p.getByText(/Got it — 8:00 PM at Longtang Bistro. Same route/),
  ).toBeVisible();
  await p.screenshot({
    path: `design-reference/nl-confirm-${test.info().project.name}.png`,
  });
  await p.getByRole("button", { name: "No", exact: true }).click();
  await expect(
    p.getByPlaceholder("Tell Main Pal what you meant…"),
  ).toBeFocused();
  await expect(p.getByPlaceholder("Tell Main Pal what you meant…")).toHaveValue(
    "",
  );
  await p.getByRole("button", { name: "Customize…", exact: true }).click();
  await p.getByRole("button", { name: "Cantonese", exact: true }).click();
  await p.getByLabel("Anything else?").fill("Somewhere quiet, near the Bund");
  await expect(p.locator(".overlay")).toHaveCSS("opacity", "1");
  await p.screenshot({
    path: `design-reference/nl-custom-${test.info().project.name}.png`,
  });
  await p
    .getByRole("button", { name: "Search with these changes", exact: true })
    .click();
  await tick(p);
  await expect(
    p.getByText(
      /Got it — Cantonese at 7:00 PM for 2, under ¥200, Somewhere quiet/,
    ),
  ).toBeVisible();
  await p.getByRole("button", { name: "No", exact: true }).last().click();
  await expect(p.getByLabel("Anything else?")).toHaveValue(
    "Somewhere quiet, near the Bund",
  );
  await expect(
    p.getByRole("button", { name: "Cantonese", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await p
    .getByRole("button", { name: "Search with these changes", exact: true })
    .click();
  await tick(p);
  await p
    .getByRole("button", { name: "Yes, search", exact: true })
    .last()
    .click();
  await tick(p);
  await expect(p.locator('[data-message="carousel"]').last()).toContainText(
    "Pearl Dim Sum",
  );
});
test("only the latest summary exposes cancellation and preserves scope", async ({
  page: p,
}) => {
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto("?flow=cancel-all&debug=1");
  const old = p.locator('[data-message="booking"]');
  await expect(
    old.getByRole("button", { name: "Cancel", exact: true }),
  ).toHaveCount(0);
  const cancel = p
    .locator(".tonight-plan")
    .last()
    .getByRole("button", { name: "Cancel…", exact: true });
  await cancel.scrollIntoViewIfNeeded();
  const opacity = await cancel.evaluate((el) => {
    let n: Element | null = el,
      value = 1;
    while (n) {
      value *= Number(getComputedStyle(n).opacity);
      n = n.parentElement;
    }
    return value;
  });
  expect(opacity).toBe(1);
  await cancel.click();
  await p.getByRole("checkbox", { name: /Table ·/ }).click();
  await expect(p.getByRole("checkbox", { name: /Table ·/ })).toBeChecked();
  await expect(p.getByRole("checkbox", { name: /Ride ·/ })).not.toBeChecked();
  await p.getByRole("button", { name: "Continue · 1 selected" }).click();
  await expect(p.getByRole("alertdialog")).toContainText("Cancel the table?");
  await p.getByRole("button", { name: "Cancel table", exact: true }).click();
  await tick(p);
  await expect(
    p.getByRole("button", { name: "No, keep the ride", exact: true }),
  ).toBeVisible();
  await expect(
    old.getByRole("button", { name: "Cancel", exact: true }),
  ).toHaveCount(0);
  await p
    .getByRole("button", { name: "No, keep the ride", exact: true })
    .click();
  await expect(
    p.getByText("Your ride to Longtang Bistro is kept.", { exact: true }),
  ).toBeVisible();
});
test("stopping demo and seven distinct entries; intro only language switch", async ({
  page: p,
}) => {
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto("?flow=stopping&debug=1");
  await expect(
    p.getByText("Mobility Pal · Stopping…", { exact: true }),
  ).toBeVisible();
  await tick(p);
  await expect(p.locator(".tonight-plan").last()).toContainText(
    "No driver was assigned",
  );
  await expect(p.locator(".tonight-plan").last()).toContainText("✓ Table kept");
  await p.setViewportSize({ width: 1280, height: 800 });
  await expect(p.locator(".demo-controls > button:not(.skip)")).toHaveCount(7);
  await p.getByRole("button", { name: "中文", exact: true }).click();
  await expect(p.locator(".desktop-intro h1")).toContainText("你的安排");
  await expect(p.locator(".tonight-plan").last()).toContainText(
    "Ride · stopped while booking",
  );
  const phone = await p.locator(".phone").boundingBox();
  expect(phone!.y).toBeGreaterThanOrEqual(20);
  expect(phone!.y + phone!.height).toBeLessThanOrEqual(780);
  await p.screenshot({
    path: `design-reference/seven-demos-${test.info().project.name}.png`,
  });
});
test("restaurant geometry, SVG tags and dark green actions on narrow screens", async ({
  page: p,
}) => {
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto("?flow=decide&debug=1");
  await p.getByRole("button", { name: /OPTION B/ }).click();
  await tick(p);
  const card = p.locator(".restaurant-card").last();
  await card.scrollIntoViewIfNeeded();
  expect(await card.locator(".tags svg").count()).toBe(2);
  expect(
    await card
      .getByRole("button", { name: "Choose", exact: true })
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(6, 122, 62)");
  await p.screenshot({
    path: `design-reference/recommend-exact-${test.info().project.name}.png`,
  });
  await p.setViewportSize({ width: 360, height: 780 });
  const overflow = await p.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
  const lineHeight = await card.locator(".recommend-why p").evaluate((el) => ({
    height: el.getBoundingClientRect().height,
    line: Number.parseFloat(getComputedStyle(el).lineHeight),
  }));
  expect(lineHeight.height).toBeLessThanOrEqual(lineHeight.line * 2 + 0.5);
});
test("request-time later confirmation still asks permission before dispatch", () => {
  let s = initial("normal");
  s.step = "request";
  s = act(act(s, "INTERPRET", "later"), "TICK");
  s = act(s, "DECISION_YES", s.decision!.id);
  expect(s.step).toBe("permission");
  expect(s.tasks.dining).toBe("Not started");
  expect(s.plan.time).toBe("8:00 PM");
});
test("Dining booking-card stop skips picker and can keep an unbooked ride", async ({
  page: p,
}) => {
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto("?flow=decide&debug=1");
  await p.getByRole("button", { name: /OPTION B/ }).click();
  await tick(p);
  await p
    .locator('[data-message="carousel"]')
    .last()
    .getByRole("button", { name: "Choose", exact: true })
    .first()
    .click();
  await tick(p);
  const booking = p.locator('[data-message="booking"]').last();
  await booking
    .getByRole("button", { name: "Share & book table", exact: true })
    .click();
  await booking.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(p.getByRole("dialog")).toHaveCount(0);
  await expect(
    p.getByText("Dining Pal is still booking — I'll stop it.", { exact: true }),
  ).toBeVisible();
  await tick(p);
  await expect(p.locator(".tonight-plan").last()).toContainText(
    "✓ Stopped by Dining Pal",
  );
  await expect(p.locator(".tonight-plan").last()).toContainText(
    "No car has been called",
  );
  await p
    .getByRole("button", { name: "No, keep the ride", exact: true })
    .click();
  await expect(
    p.getByRole("button", { name: /^Confirm Economy/ }),
  ).toBeEnabled();
});
