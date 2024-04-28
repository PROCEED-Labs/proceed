import { Locator, Page } from '@playwright/test';
import * as path from 'path';

export class PropertiesPanelPage {
  readonly page: Page;
  readonly generalSection: Locator;
  readonly imageSection: Locator;
  readonly descriptionSection: Locator;
  readonly milestonesSection: Locator;
  readonly customPropertiesSection: Locator;
  processName?: string;
  processDescription?: string;
  processDefinitionID?: string;

  constructor(page: Page) {
    this.page = page;
    this.generalSection = page.getByRole('group', { name: 'General' });
    this.imageSection = page.getByRole('group', { name: 'image-section' });
    this.descriptionSection = page.getByRole('group', { name: 'Description' });
    this.milestonesSection = page.getByRole('group', { name: 'Milestones' });
    this.customPropertiesSection = page.getByRole('group', { name: 'Custom Properties' });
  }

  async goto() {
    if (this.processDefinitionID) {
      await this.page.goto(`/processes/${this.processDefinitionID}`);
    } else {
      await this.page.goto('/processes');
    }
  }

  async login() {
    const page = this.page;
    await page.goto('/');
    await page.getByRole('button', { name: 'Continue as a Guest' }).click();
    await page.waitForURL('**/processes');
  }

  /**
   * Creating a process to test the properties panel in
   * @param options options for the process to be created
   */
  async createProcess(
    options: {
      processName?: string;
      description?: string;
    } = { processName: 'My Process', description: 'Process Description' },
  ) {
    const page = this.page;
    const { processName, description } = options;

    // TODO: reuse other page models for these set ups.
    // Add a new process.
    await page.getByRole('button', { name: 'plus New' }).click();
    await page.getByRole('menuitem', { name: 'file Create Process' }).click();
    await page.getByRole('textbox', { name: '* Process Name :' }).fill('Process Name');
    await page.getByLabel('Process Description').click();
    await page.getByLabel('Process Description').fill('Process Description');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForURL(/\/processes\/([a-zA-Z0-9-_]+)/);

    const pageURL = page.url();
    const match = pageURL.match(/\/processes\/([a-zA-Z0-9-_]+)/);
    this.processDefinitionID = match ? match[1] : null;
    this.processName = processName;
    this.processDescription = description;
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

  async removeAllProcesses() {
    const page = this.page;

    await page.goto('/processes');
    await page.waitForTimeout(1000); // wait until route is loaded
    await page.getByLabel('Select all').check();
    await page.getByRole('button', { name: 'delete' }).first().click();
    await page.getByRole('button', { name: 'OK' }).click();

    // Note: If used in a test, there should be a check for the empty list to
    // avoid double navigations next.

    this.processDefinitionID = undefined;
    this.processName = undefined;
    this.processDescription = undefined;
  }
}
