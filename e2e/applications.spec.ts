import { denyWrites, restoreWrites, dismissWithKeyboard, expect, test } from "./fixtures";

test("add, edit, move, search, reload, and confirm deletion", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add application", exact: true }).click();
  const form = page.getByRole("dialog", { name: "A new opportunity" });
  await form.getByLabel("Company", { exact: true }).fill("Test Company");
  await form.getByLabel("Role", { exact: true }).fill("Frontend Developer");
  await form.getByLabel("Job listing URL", { exact: false }).fill("https://example.com/jobs");
  await form.getByLabel("Deadline", { exact: false }).fill("2030-12-15");
  await form.getByLabel("Notes", { exact: false }).fill("Prepare portfolio walkthrough.");
  await form.getByRole("button", { name: "Save application" }).click();
  const card = page.getByRole("article", { name: "Test Company, Frontend Developer" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Edit", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Update application" });
  await edit.getByLabel("Role", { exact: true }).fill("Product Engineer");
  await edit.getByRole("button", { name: "Save changes" }).click();
  const updated = page.getByRole("article", { name: "Test Company, Product Engineer" });
  await updated.getByRole("combobox", { name: "Move Test Company" }).selectOption("interview");
  await expect(page.getByRole("region", { name: "Interview", exact: true }).getByRole("article", { name: "Test Company, Product Engineer" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search applications" }).fill("test company");
  await page.getByRole("combobox", { name: "Filter by stage" }).selectOption("offer");
  await expect(page.getByText("No applications match your filters.")).toBeVisible();
  await page.getByRole("combobox", { name: "Filter by stage" }).selectOption("interview");
  await expect(updated).toBeVisible();
  await page.reload();
  await expect(updated).toBeVisible();
  await expect(updated.getByRole("combobox", { name: "Move Test Company" })).toHaveValue("interview");
  await updated.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByRole("dialog").getByLabel("Notes", { exact: false })).toHaveValue("Prepare portfolio walkthrough.");
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  await updated.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("dialog", { name: "Delete application?" }).getByRole("button", { name: "Cancel" }).click();
  await expect(updated).toBeVisible();
  await updated.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("dialog", { name: "Delete application?" }).getByRole("button", { name: "Delete application", exact: true }).click();
  await expect(updated).toHaveCount(0);
  await page.reload();
  await expect(updated).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("preserves corrupted storage until explicit confirmed recovery", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("applyflow.applications.v1", "{"));
  await page.goto("/");
  await expect(page.getByRole("alert").filter({ hasText: "Saved data" })).toContainText("Saved data could not be read.");
  await expect(page.getByRole("button", { name: "Add application", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("applyflow.applications.v1"))).toBe("{");
  await page.getByRole("button", { name: "Reset saved data" }).click();
  await page.getByRole("dialog", { name: "Reset saved data?" }).getByRole("button", { name: "Cancel" }).click();
  expect(await page.evaluate(() => localStorage.getItem("applyflow.applications.v1"))).toBe("{");
  await page.getByRole("button", { name: "Reset saved data" }).click();
  await page.getByRole("dialog", { name: "Reset saved data?" }).getByRole("button", { name: "Reset board" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Saved data" })).toHaveCount(0);
  await expect(page.getByText("Your board is ready for its first opportunity.")).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("applyflow.applications.v1") ?? "null") as unknown)).toEqual({ version: 1, applications: [] });
});

test("application and confirmation dialogs contain focus and restore the opener after Escape", async ({ page }) => {
  await page.goto("/");
  await dismissWithKeyboard(page, page.getByRole("button", { name: "Add application", exact: true }), page.getByRole("dialog").getByLabel("Company", { exact: true }));
  await dismissWithKeyboard(page, page.getByRole("button", { name: "Clear sample board", exact: true }), page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }));
});
test("keeps the application draft after failed saving and retries successfully without duplicating it", async ({ page }) => {
  await page.goto("/");
  await denyWrites(page);
  await page.getByRole("button", { name: "Add application", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Company", { exact: true }).fill("Recovery company");
  await page.getByRole("dialog").getByLabel("Role", { exact: true }).fill("Developer");
  await page.getByRole("dialog").getByRole("button", { name: "Save application", exact: true }).click();
  await expect(page.getByRole("dialog").getByLabel("Company", { exact: true })).toHaveValue("Recovery company");
  await restoreWrites(page);
  await page.getByRole("dialog").getByRole("button", { name: "Save application", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("article", { name: "Recovery company, Developer", exact: true })).toHaveCount(1);
});
