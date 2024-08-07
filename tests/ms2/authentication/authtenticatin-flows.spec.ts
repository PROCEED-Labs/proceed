import { waitForHydration } from '../testUtils';
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
