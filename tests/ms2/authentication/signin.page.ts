import { Page } from '@playwright/test';
import { openModal, waitForHydration } from '../testUtils';

export class SigninPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await openModal(this.page, () => this.page.goto('/signin'));
  }

  async signinAsGuest() {}

  async signinAsTestUser() {
    await this.goto();
    await this.page.getByRole('button', { name: 'Continue With Test User' }).click();
  }

  async deleteTestUser() {
    await this.page.goto('/profile');
    await waitForHydration(this.page);
    await this.page.getByRole('button', { name: 'Delete Account' }).click();
    await this.page
      .getByLabel('Delete Account')
      .getByRole('button', { name: 'Delete Account' })
      .click();
    await this.page.waitForURL('**/signin*');
  }
}
