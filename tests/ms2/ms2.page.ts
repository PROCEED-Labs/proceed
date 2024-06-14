import { Page } from '@playwright/test';
import { openModal } from './testUtils';

export class MS2Page {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async login() {
    const modal = await openModal(async () => {
      this.page.goto('/');
    }, this.page);
    await modal.getByRole('button', { name: 'Continue as a Guest' }).click();
    await this.page.waitForURL('**/processes');
  }
}
