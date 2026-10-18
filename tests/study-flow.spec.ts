import { test, expect } from "@playwright/test";

test("dashboard links to an interactive session; answers remain only in memory", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Simulador", exact: true }).click();
  await expect(page).toHaveURL("/simulador", { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Um texto. Um raciocínio de cada vez.");
  await expect(page.getByRole("radio").first()).toBeDisabled();
  await page.getByRole("button", { name: "Iniciar sessão", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pausar", exact: true })).toBeFocused();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Marcar para revisão", exact: true }).click();
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(page.getByRole("radio").first()).not.toBeChecked();
  await page.getByRole("radio").nth(1).check();
  await page.getByRole("button", { name: "Questão 1, respondida, marcada para revisão", exact: true }).click();
  await expect(page.getByRole("radio").first()).toBeChecked();
  await expect(page.getByRole("button", { name: "Marcada para revisão", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retomar", exact: true })).toBeFocused();
  await expect(page.getByRole("radio").first()).toBeDisabled();
  const pausedTime = await page.getByRole("timer").textContent();
  await page.waitForTimeout(1100);
  await expect(page.getByRole("timer")).toHaveText(pausedTime!);
  await page.getByRole("button", { name: "Retomar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pausar", exact: true })).toBeFocused();
  await expect(page.getByRole("radio").first()).toBeEnabled();
  await page.getByRole("button", { name: "Reiniciar", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Continuar aqui", exact: true }).click();
  await expect(page.getByRole("radio").first()).toBeChecked();
  await expect(page.getByRole("button", { name: "Reiniciar", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Reiniciar", exact: true }).click();
  await page.getByRole("button", { name: "Reiniciar sessão", exact: true }).click();
  await expect(page.getByRole("button", { name: "Iniciar sessão", exact: true })).toBeFocused();
  await expect(page.getByRole("timer")).toHaveText("05:00");
  await expect(page.getByRole("radio").first()).not.toBeChecked();
  await page.getByRole("button", { name: "Iniciar sessão", exact: true }).click();
  await page.getByRole("radio").first().check();
  await page.reload();
  await expect(page.getByRole("button", { name: "Iniciar sessão", exact: true })).toBeVisible();
  await expect(page.getByRole("radio").first()).not.toBeChecked();
});

test("deadline expires in the browser without waiting five minutes", async ({ page }) => {
  await page.clock.install();
  await page.goto("/simulador");
  await page.getByRole("button", { name: "Iniciar sessão", exact: true }).click();
  await page.getByRole("radio").first().check();
  await page.clock.fastForward(300_100);
  await expect(page.getByRole("timer")).toHaveText("00:00");
  await expect(page.getByText("Tempo encerrado.", { exact: false })).toBeVisible();
  await expect(page.getByRole("radio").first()).toBeDisabled();
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(page.getByRole("radio").first()).toBeDisabled();
});

test("keyboard selection, reduced motion and narrow layouts remain usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/simulador"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
  await page.evaluate(() => { document.body.style.zoom = "2"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => { document.body.style.zoom = "1"; });
  await page.getByRole("button", { name: "Iniciar sessão", exact: true }).click();
  await page.getByRole("radio").first().focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("radio").first()).toBeChecked();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio").nth(1)).toBeChecked();
});

test("capture desktop and mobile for visual approval", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const viewport of [{ name: "desktop", width: 1440, height: 1100 }, { name: "mobile", width: 360, height: 900 }]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `artifacts/screenshots/dashboard-${viewport.name}.png`, fullPage: true, animations: "disabled" });
    await page.goto("/simulador");
    await page.getByRole("button", { name: "Iniciar sessão", exact: true }).click();
    await page.getByRole("radio").first().check();
    await page.getByRole("button", { name: "Marcar para revisão", exact: true }).click();
    await page.getByRole("button", { name: "Pausar", exact: true }).click();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `artifacts/screenshots/simulador-${viewport.name}.png`, fullPage: true, animations: "disabled" });
  }
  expect(errors).toEqual([]);
});
