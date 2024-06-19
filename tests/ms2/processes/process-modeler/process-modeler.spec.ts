import { Browser, Page, chromium, firefox } from '@playwright/test';
import { test, expect } from '../processes.fixtures';
import { openModal, closeModal } from '../../testUtils';

test('process modeler', async ({ processModelerPage, processListPage }) => {
  const { page } = processModelerPage;
  const definitionId = await processListPage.createProcess({ processName: 'Process Name' });

  // Open/close XML Viewer
  let modal = await openModal(() => page.getByRole('button', { name: 'xml-sign' }).click(), page);
  await expect(page.getByRole('dialog', { name: 'BPMN XML' })).toBeVisible();
  //todo: check xml for startevent
  await closeModal(modal.getByRole('button', { name: 'Ok' }));

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
  modal = await openModal(() => openVersionCreationDialog.click(), page);
  const versionCreationDialog = page.getByRole('dialog', {
    name: 'Create New Version',
  });
  await expect(versionCreationDialog).toBeVisible();
  await closeModal(modal.getByRole('button', { name: 'Cancel' }));
  await expect(versionCreationDialog).not.toBeVisible();
  modal = await openModal(() => openVersionCreationDialog.click(), page);
  await closeModal(modal.getByRole('button', { name: 'Close', exact: true }));
  await expect(versionCreationDialog).not.toBeVisible();

  // Fill version creation dialog and create new version
  const stringWith150Chars =
    'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam volu';
  modal = await openModal(() => openVersionCreationDialog.click(), page);
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
  await closeModal(versionCreationSubmitButton);

  // Select newly created version to view its BPMN and check for URL change
  const versionSelectMenu = page.getByText('Latest Version');
  await versionSelectMenu.click();
  await expect(page.getByRole('option', { name: 'Latest Version' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Version 1' })).toBeVisible();
  await page.getByRole('option', { name: 'Version 1' }).click();
  const expectedURLWithVersion = new RegExp(`\\/processes\\/${definitionId}\\?version=\\d+$`);
  await page.waitForURL(expectedURLWithVersion);
  expect(expectedURLWithVersion.test(page.url())).toBeTruthy();

  // Open/close process select menu and process creation dialog
  const processSelectMenu = page.getByTitle('Process List');

  await processSelectMenu.click();
  await expect(page.getByRole('option', { name: 'Process Name' })).toBeVisible();

  const openProcessCreationDialogButton = page.getByRole('button', {
    name: 'Create new process',
  });
  let processCreationDialog = await openModal(() => openProcessCreationDialogButton.click(), page);
  await expect(processCreationDialog).toBeVisible();
  await closeModal(processCreationDialog.getByRole('button', { name: 'Cancel' }));
  await expect(processCreationDialog).not.toBeVisible();
  await processSelectMenu.click();
  processCreationDialog = await openModal(() => openProcessCreationDialogButton.click(), page);
  await closeModal(processCreationDialog.getByRole('button', { name: 'Close' }));
  await expect(processCreationDialog).not.toBeVisible();
  await processSelectMenu.click();
  processCreationDialog = await openModal(() => openProcessCreationDialogButton.click(), page);

  // Fill process creation dialog and create new process, check for url change
  await processCreationDialog.getByLabel('Process Name').fill('New Process');
  await processCreationDialog
    .getByLabel('Process Description')
    .fill(`${stringWith150Chars}, characaters passing the 150 mark should not be visible`);
  await expect(processCreationDialog.getByLabel('Process Description')).toHaveText(
    stringWith150Chars,
  );
  await closeModal(
    processCreationDialog.getByRole('button', {
      name: 'Create',
    }),
  );
  const expectedURLNewProcess = new RegExp(`\\/processes\\/[a-zA-Z0-9-_]+`);
  await page.waitForURL((url) => {
    return url.pathname.match(expectedURLNewProcess) && !url.pathname.includes(definitionId);
  });
  expect(expectedURLNewProcess.test(page.url())).toBeTruthy();
  const newDefinitionID = page.url().split('/processes/').pop();
  expect(newDefinitionID).not.toEqual(definitionId);

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

test('share-modal', async ({ processListPage, ms2Page }) => {
  const { page } = processListPage;

  let clipboardData: string;

  const { definitionId: process1Id } = await processListPage.importProcess('process1.bpmn');
  await page.locator(`tr[data-row-key="${process1Id}"]`).dblclick();

  await page.waitForURL(/processes\/[a-z0-9-_]+/);

  const modal = await openModal(
    () => page.getByRole('button', { name: 'share-alt' }).click(),
    page,
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
  // skip this test for firefox
  if (page.context().browser().browserType() !== firefox) {
    await modal.getByTitle('Copy Diagram as PNG', { exact: true }).click();
    await page.waitForTimeout(100);
    clipboardData = await ms2Page.readClipboard(false);
    await expect(clipboardData).toMatch('image/png');
  } else {
    // download as fallback
    const { filename: pngFilename, content: exportPng } = await processListPage.handleDownload(
      async () => await modal.getByTitle('Copy Diagram as PNG', { exact: true }).click(),
      'string',
    );

    expect(pngFilename).toMatch(/.png$/);
  }

  /*************************** Copy Diagram As XML ********************************/

  await modal.getByTitle('Copy Diagram as XML', { exact: true }).click();

  clipboardData = await ms2Page.readClipboard(true);

  const xmlRegex = /<([a-zA-Z0-9\-:_]+)[^>]*>[\s\S]*?<\/\1>/g;
  await expect(clipboardData).toMatch(xmlRegex);

  /*************************** Export as File ********************************/
  const exportModal = await openModal(
    () => modal.getByTitle('Export as file', { exact: true }).click(),
    page,
  );
  await expect(page.getByTestId('Export Modal').getByRole('dialog')).toBeVisible();
  await closeModal(exportModal.getByRole('button', { name: 'cancel' }));

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
  await newPage.getByRole('button', { name: 'Add to your workspace' }).click();
  await newPage.waitForURL(/signin\?callbackUrl=([^]+)/);

  await newPage.getByRole('button', { name: 'Continue as a Guest' }).click();
  await newPage.waitForURL(/shared-viewer\?token=([^]+)/);

  await newPage.getByRole('button', { name: 'My Space' }).click();
  await newPage.waitForURL(/processes\/[a-z0-9-_]+/);

  const newProcessId = newPage.url().split('/processes/').pop();

  await newPage.getByRole('link', { name: 'process list' }).click();
  await newPage.waitForURL(/processes/);
  await expect(newPage.locator(`tr[data-row-key="${newProcessId}"]`)).toBeVisible();
});
