import { expect, test } from "@playwright/test";

test("question self-assessment distinguishes three error causes and retains temporary reflection across filters", async ({ page }) => {
  await page.goto("/questoes");
  const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Palavras em contexto", exact: true }) });
  await card.getByText("Autoavaliação temporária", { exact: true }).click();
  const cause = card.getByLabel("Causa percebida do erro", { exact: true });
  await expect(cause.locator("option")).toHaveText(["Ainda não sei", "Interpretação", "Conteúdo", "Falta de atenção"]);
  await cause.selectOption("attention");
  const reflection = card.getByLabel("O que aconteceu e como evitar na próxima vez?", { exact: true });
  await reflection.fill("Reli com pressa. Conferir o sentido da palavra na frase inteira.");
  await card.getByRole("button", { name: "Manter reflexão nesta página", exact: true }).click();
  await expect(card.getByRole("status")).toContainText("apenas nesta página");
  await expect(card.getByRole("status")).toContainText("nenhuma tentativa foi corrigida");
  await expect(card.getByText("Resposta correta", { exact: true })).toHaveCount(0);
  await expect(card.getByRole("radio")).toHaveCount(0);

  await page.getByLabel("Dificuldade da questão", { exact: true }).selectOption("hard");
  await expect(card).toHaveCount(0);
  await page.getByLabel("Dificuldade da questão", { exact: true }).selectOption("all");
  await expect(cause).toHaveValue("attention");
  await expect(reflection).toHaveValue("Reli com pressa. Conferir o sentido da palavra na frase inteira.");
  await cause.selectOption("concept");
  await expect(card.getByRole("status")).toHaveCount(0);
  await cause.selectOption("reading");
  await expect(cause).toHaveValue("reading");

  await page.reload();
  await card.getByText("Autoavaliação temporária", { exact: true }).click();
  await expect(cause).toHaveValue("unknown");
  await expect(reflection).toHaveValue("");
});
