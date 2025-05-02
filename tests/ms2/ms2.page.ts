import { Page } from '@playwright/test';
import { mockClipboardAPI, openModal, waitForHydration } from './testUtils';

export class MS2Page {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async login() {
    await mockClipboardAPI(this.page);
    const modal = await openModal(this.page, async () => {
      this.page.goto('/signin?callbackUrl=/processes');
    });
    await modal.getByRole('button', { name: 'Create a Process' }).click();
    await this.page.waitForURL('**/processes');
  }

  async readClipboard(readAsText) {
    const { page } = this;
    const result = await page.evaluate(async (readAsText) => {
      if (readAsText) {
        return await navigator.clipboard.readText();
      } else {
        const clipboardItems = await navigator.clipboard.read();
        return clipboardItems[0].types[0];
      }
    }, readAsText);

    return result;
  }

  async deleteUser() {
    const page = this.page;

    await page.goto('/profile');
    await waitForHydration(page);

    await openModal(page, () => page.getByRole('button', { name: 'Delete Data' }).click());
    await page.getByRole('button', { name: 'Delete Account' }).click();

    await page.waitForURL('**/signin*');
  }
}
