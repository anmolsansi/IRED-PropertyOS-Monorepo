import { test, expect } from "@playwright/test";

test.describe("Proposal Builder Flow", () => {
  test("creates a new proposal from a building page and exports CSV", async ({ page }) => {
    // 1. Navigate to buildings list and wait for load
    await page.goto("/properties/buildings");
    await expect(page).toHaveURL(/\/properties\/buildings/);

    // Click on the first building to go to detail page
    // Using a generic selector for the first building row or card
    const firstBuildingLink = page.locator('a[href^="/properties/buildings/"]').first();
    await expect(firstBuildingLink).toBeVisible();
    await firstBuildingLink.click();

    // 2. In building detail page, click "Add to Proposal"
    const addToProposalBtn = page.getByRole("button", { name: /add to proposal/i });
    await expect(addToProposalBtn).toBeVisible();
    await addToProposalBtn.click();

    // 3. Fill the dialog to create a new proposal
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    
    // Fill client name
    await dialog.getByPlaceholder("e.g. Acme Corp").fill("E2E Test Client");
    // Optional details
    await dialog.getByPlaceholder("e.g. For new regional office").fill("E2E Details");
    
    // Submit
    const createBtn = dialog.getByRole("button", { name: "Create & Add" });
    await createBtn.click();
    
    // Wait for toast
    await expect(page.locator("[data-sonner-toast]")).toContainText(/added to proposal/i);

    // 4. Navigate to the proposals list
    await page.goto("/proposals");
    
    // Click on the newly created proposal
    const proposalLink = page.locator('a:has-text("E2E Test Client")').first();
    await expect(proposalLink).toBeVisible();
    await proposalLink.click();
    
    // 5. In proposal detail page, verify the building is in the table
    // The proposal detail should load the proposal items
    await expect(page.getByRole("heading", { name: /proposal for/i })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();

    // 6. Test column selector
    const columnsBtn = page.getByRole("button", { name: "Columns" });
    await expect(columnsBtn).toBeVisible();
    await columnsBtn.click();
    
    // Uncheck a default column, e.g. "City"
    const cityCheckbox = page.getByLabel("City");
    if (await cityCheckbox.isVisible() && await cityCheckbox.isChecked()) {
      await cityCheckbox.uncheck();
    }
    
    // Close dropdown (click outside or hit escape)
    await page.keyboard.press("Escape");
    
    // 7. Test CSV Export button
    const exportBtn = page.getByRole("button", { name: /export csv/i });
    await expect(exportBtn).toBeVisible();
    
    // Start waiting for download before clicking. Note no await.
    const downloadPromise = page.waitForEvent('download');
    await exportBtn.click();
    const download = await downloadPromise;
    
    // Wait for the download process to complete
    expect(download.suggestedFilename()).toContain("proposal_");
    expect(download.suggestedFilename()).toContain(".csv");
  });
});
