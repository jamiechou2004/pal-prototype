import { test, expect } from "@playwright/test";
test("Main Pal thinks during request and respects pause and reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("?flow=normal&debug=1");
  await page.getByRole("textbox", { name: "Message Main Pal" }).click();
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const main = page.locator(".title-capsule .pal-working");
  await expect(main).toHaveCSS("animation-name", "pal-think");
  await expect(page.locator(".thinking-dots i")).toHaveCount(3);
  // Pause synchronously before the scripted reading timer expires.
  await page
    .getByRole("button", { name: "Pause", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(main).toHaveCSS("animation-play-state", "paused");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(main).toHaveCSS("animation-name", "none");
  await page
    .getByRole("button", { name: "Resume", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Looks good", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".title-capsule .pal-working")).toHaveCount(0);
});
