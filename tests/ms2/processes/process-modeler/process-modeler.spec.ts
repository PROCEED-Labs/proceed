import { Browser, Page, chromium, firefox } from '@playwright/test';
import { test, expect } from '../processes.fixtures';
import { openModal, closeModal } from '../../testUtils';

test('process modeler', async ({ processModelerPage, processListPage }) => {
  const { page } = processModelerPage;
  const definitionId = await processListPage.createProcess({ processName: 'Process Name' });

  // Open/close XML Viewer
  let modal = await openModal(page, () => page.getByRole('button', { name: 'xml-sign' }).click());
  await expect(page.getByRole('dialog', { name: 'BPMN XML' })).toBeVisible();
  /* While the xml editor is there, the xml is still loading, wait for it to load, before closing the modal */
  await expect(page.getByText('<?xml version="1.0" encoding')).toBeVisible();
  //todo: check xml for startevent
  await closeModal(modal, async () => await modal.getByRole('button', { name: 'Ok' }).click());

  // Open/collapse/close properties panel
  const propertiesPanel = page.getByRole('region', { name: 'Properties' });
  const openPropertiesPanelButton = page.getByRole('button', {
    name: 'info-circle',
  });
  await openPropertiesPanelButton.click();
  await expect(propertiesPanel).toBeVisible();
  await page.getByRole('button', { name: 'double-right' }).click();
  const propertiesPanelBoundingBox = await propertiesPanel.boundingBox();
  expect(propertiesPanelBoundingBox.width).toEqual(40);
  await openPropertiesPanelButton.click(); // click again to close properties panel
  await expect(propertiesPanel).not.toBeVisible();

  // Open/close version creation dialog
  const openVersionCreationDialog = page
    .getByLabel('general-modeler-toolbar')
    .getByRole('button', { name: 'plus' });
  modal = await openModal(page, () => openVersionCreationDialog.click());
  const versionCreationDialog = page.getByRole('dialog', {
    name: 'Create New Version',
  });
  await expect(versionCreationDialog).toBeVisible();
  await closeModal(modal, () => modal.getByRole('button', { name: 'Cancel' }).click());
  await expect(versionCreationDialog).not.toBeVisible();
  modal = await openModal(page, () => openVersionCreationDialog.click());
  await closeModal(modal, () => modal.getByRole('button', { name: 'Close' }).click());
  await expect(versionCreationDialog).not.toBeVisible();

  // Fill version creation dialog and create new version
  const stringWith150Chars =
    'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam volu';
  modal = await openModal(page, () => openVersionCreationDialog.click());
  const versionCreationSubmitButton = modal.getByRole('button', {
    name: 'Create Version',
  });
  await expect(versionCreationSubmitButton).toBeDisabled();
  await modal.getByPlaceholder('Version Name').fill('Version 1');
  await expect(versionCreationSubmitButton).toBeDisabled();
  await modal
    .getByPlaceholder('Version Description')
    .fill(`${stringWith150Chars}, characaters passing the 150 mark should not be visible`);
  await expect(page.getByPlaceholder('Version Description')).toHaveText(stringWith150Chars);
  await expect(versionCreationSubmitButton).toBeEnabled();
  await closeModal(modal, () => versionCreationSubmitButton.click());

  // Select newly created version to view its BPMN and check for URL change
  const versionSelectMenu = page.getByText('Latest Version');
  await versionSelectMenu.click();
  await expect(page.getByRole('option', { name: 'Latest Version' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Version 1' })).toBeVisible();
  await page.getByRole('option', { name: 'Version 1' }).click();
  const expectedURLWithVersion = new RegExp(
    `\\/processes\\/${definitionId}\\?version=[a-zA-Z0-9-_]+$`,
  );
  await page.waitForURL(expectedURLWithVersion);
  expect(expectedURLWithVersion.test(page.url())).toBeTruthy();

  // Open/close process select menu and process creation dialog
  const processSelectMenu = page.getByTitle('Process List');

  await processSelectMenu.click();
  await expect(page.getByRole('option', { name: 'Process Name' })).toBeVisible();

  const openProcessCreationDialogButton = page.getByRole('button', {
    name: 'Create new process',
  });
  let processCreationDialog = await openModal(page, () => openProcessCreationDialogButton.click());
  await expect(processCreationDialog).toBeVisible();
  await closeModal(processCreationDialog, () =>
    processCreationDialog.getByRole('button', { name: 'Cancel' }).click(),
  );
  await expect(processCreationDialog).not.toBeVisible();
  await processSelectMenu.click();
  processCreationDialog = await openModal(page, () => openProcessCreationDialogButton.click());
  await closeModal(processCreationDialog, () =>
    processCreationDialog.getByRole('button', { name: 'Close' }).click(),
  );
  await expect(processCreationDialog).not.toBeVisible();
  await processSelectMenu.click();
  processCreationDialog = await openModal(page, () => openProcessCreationDialogButton.click());

  // Fill process creation dialog and create new process, check for url change
  await processCreationDialog.getByLabel('Process Name').fill('New Process');
  await processCreationDialog
    .getByLabel('Process Description')
    .fill(`${stringWith150Chars}, characaters passing the 150 mark should not be visible`);
  await expect(processCreationDialog.getByLabel('Process Description')).toHaveText(
    stringWith150Chars,
  );
  await closeModal(processCreationDialog, () =>
    processCreationDialog.getByRole('button', { name: 'Create' }).click(),
  );
  const expectedURLNewProcess = new RegExp(`\\/processes\\/[a-zA-Z0-9-_]+`);
  await page.waitForURL((url) => {
    return url.pathname.match(expectedURLNewProcess) && !url.pathname.includes(definitionId);
  });
  expect(expectedURLNewProcess.test(page.url())).toBeTruthy();
  const newDefinitionID = page.url().split('/processes/').pop();
  expect(newDefinitionID).not.toEqual(definitionId);

  // Not only wait for URL change, but also new content to be loaded.
  await page.getByText('New Process').waitFor({ state: 'visible' });

  // Create subprocess and navigate
  await processModelerPage.createSubprocess();
  const openSubprocessButton = page.locator('.bjs-drilldown');
  await expect(openSubprocessButton).toBeVisible();
  await openSubprocessButton.click();
  const expectedURLSubprocess = new RegExp(
    `\\/processes\\/[a-zA-Z0-9-_]+\\?subprocess\\=[a-zA-Z0-9-_]+`,
  );
  await page.waitForURL(expectedURLSubprocess);
  expect(expectedURLSubprocess.test(page.url())).toBeTruthy();
  const newSubprocessDefinitionID = page.url().split('/processes/').pop();
  expect(newSubprocessDefinitionID).not.toEqual(definitionId);
});

test.describe('Shortcuts in Modeler', () => {
  test.beforeEach(async ({ processListPage }) => {
    await processListPage.createProcess();
  });

  test('close modeler / go to process list with shortcut', async ({ processModelerPage }) => {
    const { page } = processModelerPage;

    /* Close modeler */
    await page.getByRole('main').press('Escape');
    await page.getByRole('main').press('Escape');

    /* Wait for navigation change */
    await page.waitForURL(/\/processes$/);

    // await processModelerPage.waitForHydration();

    /* Check if back at Process-List */
    // await expect(page.url(), 'Could not close modeler with shortcut (2*esc)').toMatch(
    //   /\/processes$/,
    // );
  });

  /* ctrl / meta + enter */
  test('open Property-Panel with shortcut', async ({ processModelerPage }) => {
    const { page } = processModelerPage;

    /* Open Modal */
    await page.getByRole('main').press('ControlOrMeta+Enter');

    /* Check if Property-Panel is open */
    await expect(
      page.getByRole('region', { name: 'Properties' }),
      'Property-Panel should be openable via shortcuts',
    ).toBeVisible();

    /* Close via esc */
    await page.getByRole('main').press('Escape');

    /* Check if panel closed */
    await expect(
      page.getByRole('region', { name: 'Properties' }),
      'Property-Panel should be closeable via shortcuts',
    ).not.toBeVisible();
  });

  test('open Share-Modal with shortcut', async ({ processModelerPage }) => {
    const { page } = processModelerPage;

    const modal = await openModal(page, () => page.getByRole('main').press('Shift+Enter'));

    /* Check if Share-Modal is open */
    await expect(modal, 'Share-Modal should be openable via shortcuts').toBeVisible();

    /* Check if correct modal opened */
    let modalTitle = await modal.locator('div[class="ant-modal-title"]');
    await expect(modalTitle, 'Could not ensure that the correct modal opened').toHaveText(/share/i);

    /* Change between tabs */
    // TODO:
    /* --------------- */

    /* --------------- */

    await closeModal(modal, () => page.getByRole('main').press('Escape'));

    /* Check if modal closed */
    await expect(modal, 'Share-Modal should be closeable via shortcuts').not.toBeVisible();
  });

  test('open XML with shortcut', async ({ processModelerPage }) => {
    const { page } = processModelerPage;

    /* Open XML with ctrl / meta + x */
    let modal = await openModal(page, () => page.locator('body').press('ControlOrMeta+x'));

    /* Check if XML-Modal is open */
    await expect(modal, 'XML-Modal should be openable via shortcuts').toBeVisible();

    /* Check if correct modal opened */
    let modalTitle = await modal.locator('div[class="ant-modal-title"]');
    await expect(modalTitle, 'Could not ensure that the correct modal opened').toHaveText(/xml/i);

    /* Close Modal */
    await closeModal(modal, () => page.locator('body').press('Escape'));

    /* Check if modal closed */
    await expect(modal, 'XML-Modal should be closeable via shortcuts').not.toBeVisible();
  });

  /* ctrl / meta + e */
  test('open Export-Modal with shortcut', async ({ processModelerPage }) => {
    const { page } = processModelerPage;

    /* Open Export-Modal with ctrl / meta + e */
    // await page.getByRole('main').press('ControlOrMeta+E');
    let modal = await openModal(page, () => page.locator('body').press('ControlOrMeta+e'));

    /* Check if Export-Modal is open */
    await expect(modal, 'Export-Modal should be openable via shortcuts').toBeVisible();

    /* Check if correct modal opened */
    let modalTitle = await modal.locator('div[class="ant-modal-title"]');
    await expect(modalTitle, 'Could not ensure that the correct modal opened').toHaveText(
      /export/i,
    );

    /* Close Modal */
    // await page.locator('body').press('Escape');
    await closeModal(modal, () => page.getByRole('main').press('Escape'));

    /* Check if modal closed */
    await expect(modal, 'Export-Modal should be closeable via shortcuts').not.toBeVisible();
  });
});

test('share-modal', async ({ processListPage, ms2Page }) => {
  const { page } = processListPage;

  let clipboardData: string;

  const { definitionId: process1Id } = await processListPage.importProcess('process1.bpmn');
  // open the new process in the modeler
  await page.locator(`tr[data-row-key="${process1Id}"]>td:nth-child(3)`).click();

  await page.waitForURL(/processes\/[a-z0-9-_]+/);

  const modal = await openModal(page, () =>
    page.getByRole('button', { name: 'share-alt' }).click(),
  );

  //await expect(page.getByText('Share', { exact: true })).toBeVisible();

  /*************************** Embed in Website ********************************/

  await modal.getByRole('button', { name: 'Embed in Website' }).click();
  await expect(modal.getByText('Allow iframe Embedding', { exact: true })).toBeVisible();
  await modal.getByRole('checkbox', { name: 'Allow iframe Embedding' }).click();
  await expect(modal.locator('div[class="code"]')).toBeVisible();
  await modal.getByTitle('copy code', { exact: true }).click();

  clipboardData = await ms2Page.readClipboard(true);

  const regex =
    /<iframe src='((http|https):\/\/[a-zA-Z0-9.:_-]+\/shared-viewer\?token=[a-zA-Z0-9._-]+)'/;
  expect(clipboardData).toMatch(regex);

  /*************************** Copy Diagram As PNG ********************************/
  //if (page.context().browser().browserType() !== firefox) {
  await modal.getByTitle('Copy Diagram as PNG', { exact: true }).click();
  await page.waitForTimeout(100);
  clipboardData = await ms2Page.readClipboard(false);
  await expect(clipboardData).toMatch('image/png');
  /*} else {
    // download as fallback
    const { filename: pngFilename, content: exportPng } = await processListPage.handleDownload(
      async () => await modal.getByTitle('Copy Diagram as PNG', { exact: true }).click(),
      'string',
    );

    expect(pngFilename).toMatch(/.png$/);
  }*/

  /*************************** Copy Diagram As XML ********************************/

  await modal.getByTitle('Copy Diagram as XML', { exact: true }).click();

  clipboardData = await ms2Page.readClipboard(true);

  const xmlRegex = /<([a-zA-Z0-9\-:_]+)[^>]*>[\s\S]*?<\/\1>/g;
  await expect(clipboardData).toMatch(xmlRegex);

  /*************************** Export as File ********************************/
  const exportModal = await openModal(page, () =>
    modal.getByTitle('Export as file', { exact: true }).click(),
  );
  await expect(page.getByTestId('Export Modal').getByRole('dialog')).toBeVisible();
  await closeModal(exportModal, () => exportModal.getByRole('button', { name: 'cancel' }).click());

  /*************************** Share Process with link ********************************/
  await modal.getByRole('button', { name: 'Share Public Link' }).click();
  await modal.getByText('Share Process with Public Link').click();

  await expect(modal.locator('input[name="generated share link"]')).toBeEnabled();
  await expect(modal.getByRole('button', { name: 'Copy link' })).toBeEnabled();
  await expect(modal.getByRole('button', { name: 'Save QR Code' })).toBeEnabled();
  await expect(modal.getByRole('button', { name: 'Copy QR Code' })).toBeEnabled();

  await modal.getByRole('button', { name: 'Copy link' }).click();

  clipboardData = await ms2Page.readClipboard(true);

  // Visit the shared link
  const browser: Browser = await chromium.launch();
  const newPage: Page = await browser.newPage();

  await newPage.goto(`${clipboardData}`);
  await newPage.waitForURL(`${clipboardData}`);

  // Add the shared process to the workspace
  await openModal(newPage, async () => {
    await newPage.getByRole('button', { name: 'edit' }).click();
    await newPage.waitForURL(/signin\?callbackUrl=([^]+)/);
  });

  await newPage.getByRole('button', { name: 'Create a Process' }).click();
  await newPage.waitForURL(/shared-viewer\?token=([^]+)/);

  await newPage.getByRole('button', { name: 'My Space' }).click();
  await newPage.waitForURL(/processes\/[a-z0-9-_]+/);

  const newProcessId = newPage.url().split('/processes/').pop();

  await newPage.getByRole('link', { name: 'process list' }).click();
  await newPage.waitForURL(/processes/);
  await expect(newPage.locator(`tr[data-row-key="${newProcessId}"]`)).toBeVisible();
});
