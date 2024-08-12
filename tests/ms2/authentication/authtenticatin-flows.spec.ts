import { Locator, mergeExpects } from '@playwright/test';
import { closeModal, getSigninLink, openModal, waitForHydration } from '../testUtils';
import { expect, test } from './signin.fitxtures';

test('Transfer processes from guest', async ({ signinPage, ms2Page, processListPage }) => {
  const page = signinPage.page;

  // Sign in as guest
  await ms2Page.login();

  // Create guest assets
  const process1 = await processListPage.createProcess({
    processName: 'guest: process 1',
    returnToProcessList: true,
  });
  const process2 = await processListPage.createProcess({
    processName: 'guest: process 2',
    returnToProcessList: true,
  });

  const folderName = crypto.randomUUID();
  await processListPage.createFolder({ folderName });
  const folderLocator = processListPage.folderLocatorByName(folderName);
  await folderLocator.click();
  await waitForHydration(page);

  const process3 = await processListPage.createProcess({ processName: 'guest: process 3' });
  await processListPage.goto();
  await folderLocator.click();
  await waitForHydration(page);
  await expect(processListPage.processLocatorByDefinitionId(process3)).toBeVisible();

  // Sign in to an authenticated user
  await signinPage.signinAsTestUser();

  // Transfer processes
  await page.waitForURL('**/transfer-processes*');
  await waitForHydration(page);
  await page.getByRole('button', { name: 'Yes' }).click();
  // wait for redirect
  await page.waitForURL(/^(?!.*trasnfer-processes).*$/);

  // Verify that the guest assets where transferred
  await processListPage.goto();

  await expect(processListPage.processLocatorByDefinitionId(process1)).toBeVisible();
  await expect(processListPage.processLocatorByDefinitionId(process2)).toBeVisible();
  await expect(folderLocator).toBeVisible();
  await folderLocator.click();
  await waitForHydration(page);
  await expect(processListPage.processLocatorByDefinitionId(process3)).toBeVisible();
});

test("Don't Transfer processes from guest", async ({ signinPage, ms2Page, processListPage }) => {
  const page = signinPage.page;

  // Sign in as guest
  await ms2Page.login();

  // Create guest assets
  const process1 = await processListPage.createProcess({
    processName: 'guest: process 1',
    returnToProcessList: true,
  });
  const process2 = await processListPage.createProcess({
    processName: 'guest: process 2',
    returnToProcessList: true,
  });

  const folderName = crypto.randomUUID();
  await processListPage.createFolder({ folderName });
  const folderLocator = processListPage.folderLocatorByName(folderName);
  await folderLocator.click();
  await waitForHydration(page);

  const process3 = await processListPage.createProcess({ processName: 'guest: process 3' });
  await processListPage.goto();
  await folderLocator.click();
  await waitForHydration(page);
  await expect(processListPage.processLocatorByDefinitionId(process3)).toBeVisible();

  // Sign in to an authenticated user
  await signinPage.signinAsTestUser();

  // Transfer processes
  await page.waitForURL('**/transfer-processes*');
  await waitForHydration(page);
  await page.getByRole('button', { name: 'No' }).click();
  // wait for redirect
  await page.waitForURL(/^(?!.*trasnfer-processes).*$/);

  // Verify that the guest assets where transferred
  await processListPage.goto();

  await expect(processListPage.processLocatorByDefinitionId(process1)).not.toBeVisible();
  await expect(processListPage.processLocatorByDefinitionId(process2)).not.toBeVisible();
  await expect(folderLocator).not.toBeVisible();
});

test('Sign in with E-mail', async ({ signinPage }) => {
  const page = signinPage.page;

  await openModal(page, () => page.goto('/signin'));

  const sentDate = new Date();
  await page.getByPlaceholder('E-Mail').fill(process.env.TEST_EMAIL);
  await page.getByRole('button', { name: 'Continue with E-Mail' }).click();

  const signInLink = await getSigninLink(sentDate);

  // It could be the case that the email already had a profile
  page.goto(signInLink);

  await new Promise((res) => setTimeout(res, 7000));
  const profileModal = page
    .locator(`div[aria-modal="true"]:not(.ant-zoom)`)
    .getByText('You need to complete your profile')
    .first();
  const newUser = await profileModal.isVisible();

  if (newUser) {
    await page.getByLabel('First Name').fill('Test');
    await page.getByLabel('Last Name').fill('User');
    await page.getByLabel('Username').fill(`${crypto.randomUUID().slice(0, 35)}`);

    await closeModal(profileModal, () => page.getByRole('button', { name: 'Submit' }).click());
  }

  await page.goto('/profile');
  await waitForHydration(page);

  await expect(page.getByRole('cell', { name: process.env.TEST_EMAIL })).toBeVisible();
});
