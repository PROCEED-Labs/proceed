import { Page, expect } from '@playwright/test';
import { mockClipboardAPI, openModal, waitForHydration } from './testUtils';

export class MS2Page {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async login() {
    await mockClipboardAPI(this.page);
    await this.page.goto('/signin?callbackUrl=/processes');

    const guestSigninButton = this.page.getByRole('button', { name: 'Create a Process' });
    await expect(guestSigninButton).toBeVisible();
    await guestSigninButton.click();

    // url that doesn't contain 'callbackUrl' but has 'processes'
    await this.page.waitForURL(/^(?:(?!callbackUrl).)*?processes/);
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
