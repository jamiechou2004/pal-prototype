import { test, expect, type Page } from "@playwright/test";
async function skip(p: Page) {
  const b = p
    .getByRole("button", { name: /^Skip wait/ })
    .filter({ visible: true })
    .first();
  if (await b.count()) await b.click();
}
async function start(
  p: Page,
  flow = "normal",
  permission = "Allow for tonight",
) {
  await p.goto(`?flow=${flow}&debug=1`);
  await p.getByRole("textbox", { name: "Message Main Pal" }).click();
  await p.getByRole("button", { name: "Send message" }).click();
  await skip(p);
  await p.getByRole("button", { name: "Looks good", exact: true }).click();
  await p.getByRole("button", { name: permission, exact: true }).click();
  await skip(p);
  await expect(p.locator(".restaurant-card").first()).toBeVisible();
}
async function select(p: Page) {
  await p
    .getByRole("button", { name: "Choose", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await skip(p);
}
async function book(p: Page) {
  await p
    .getByRole("button", { name: "Share & book table" })
    .filter({ visible: true })
    .last()
    .click();
  await skip(p);
}
async function ride(p: Page) {
  await skip(p);
  await p.getByRole("radio", { name: /Comfort/ }).click();
  await p.getByRole("button", { name: /^Confirm Comfort/ }).click();
  await skip(p);
  await p
    .getByRole("button", { name: "Book this car", exact: true })
    .first()
    .click();
  await skip(p);
  await expect(
    p.getByRole("heading", { name: "Driver arriving in 4 min" }),
  ).toBeVisible();
  await skip(p);
}
async function exception(p: Page) {
  await start(p, "exception");
  await select(p);
  await book(p);
  await expect(
    p.getByRole("heading", { name: "What should I do instead?" }),
  ).toBeVisible();
}
test("normal, selectable car type, profile/search, cancel ride only", async ({
  page: p,
}) => {
  await start(p);
  await select(p);
  await book(p);
  await expect(p.getByText("Table booked", { exact: true })).toBeVisible();
  await ride(p);
  await p.getByRole("button", { name: "More", exact: true }).click();
  await p.getByRole("button", { name: "Profile", exact: true }).click();
  await p.getByRole("textbox", { name: "Search Pals" }).fill("mob");
  await expect(p.locator(".profile-row")).toHaveCount(1);
  await p.getByRole("button", { name: "Back to chat" }).click();
  await p
    .getByRole("textbox", { name: "Message Main Pal" })
    .fill("cancel the ride");
  await p.getByRole("button", { name: "Send message" }).click();
  await p.getByRole("button", { name: /Continue · 1 selected/ }).click();
  await p.getByRole("button", { name: "Cancel ride", exact: true }).click();
  await skip(p);
  await expect(p.getByText("✓ Table kept", { exact: true })).toBeVisible();
});
test("exception A via natural language, outdated estimate and explicit confirmation", async ({
  page: p,
}) => {
  await exception(p);
  await expect(p.getByText("Outdated · previous ride estimate")).toBeVisible();
  await p.getByRole("textbox", { name: "Message Main Pal" }).fill("8 is fine");
  await p.getByRole("button", { name: "Send message" }).click();
  await skip(p);
  await p
    .getByRole("button", { name: "Yes, book 8:00 PM", exact: true })
    .click();
  await skip(p);
  await expect(
    p.getByRole("button", { name: "Book table for 8:00 PM" }),
  ).toBeEnabled();
  await expect(p.getByText("Table booked", { exact: true })).toHaveCount(0);
  await p.getByRole("button", { name: "Book table for 8:00 PM" }).click();
  await skip(p);
  await ride(p);
  await expect(p.locator(".tonight-plan").last()).toContainText(
    "Plan updated from 7:00 PM to 8:00 PM",
  );
  await expect(
    p.getByText(/Pickup at your hotel lobby · arrive ~7:57 PM/),
  ).toBeVisible();
});
test("exception B finds alternate restaurant with updated prices", async ({
  page: p,
}) => {
  await exception(p);
  await p.getByRole("button", { name: /OPTION B/ }).click();
  await skip(p);
  await p
    .locator('[data-message="carousel"]')
    .last()
    .getByRole("button", { name: "Choose", exact: true })
    .first()
    .click();
  await skip(p);
  await book(p);
  await skip(p);
  await expect(
    p.getByRole("button", { name: "Confirm Economy · ¥24–30" }),
  ).toBeVisible();
  await ride(p);
  await expect(p.locator(".tonight-plan").last()).toContainText(
    "Restaurant changed: Longtang Bistro was full at 7:00 PM",
  );
});
test("exception custom Cantonese and cancel everything", async ({
  page: p,
}) => {
  await exception(p);
  await p.getByRole("button", { name: "Customize", exact: true }).click();
  await p.getByRole("button", { name: "Cantonese", exact: true }).click();
  await p.getByRole("button", { name: "Search with these changes" }).click();
  await skip(p);
  await p.getByRole("button", { name: "Yes, search", exact: true }).click();
  await skip(p);
  await p
    .locator('[data-message="carousel"]')
    .last()
    .getByRole("button", { name: "Choose", exact: true })
    .first()
    .click();
  await skip(p);
  await book(p);
  await skip(p);
  await expect(
    p.getByRole("button", { name: "Confirm Economy · ¥20–26" }),
  ).toBeVisible();
  await ride(p);
  await expect(p.locator(".tonight-plan").last()).toContainText(
    "Changed to Cantonese — Longtang Bistro was full at 7:00 PM",
  );
  await p
    .getByRole("textbox", { name: "Message Main Pal" })
    .fill("cancel everything");
  await p.getByRole("button", { name: "Send message" }).click();
  await p.getByRole("button", { name: /Continue · 2 selected/ }).click();
  await p.getByRole("button", { name: "Cancel both", exact: true }).click();
  await skip(p);
  await expect(p.locator(".tonight-plan").last()).toContainText(
    "✓ Cancelled by Dining Pal",
  );
  await expect(p.locator(".tonight-plan").last()).toContainText(
    "✓ Cancelled by Mobility Pal",
  );
});
test("permission refusal supports skip ride, and live status sheet", async ({
  page: p,
}) => {
  await start(p, "normal", "Don't allow");
  await p.getByRole("button", { name: "Who's working on tonight" }).click();
  await expect(p.getByRole("dialog")).toContainText("Dining Pal");
  await p
    .getByRole("button", { name: "Dismiss sheet" })
    .click({ force: true, position: { x: 10, y: 100 } });
  await select(p);
  await p.getByRole("button", { name: "Skip the ride", exact: true }).click();
  await book(p);
  await skip(p);
  await expect(p.locator(".tonight-plan").last()).toBeVisible();
  await expect(p.getByRole("radiogroup")).toHaveCount(0);
});
test("manual address, request editing, carousel dots, pause and no asset failures", async ({
  page: p,
}) => {
  const bad: string[] = [];
  p.on("response", (r) => {
    if (r.status() >= 400) bad.push(r.url());
  });
  await start(p, "normal", "Don't allow");
  await p.getByRole("button", { name: "Restaurant 2", exact: true }).click();
  await expect(
    p.getByRole("button", { name: "Restaurant 2", exact: true }),
  ).toHaveAttribute("aria-current", "true");
  await p.getByRole("button", { name: "Show 3 others", exact: true }).click();
  await skip(p);
  await p
    .locator('[data-message="carousel"]')
    .last()
    .getByRole("button", { name: "Choose", exact: true })
    .first()
    .click();
  await skip(p);
  await p.getByRole("button", { name: "Type hotel name", exact: true }).click();
  await p
    .getByRole("textbox", { name: "Enter pickup address" })
    .fill("Park Hotel, 170 Nanjing Road West");
  await p.getByRole("button", { name: "Use this pickup address" }).click();
  await book(p);
  await ride(p);
  expect(bad).toEqual([]);
  const horizontal = await p.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(horizontal).toBe(false);
});
test("edit time before approval, pause, and stale controls", async ({
  page: p,
}) => {
  await p.goto("?flow=normal&debug=1");
  await p.getByRole("textbox", { name: "Message Main Pal" }).click();
  await p.getByRole("button", { name: "Send message" }).click();
  await p
    .getByRole("button", { name: "Pause", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await p.waitForTimeout(1800);
  await expect(
    p.getByRole("status", { name: "Reading your request…" }),
  ).toBeVisible();
  await p
    .getByRole("button", { name: "Resume", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await skip(p);
  await p.getByRole("button", { name: "Edit", exact: true }).click();
  await p.getByRole("button", { name: "8:00 PM", exact: true }).click();
  await p.getByRole("button", { name: "Update request · 8:00 PM" }).click();
  await expect(
    p.getByRole("button", { name: "Looks good", exact: true }).first(),
  ).toBeDisabled();
  await p
    .getByRole("button", { name: "Looks good", exact: true })
    .last()
    .click();
  await p.getByRole("button", { name: "Allow once", exact: true }).click();
  await skip(p);
  await select(p);
  await book(p);
  await skip(p);
  await expect(p.getByText(/leave 7:35 PM/)).toBeVisible();
});
test("reduced motion and typed custom request", async ({ page: p }) => {
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto("?flow=normal&debug=1");
  await expect(
    p.getByRole("textbox", { name: "Message Main Pal" }),
  ).toBeVisible();
  await p.getByRole("textbox", { name: "Message Main Pal" }).click();
  await p
    .getByRole("textbox", { name: "Message Main Pal" })
    .fill("Cantonese at 7 under ¥180");
  await p.getByRole("button", { name: "Send message" }).click();
  await skip(p);
  await expect(p.getByText("Cantonese", { exact: true })).toBeVisible();
});
