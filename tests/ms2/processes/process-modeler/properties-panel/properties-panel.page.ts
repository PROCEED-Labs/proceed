import { Locator, Page } from '@playwright/test';
import * as path from 'path';

export class PropertiesPanelPage {
  readonly page: Page;
  readonly generalSection: Locator;
  readonly imageSection: Locator;
  readonly descriptionSection: Locator;
  readonly milestonesSection: Locator;
  readonly customPropertiesSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.generalSection = page.getByRole('group', { name: 'General' });
    this.imageSection = page.getByRole('group', { name: 'image-section' });
    this.descriptionSection = page.getByRole('group', { name: 'Description' });
    this.milestonesSection = page.getByRole('group', { name: 'Milestones' });
    this.customPropertiesSection = page.getByRole('group', { name: 'Custom Properties' });
  }

  async addImage(imageFileName: string) {
    const page = this.page;
    const imageSection = this.imageSection;

    const fileChooserPromise = page.waitForEvent('filechooser');
    await imageSection.getByText('Add Image').click();
    const fileChooser = await fileChooserPromise;
    const imagePath = path.join(__dirname, imageFileName);
    await fileChooser.setFiles(imagePath);

    await page.waitForTimeout(1000); // wait until image is loaded
  }

  async editPlannedDuration(durationValues: {
    years?: number;
    months?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
  }) {
    const { years, months, days, hours, minutes, seconds } = durationValues;
    const page = this.page;
    await page.getByTestId('plannedDurationInputEdit').click();

    if (years) {
      await page.locator('input[name="years"]').fill(`${years}`);
    }

    if (months) {
      await page.locator('input[name="months"]').fill(`${months}`);
    }

    if (days) {
      await page.locator('input[name="days"]').fill(`${days}`);
    }

    if (hours) {
      await page.locator('input[name="hours"]').fill(`${hours}`);
    }

    if (minutes) {
      await page.locator('input[name="minutes"]').fill(`${minutes}`);
    }

    if (seconds) {
      await page.locator('input[name="seconds"]').fill(`${seconds}`);
    }

    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(500);
  }

  async addMilestone(milestoneValues: { ID: string; name: string; description?: string }) {
    const { ID, name, description } = milestoneValues;
    const page = this.page;
    const milestonesSection = this.milestonesSection;

    await milestonesSection.getByLabel('plus').click();
    await page.waitForTimeout(1000); // wait until modal loaded
    const milestonesModal = page.getByLabel('Create new Milestone');
    await milestonesModal.getByPlaceholder('Milestone ID').fill(ID);
    await milestonesModal.getByPlaceholder('Milestone Name').fill(name);

    if (description) {
      await milestonesModal
        .locator('.toastui-editor-ww-container > .toastui-editor > .ProseMirror')
        .fill(description);
    }

    await milestonesModal.getByRole('button', { name: 'Create Milestone' }).click();
    await page.waitForTimeout(1000); // wait until milestone modal is closed
  }

  async addDescription(descriptionText: string) {
    const page = this.page;
    const descriptionSection = this.descriptionSection;

    await descriptionSection.getByLabel('edit').click(); // click edit description button
    await page
      .locator('.toastui-editor-ww-container > .toastui-editor > .ProseMirror')
      .fill(descriptionText);
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(1000); // wait until description dialog is closed
  }

  async addCustomProperty(name: string, value: string) {
    const page = this.page;
    const customPropertiesSection = this.customPropertiesSection;

    await customPropertiesSection.getByPlaceholder('Custom Name').fill(name);
    await customPropertiesSection.getByPlaceholder('Custom Value').fill(value);
    await customPropertiesSection.locator('form').getByRole('button', { name: 'plus' }).click();
    await page.waitForTimeout(500);
  }
}
