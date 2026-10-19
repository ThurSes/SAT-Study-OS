import { expect, test } from "@playwright/test";

test("public lessons cover both sections, reveal worked examples and preserve unsaved notes across filters", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/conteudos");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Entenda antes de acelerar.");
  await expect(page.getByRole("status").filter({ hasText: "32 de 32 aulas" })).toBeVisible();
  const card = page.getByRole("article").first();
  await card.locator("summary").click();
  await expect(card.getByRole("heading", { name: "Exemplo resolvido" })).toBeVisible();
  await card.getByLabel("Minhas notas").fill("Vou preservar os qualificadores do texto.");
  await expect(card.getByRole("button", { name: "Salvar notas e progresso" })).toBeDisabled();
  await page.getByLabel("Seção", { exact: true }).selectOption("math");
  await expect(page.getByRole("status").filter({ hasText: "21 de 32 aulas" })).toBeVisible();
  await page.getByLabel("Seção", { exact: true }).selectOption("rw");
  await expect(card.getByLabel("Minhas notas")).toHaveValue("Vou preservar os qualificadores do texto.");
  await page.getByLabel("Buscar conteúdo").fill("zzzzzzzzzz");
  await expect(page.getByRole("heading", { name: "Nenhuma aula encontrada" })).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  expect(errors).toEqual([]);
});

test("login offers signup and recovery with safe redirects and accessible controls", async ({ page }) => {
  await page.goto("/login?next=//example.invalid");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bom ter você por aqui.");
  await expect(page.locator('input[name="next"]')).toHaveValue("/");
  await page.getByRole("button", { name: "Criar uma conta", exact: true }).click();
  await expect(page.getByLabel("Seu nome", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute("autocomplete", "new-password");
  await page.getByRole("button", { name: "Esqueci minha senha" }).click();
  await expect(page.getByRole("button", { name: "Enviar link" })).toBeVisible();
  await expect(page.getByLabel("Senha", { exact: true })).toHaveCount(0);
});

test("configured personal areas require login and callback rejects external redirects", async ({ page, request }) => {
  await page.goto("/estudos");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Bom ter você por aqui\.|Seu estudo, com intenção\./);
  test.skip(!new URL(page.url()).pathname.startsWith("/login"), "Requires a configured Supabase project; demonstration mode has no account.");
  for (const path of ["/", "/estudos", "/historico", "/erros", "/questoes", "/simulador", "/recuperar"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bom ter você por aqui.");
  }
  const response = await request.get("/auth/callback?next=//example.invalid", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe("http://127.0.0.1:3000/login?error=link");
});

test("content and login reflow in light and dark modes", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    await page.addInitScript(value => localStorage.setItem("sat-study-os.theme", value), theme);
    for (const width of [320, 360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const path of ["/conteudos", "/login"]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if ((width === 360 && theme === "dark") || (width === 1440 && theme === "light")) await page.screenshot({ path: `artifacts/screenshots/${path.slice(1)}-${theme}-${width}.png`, fullPage: true, animations: "disabled", caret: "initial" });
      }
    }
  }
});
