import { Locator, Page } from '@playwright/test';
import * as path from 'path';
import { openModal, closeModal } from '../../../testUtils';

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
    const modal = await openModal(this.page, () =>
      this.page.getByPlaceholder('Planned Duration').click(),
    );

    if (years) {
      await modal.locator('input[name="years"]').fill(`${years}`);
    }

    if (months) {
      await modal.locator('input[name="months"]').fill(`${months}`);
    }

    if (days) {
      await modal.locator('input[name="days"]').fill(`${days}`);
    }

    if (hours) {
      await modal.locator('input[name="hours"]').fill(`${hours}`);
    }

    if (minutes) {
      await modal.locator('input[name="minutes"]').fill(`${minutes}`);
    }

    if (seconds) {
      await modal.locator('input[name="seconds"]').fill(`${seconds}`);
    }

    await closeModal(modal, () => modal.getByRole('button', { name: 'Save' }).click());
  }

  async addMilestone(milestoneValues: { ID: string; name: string; description?: string }) {
    const { ID, name, description } = milestoneValues;
    const milestonesSection = this.milestonesSection;

    const milestonesModal = await openModal(this.page, () =>
      milestonesSection.getByLabel('plus').click(),
    );

    await milestonesModal.getByPlaceholder('Milestone ID').fill(ID);
    await milestonesModal.getByPlaceholder('Milestone Name').fill(name);

    if (description) {
      await milestonesModal
        .locator('.toastui-editor-ww-container > .toastui-editor > .ProseMirror')
        .fill(description);
    }

    await closeModal(milestonesModal, () =>
      milestonesModal.getByRole('button', { name: 'Create Milestone' }).click(),
    );
  }

  async addDescription(descriptionText: string) {
    const descriptionSection = this.descriptionSection;

    const descriptionViewer = descriptionSection.getByRole('textbox', {
      name: 'description-viewer',
    });
    const isDescriptionViewerVisible = await descriptionViewer.isVisible();

    const modal = await openModal(this.page, () =>
      (isDescriptionViewerVisible
        ? descriptionViewer
        : descriptionSection.getByRole('button', {
            name: 'Add Description',
          })
      ).click(),
    );

    if (isDescriptionViewerVisible) {
      const initialDescription = await descriptionViewer.textContent();
      // wait for the editor to be fully loaded
      await modal
        .locator('.toastui-editor-ww-container > .toastui-editor > .ProseMirror')
        .getByText(initialDescription)
        .waitFor({ state: 'visible' });
    }

    await modal
      .locator('.toastui-editor-ww-container > .toastui-editor > .ProseMirror')
      .fill(descriptionText);

    await closeModal(modal, () => modal.getByRole('button', { name: 'Save' }).click());
  }

  async addCustomProperty(name: string, value: string) {
    const customPropertiesSection = this.customPropertiesSection;

    await customPropertiesSection.getByPlaceholder('Custom Name').fill(name);
    await customPropertiesSection.getByPlaceholder('Custom Value').fill(value);
    await customPropertiesSection.getByPlaceholder('Custom Value').blur();
  }
}
