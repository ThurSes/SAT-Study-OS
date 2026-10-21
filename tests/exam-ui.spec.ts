import { test, expect } from "@playwright/test";

test("question controls preserve answers, notes, flags, and keyboard navigation", async ({ page }) => {
  await page.goto("/dev/exam-preview?phase=rw1");
  await expect(page.getByRole("heading", { name: "Reading and Writing: Module 1" })).toBeVisible();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Mark for review", exact: true }).click();
  await page.getByRole("button", { name: "Eliminate answer B" }).click();
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await page.getByRole("textbox", { name: "Notes for question 1" }).fill("Check the comparison.");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Notes", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("radio").first()).toBeChecked();
  await expect(page.getByRole("button", { name: "Marked for review", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Restore answer B" })).toBeVisible();
  await page.getByRole("button", { name: "Question 1 of 3" }).click();
  await expect(page.getByRole("button", { name: "Question 1, answered, marked for review" })).toBeVisible();
});

test("transport retry keeps the original idempotency key after a committed response is lost", async ({ page }) => {
  await page.clock.install();
  await page.goto("/dev/exam-preview?phase=rw1&failure=transport");
  await page.getByRole("radio").first().check();
  await expect(page.getByRole("button", { name: "Retry saving" })).toBeVisible();
  await page.clock.runFor(5000);
  const beforeRetry = await page.getByRole("timer").textContent();
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible();
  const lines = (await page.getByTestId("command-log").textContent())!.split("\n").filter((line) => line.startsWith("save:"));
  expect(lines).toHaveLength(2);
  expect(lines[0]).toEqual(lines[1]);
  await page.clock.runFor(500);
  expect((await page.getByRole("timer").textContent())! <= beforeRetry!).toBe(true);
});

test("conflicting edits require explicit reload and restore confirmed answers", async ({ page }) => {
  await page.goto("/dev/exam-preview?phase=rw1&failure=conflict");
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Review recovery options" }).click();
  await page.getByRole("button", { name: "Discard pending changes and reload" }).click();
  await expect(page.getByRole("radio").first()).not.toBeChecked();
  await page.getByRole("radio").nth(1).check();
  await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible();
});

test("numeric preview rejects invalid fractions and calculator has an official fallback", async ({ page }) => {
  await page.goto("/dev/exam-preview?phase=math1");
  const answer = page.getByRole("textbox", { name: "Your answer" });
  await answer.fill("1/0");
  await expect(answer).toHaveAttribute("aria-invalid", "true");
  await answer.fill("1/2");
  await expect(page.getByText("Answer preview: 1/2")).toBeVisible();
  await page.getByRole("button", { name: "Clear answer", exact: true }).click();
  await expect(answer).toHaveValue("");
  await page.getByRole("button", { name: "Calculator", exact: true }).click();
  await expect(page.getByRole("link", { name: "SAT graphing calculator" })).toHaveAttribute("href", /desmos.com\/testing\/collegeboard\/graphing/);
  await page.getByRole("button", { name: "Reference", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Math reference" })).toBeVisible();
  await expect(page.getByText("Right triangle", { exact: true })).toBeVisible();
});

test("deadline reconciliation advances modules, break and final results without early completion", async ({ page }) => {
  await page.clock.install();
  await page.goto("/dev/exam-preview?phase=rw1");
  await page.getByRole("radio").first().check();
  await expect(page.getByTestId("confirmed-answers")).toContainText('"value":"A"');
  for (const title of ["Reading and Writing: Module 2", "Scheduled break", "Math: Module 1", "Math: Module 2"]) {
    await page.clock.runFor(61000);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
  await page.clock.runFor(61000);
  await expect(page.getByRole("heading", { name: "Uma leitura do seu desempenho." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Por habilidade" })).toBeVisible();
});

test("phone viewport reflows without horizontal page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/dev/exam-preview?phase=rw1");
  await expect(page.getByRole("heading", { name: "Question 1", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/exam-mobile.png", fullPage: true });
});

test("invalid numeric drafts remain explicit and cannot silently leave a saved answer", async ({ page }) => {
  await page.goto("/dev/exam-preview?phase=math1");
  const answer = page.getByRole("textbox", { name: "Your answer" });
  await answer.fill("1/2");
  await expect(page.getByTestId("confirmed-answers")).toContainText('"value":"1/2"');
  await answer.fill("1/0");
  await expect(page.getByRole("status").filter({ hasText: "Invalid answer draft" })).toBeVisible();
  await expect(page.getByText("Previously saved answer: 1/2")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Question 1", exact: true })).toBeVisible();
  await expect(answer).toHaveValue("1/0");
  await page.getByRole("button", { name: "Clear answer", exact: true }).click();
  await expect(page.getByTestId("confirmed-answers")).toContainText('"value":null');
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Question 2", exact: true })).toBeVisible();
});

test("delayed saves serialize revisions while preserving newer optimistic edits", async ({ page }) => {
  await page.goto("/dev/exam-preview?phase=rw1&failure=delayed");
  await page.getByRole("radio").first().check();
  await page.getByRole("radio").nth(1).check();
  await page.getByRole("button", { name: "Mark for review", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible();
  await expect(page.getByTestId("confirmed-answers")).toContainText('"value":"B"');
  await expect(page.getByTestId("confirmed-answers")).toContainText('"marked":true');
  const lines = (await page.getByTestId("command-log").textContent())!.split("\n").filter((line) => line.startsWith("save:"));
  expect(lines.length).toBeGreaterThanOrEqual(2);
  expect(lines.map((line) => Number(line.split(":").at(-1)))).toEqual(lines.map((_, index) => index));
});

test("system clock changes do not reset the timer and focus synchronizes with the server", async ({ page }) => {
  await page.clock.install();
  await page.goto("/dev/exam-preview?phase=rw1");
  await page.getByRole("radio").first().check();
  await expect(page.getByTestId("confirmed-answers")).toContainText('"value":"A"');
  await page.clock.setSystemTime(new Date("2040-01-01T00:00:00Z"));
  await page.clock.runFor(1000);
  await expect(page.getByRole("heading", { name: "Reading and Writing: Module 1" })).toBeVisible();
  await expect(page.getByRole("timer")).not.toContainText("00:00");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByTestId("command-log")).toContainText("sync:");
  await page.clock.runFor(61000);
  await expect(page.getByRole("heading", { name: "Reading and Writing: Module 2" })).toBeVisible();
});

test("time observed is saved on navigation even without changing an answer", async ({ page }) => {
  await page.clock.install();
  await page.goto("/dev/exam-preview?phase=rw1");
  await page.getByRole("radio").first().check();
  await expect(page.getByTestId("confirmed-answers")).toContainText('"value":"A"');
  await page.clock.runFor(5000);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect.poll(async () => {
    const answers = JSON.parse((await page.getByTestId("confirmed-answers").textContent())!);
    return answers["b0000000-0000-4000-8000-000000000001"].observedMs;
  }).toBeGreaterThanOrEqual(5000);
});

for (const phase of ["rw1", "math1"]) {
  test(`${phase} visual capture at desktop, 320px and 200% text`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/dev/exam-preview?phase=${phase}`);
    await expect(page.getByRole("heading", { name: "Question 1", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Mark for review", exact: true }).click();
    await expect(page.getByTestId("confirmed-answers")).toContainText('"marked":true');
    if (phase === "math1") await page.getByRole("button", { name: "Calculator", exact: true }).click();
    await page.screenshot({ path: `test-results/exam-${phase}-desktop.png`, fullPage: true, style: "nextjs-portal { visibility: hidden; }" });
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/exam-${phase}-mobile.png`, fullPage: true, style: "nextjs-portal { visibility: hidden; }" });
    await page.setViewportSize({ width: 720, height: 700 });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/exam-${phase}-zoom.png`, fullPage: true, style: "nextjs-portal { visibility: hidden; }" });
  });
}

test("embedded calculator keeps graphing and scientific state across close and answer updates", async ({ page }) => {
  // Explicit local test double; no remote Desmos request or API account is used.
  await page.addInitScript(() => {
    const create = (host: HTMLElement, mode: string) => {
      let state: unknown = {};
      let change: (() => void) | undefined;
      const input = document.createElement("input");
      input.setAttribute("aria-label", `Development ${mode} expression`);
      input.addEventListener("input", () => { state = { expression: input.value }; change?.(); });
      host.append(input);
      return {
        getState: () => state,
        setState: (value: unknown) => { state = value; input.value = (value as { expression?: string })?.expression ?? ""; change?.(); },
        observeEvent: (_: string, callback: () => void) => { change = callback; },
        unobserveEvent: () => { change = undefined; },
        destroy: () => { input.remove(); },
      };
    };
    Object.assign(window, { Desmos: { GraphingCalculator: (host: HTMLElement) => create(host, "graphing"), ScientificCalculator: (host: HTMLElement) => create(host, "scientific") } });
  });
  await page.goto("/dev/exam-preview?phase=math1&desmos=mock");
  await page.getByRole("button", { name: "Calculator", exact: true }).click();
  await page.getByRole("textbox", { name: "Development graphing expression" }).fill("y=x+2");
  await page.getByRole("textbox", { name: "Your answer" }).fill("1/2");
  await expect(page.getByRole("textbox", { name: "Development graphing expression" })).toHaveValue("y=x+2");
  await page.getByRole("button", { name: "Scientific", exact: true }).click();
  await page.getByRole("textbox", { name: "Development scientific expression" }).fill("3*7");
  await page.getByRole("button", { name: "Graphing", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Development graphing expression" })).toHaveValue("y=x+2");
  await page.getByRole("button", { name: "Calculator", exact: true }).click();
  await page.getByRole("button", { name: "Calculator", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Development graphing expression" })).toHaveValue("y=x+2");
  await page.getByRole("button", { name: "Scientific", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Development scientific expression" })).toHaveValue("3*7");
});
