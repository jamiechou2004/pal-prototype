import { test, expect, type Page } from "@playwright/test";
async function skip(p: Page) {
  const b = p
    .getByRole("button", { name: /^Skip wait/ })
    .filter({ visible: true })
    .first();
  if (await b.count()) await b.click();
}
async function toTranslation(p: Page) {
  await p.goto("?flow=normal&debug=1");
  await p.getByRole("textbox", { name: "Message Main Pal" }).click();
  await p.getByRole("button", { name: "Send message" }).click();
  await skip(p);
  await p.getByRole("button", { name: "Looks good", exact: true }).click();
  await p
    .getByRole("button", { name: "Allow for tonight", exact: true })
    .click();
  await skip(p);
  await p.getByRole("button", { name: "Choose", exact: true }).first().click();
  await skip(p);
  await p.getByRole("button", { name: "Share & book table" }).click();
  await skip(p);
  await skip(p);
  await p.getByRole("button", { name: /^Confirm Economy/ }).click();
  await skip(p);
  await p
    .getByRole("button", { name: "Book this car", exact: true })
    .first()
    .click();
  await skip(p);
  await p.getByRole("button", { name: "Translate", exact: true }).click();
}
test("new translate sheet: source, destination, speech, fullscreen, reverse reply and chat retention", async ({
  page: p,
}) => {
  await p.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel() {},
        getVoices() {
          return [];
        },
        speak(u: any) {
          (window as any).lastSpeech = { text: u.text, lang: u.lang };
        },
      },
    });
    (window as any).SpeechSynthesisUtterance = class {
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    };
  });
  await toTranslation(p);
  const d = p.getByRole("dialog");
  await expect(d).toHaveAccessibleName("Show to driver");
  await expect(
    d.getByText(
      "Hello, please take me to Longtang Bistro. I'm waiting in the hotel lobby. I don't speak Chinese — thank you!",
    ),
  ).toBeVisible();
  await expect(d.getByText("弄堂小馆 · 进贤路18号")).toBeVisible();
  await d.getByRole("button", { name: "Play in Chinese", exact: true }).click();
  expect(await p.evaluate(() => (window as any).lastSpeech.lang)).toBe("zh-CN");
  await d.getByRole("button", { name: "Stop playback", exact: true }).click();
  await d.getByRole("button", { name: "Full screen", exact: true }).click();
  await expect(d).toHaveClass(/fullscreen/);
  await expect(d.locator(".translation-source")).toBeHidden();
  await d
    .getByRole("button", { name: "Exit full screen", exact: true })
    .first()
    .click();
  await expect(d).not.toHaveClass(/fullscreen/);
  await d.getByRole("button", { name: "Switch translation direction" }).click();
  await expect(d).toHaveAccessibleName("Driver is speaking");
  await expect(
    d.getByText("OK, see you at the lobby entrance. About 4 minutes."),
  ).toBeVisible();
  await d.getByRole("button", { name: "Let driver speak" }).click();
  await expect(d.getByRole("status")).toHaveText(
    "Sample reply saved in your chat.",
  );
  await d.getByRole("button", { name: "Close translation" }).click();
  await expect(p.getByRole("dialog")).toHaveCount(0);
  await expect(p.getByText(/Driver reply:/)).toBeVisible();
  await expect(
    p.getByRole("button", { name: "Translate", exact: true }),
  ).toBeEnabled();
});
test("translation has audio fallback and no narrow-screen horizontal overflow", async ({
  page: p,
}) => {
  await p.addInitScript(() =>
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: undefined,
    }),
  );
  await toTranslation(p);
  await p.setViewportSize({ width: 360, height: 740 });
  const d = p.getByRole("dialog");
  await d.getByRole("button", { name: "Play in Chinese", exact: true }).click();
  await expect(d.getByRole("status")).toContainText("Audio");
  expect(await d.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  await d.getByRole("button", { name: "Swap languages" }).click();
  await expect(d).toHaveAccessibleName("Driver is speaking");
});
