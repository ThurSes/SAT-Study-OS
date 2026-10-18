import { test, expect } from "@playwright/test";

test("studies support local creation, status, notes and agenda without claiming persistence", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Estudos", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Seu estudo, com intenção.", { timeout: 30_000 });
  await page.getByRole("button", { name: "Iniciar Leitura com intenção", exact: true }).click();
  await expect(page.getByRole("button", { name: "Concluir Leitura com intenção", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Concluir Leitura com intenção", exact: true }).click();
  await expect(page.getByRole("button", { name: "Reabrir Leitura com intenção", exact: true })).toBeFocused();
  await page.getByLabel("Seção", { exact: true }).selectOption("math");
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.getByRole("button", { name: "Limpar filtros", exact: true }).first().click();
  await page.getByRole("button", { name: "Planejar atividade", exact: true }).click();
  const form = page.getByRole("form", { name: "Nova atividade" });
  await form.getByLabel("Título da atividade").fill("Minha atividade local");
  await form.getByLabel("Habilidade", { exact: true }).selectOption({ label: "Math · Equações lineares" });
  await form.getByLabel("Data", { exact: true }).fill("2026-10-21");
  await form.getByLabel("Duração (min)", { exact: true }).fill("35");
  await form.getByLabel("Recurso de estudo (URL opcional)").fill("javascript:alert(1)");
  await form.getByRole("button", { name: "Adicionar nesta página", exact: true }).click();
  await expect(form.getByRole("alert")).toContainText("https://");
  await form.getByLabel("Recurso de estudo (URL opcional)").fill("");
  await form.getByRole("button", { name: "Adicionar nesta página", exact: true }).click();
  const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Minha atividade local", exact: true }) });
  await expect(card).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Minha atividade local", exact: true })).toBeVisible();
  await card.getByText("Ajustar duração e notas", { exact: false }).click();
  await card.getByLabel("Notas da atividade", { exact: true }).fill("Conferir a resposta por substituição.");
  await card.getByRole("button", { name: "Aplicar nesta página", exact: true }).click();
  await expect(card.getByRole("paragraph").filter({ hasText: "Conferir a resposta por substituição." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Agenda das atividades", exact: true })).toBeVisible();
  await page.getByLabel("Buscar atividades", { exact: true }).fill("Conferir a resposta por substituição.");
  await card.getByLabel("Notas da atividade", { exact: true }).fill("Revisar os passos da resolução.");
  await card.getByRole("button", { name: "Aplicar nesta página", exact: true }).click();
  await expect(page.getByLabel("Buscar atividades", { exact: true })).toBeFocused();
  await expect(page.getByRole("article")).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "atualizadas apenas nesta página" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Minha atividade local", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Iniciar Leitura com intenção", exact: true })).toBeVisible();
});

test("question bank filters and reveals text without answer keys", async ({ page }) => {
  await page.goto("/questoes");
  await expect(page.getByRole("article")).toHaveCount(5);
  await page.getByLabel("Seção", { exact: true }).selectOption("math");
  await expect(page.getByRole("heading", { name: "Ainda não há questões de Math.", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros", exact: true }).first().click();
  await page.getByLabel("Dificuldade da questão", { exact: true }).selectOption("hard");
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.getByText("Consultar texto e alternativas da questão 5", { exact: true }).click();
  await expect(page.getByRole("list", { name: "Alternativas da questão" }).getByRole("listitem")).toHaveCount(4);
  await expect(page.getByText("Resposta correta", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("radio")).toHaveCount(0);
  await page.getByRole("link", { name: "Abrir sessão curta", exact: true }).click();
  await expect(page.getByRole("button", { name: "Iniciar sessão", exact: true })).toBeVisible();
});

test("history preserves assessment origins and validates a temporary printed result", async ({ page }) => {
  await page.goto("/historico");
  await expect(page.getByRole("article")).toHaveCount(3);
  await page.getByLabel("Filtrar por origem", { exact: true }).selectOption("experimental");
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("article")).toContainText("7/10");
  await page.getByText("Adicionar avaliação externa", { exact: true }).click();
  await page.getByLabel("Nome da avaliação", { exact: true }).fill("Minha avaliação local");
  await page.getByLabel("Data da avaliação", { exact: true }).fill("2026-10-18");
  await page.getByLabel("Origem do novo registro", { exact: true }).selectOption("printed_estimate");
  await page.getByLabel("Reading and Writing (200–800)", { exact: true }).fill("199");
  await page.getByLabel("Math (200–800)", { exact: true }).fill("700");
  await page.getByLabel("Material e edição", { exact: true }).fill("Caderno pessoal, edição 1");
  await page.getByLabel("Método de conversão utilizado", { exact: true }).fill("Tabela da edição 1");
  await page.getByRole("button", { name: "Adicionar nesta página", exact: true }).click();
  expect(await page.getByLabel("Reading and Writing (200–800)", { exact: true }).evaluate((input: HTMLInputElement) => input.validity.rangeUnderflow)).toBe(true);
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.getByLabel("Reading and Writing (200–800)", { exact: true }).fill("700");
  await page.getByRole("button", { name: "Adicionar nesta página", exact: true }).click();
  const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Minha avaliação local", exact: true }) });
  await expect(card).toContainText("1400");
  await expect(card).toContainText("Estimativa · material impresso");
  await card.getByText("Detalhes de Minha avaliação local", { exact: true }).click();
  await expect(card.getByText("Tabela da edição 1", { exact: false })).toBeVisible();
  await page.getByLabel("Filtrar por origem", { exact: true }).selectOption("experimental");
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Minha avaliação local", exact: true })).toHaveCount(0);
});

test("error review preserves the original answer and local review is not duplicated", async ({ page }) => {
  await page.goto("/erros");
  await page.getByLabel("Filtrar revisões", { exact: true }).selectOption("due");
  await expect(page.getByRole("article")).toHaveCount(2);
  const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Inferências", exact: true }) });
  await card.getByText("Revisar erro de Inferências", { exact: true }).click();
  await expect(card.getByText("The gardens were located in the same city.", { exact: true })).toBeVisible();
  await card.getByLabel("O que vou fazer diferente?", { exact: true }).fill("Relacionar a alternativa à hipótese.");
  await card.getByRole("button", { name: "Aplicar reflexão local", exact: true }).click();
  await expect(card.getByText("The gardens were located in the same city.", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Marcar como revisado", exact: true }).click();
  await expect(page.getByLabel("Filtrar revisões", { exact: true })).toBeFocused();
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.getByLabel("Filtrar revisões", { exact: true }).selectOption("reviewed");
  await expect(page.getByRole("article")).toHaveCount(1);
  await card.getByText("Revisar erro de Inferências", { exact: true }).click();
  await expect(card.getByRole("button", { name: "Revisado nesta página", exact: true })).toBeDisabled();
  await expect(card.getByRole("list", { name: "Histórico de revisões" }).getByRole("listitem")).toHaveCount(1);
  await page.reload();
  await page.getByLabel("Filtrar revisões", { exact: true }).selectOption("reviewed");
  await expect(page.getByRole("article")).toHaveCount(0);
  await page.getByLabel("Filtrar revisões", { exact: true }).selectOption("all");
  await page.getByLabel("Filtrar por causa", { exact: true }).selectOption("reading");
  await card.getByText("Revisar erro de Inferências", { exact: true }).click();
  await card.getByLabel("Causa do erro", { exact: true }).selectOption("concept");
  await card.getByRole("button", { name: "Aplicar reflexão local", exact: true }).click();
  await expect(page.getByLabel("Filtrar por causa", { exact: true })).toBeFocused();
  await expect(page.getByRole("article")).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Reflexão aplicada apenas nesta página" })).toBeVisible();
  await page.getByLabel("Filtrar por causa", { exact: true }).selectOption("all");
  await page.getByLabel("Buscar no diário", { exact: true }).fill("Escolhi uma informação verdadeira");
  await card.getByText("Revisar erro de Inferências", { exact: true }).click();
  await card.getByLabel("O que vou fazer diferente?", { exact: true }).fill("Conferir a evidência da hipótese.");
  await card.getByRole("button", { name: "Aplicar reflexão local", exact: true }).click();
  await expect(page.getByLabel("Buscar no diário", { exact: true })).toBeFocused();
  await expect(page.getByRole("article")).toHaveCount(0);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`expanded navigation and ${colorScheme} layouts reflow and render without errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    for (const width of [320, 360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const [path, label] of [["/estudos", "Estudos"], ["/questoes", "Questões"], ["/erros", "Diário de erros"], ["/historico", "Histórico"]]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.getByRole("navigation", { name: "Navegação principal", exact: true }).getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${path} ${width}`).toBe(true);
        if ((width === 1440 && colorScheme === "light") || (width === 360 && colorScheme === "dark")) {
          await page.evaluate(() => document.fonts.ready);
          await page.screenshot({ path: `artifacts/screenshots/${path.slice(1)}-${colorScheme}-${width}.png`, fullPage: true, animations: "disabled", caret: "initial" });
        }
      }
    }
    expect(errors).toEqual([]);
  });
}
