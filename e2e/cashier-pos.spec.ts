import { expect, test } from "@playwright/test";

test.describe("POS keyboard flow", () => {
  test("F2 focuses search", async ({ page }) => {
    await page.goto("/");
    const search = page.getByPlaceholder("Сканируйте штрихкод или ищите товар");
    await expect(search.first()).toBeVisible();
    await page.keyboard.press("F2");
    await expect(search.first()).toBeFocused();
  });

  test("opens quick products and closes by Esc", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("F4");
    const modalTitle = page.getByText("Быстрые товары");
    await expect(modalTitle.first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(modalTitle.first()).not.toBeVisible();
  });
});
