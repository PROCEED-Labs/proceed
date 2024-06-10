import { Page } from '@playwright/test';

export class MS2Page {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async login() {
    await this.page.goto('/');
    await this.page.getByRole('button', { name: 'Continue as a Guest' }).click();
    await this.page.waitForURL('**/processes');
  }
}
