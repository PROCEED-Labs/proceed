import { test, expect } from './process-modeler.fixtures';
import { openModal, closeModal } from '../../testUtils';

test('process modeler', async ({ processModelerPage, processListPage }) => {
  const definitionId = await processListPage.createProcess({ processName: 'Process Name' });

  // Open/close XML Viewer
  let modal = await openModal(processModelerPage.page.getByRole('button', { name: 'xml-sign' }));
  await expect(processModelerPage.page.getByRole('dialog', { name: 'BPMN XML' })).toBeVisible();
  //todo: check xml for startevent
  await closeModal(modal.getByRole('button', { name: 'Ok' }));

  // Open/collapse/close properties panel
  const propertiesPanel = processModelerPage.page.getByRole('region', { name: 'Properties' });
  const openPropertiesPanelButton = processModelerPage.page.getByRole('button', {
    name: 'info-circle',
  });
  await openPropertiesPanelButton.click();
  await expect(propertiesPanel).toBeVisible();
  await processModelerPage.page.getByRole('button', { name: 'double-right' }).click();
  const propertiesPanelBoundingBox = await propertiesPanel.boundingBox();
  expect(propertiesPanelBoundingBox.width).toEqual(40);
  await openPropertiesPanelButton.click(); // click again to close properties panel
  await expect(propertiesPanel).not.toBeVisible();

  // Open/close version creation dialog
  const openVersionCreationDialog = processModelerPage.page
    .getByLabel('general-modeler-toolbar')
    .getByRole('button', { name: 'plus' });
  modal = await openModal(openVersionCreationDialog);
  const versionCreationDialog = processModelerPage.page.getByRole('dialog', {
    name: 'Create New Version',
  });
  await expect(versionCreationDialog).toBeVisible();
  await closeModal(modal.getByRole('button', { name: 'Cancel' }));
  await expect(versionCreationDialog).not.toBeVisible();
  modal = await openModal(openVersionCreationDialog);
  await closeModal(modal.getByRole('button', { name: 'Close', exact: true }));
  await expect(versionCreationDialog).not.toBeVisible();

  // Fill version creation dialog and create new version
  const stringWith150Chars =
    'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam volu';
  modal = await openModal(openVersionCreationDialog);
  const versionCreationSubmitButton = modal.getByRole('button', {
    name: 'Create Version',
  });
  await expect(versionCreationSubmitButton).toBeDisabled();
  await modal.getByPlaceholder('Version Name').fill('Version 1');
  await expect(versionCreationSubmitButton).toBeDisabled();
  await modal
    .getByPlaceholder('Version Description')
    .fill(`${stringWith150Chars}, characaters passing the 150 mark should not be visible`);
  await expect(processModelerPage.page.getByPlaceholder('Version Description')).toHaveText(
    stringWith150Chars,
  );
  await expect(versionCreationSubmitButton).toBeEnabled();
  await closeModal(versionCreationSubmitButton);

  // Select newly created version to view its BPMN and check for URL change
  const versionSelectMenu = processModelerPage.page.getByText('Latest Version');
  await versionSelectMenu.click();
  await expect(
    processModelerPage.page.getByRole('option', { name: 'Latest Version' }),
  ).toBeVisible();
  await expect(processModelerPage.page.getByRole('option', { name: 'Version 1' })).toBeVisible();
  await processModelerPage.page.getByRole('option', { name: 'Version 1' }).click();
  const expectedURLWithVersion = new RegExp(`\\/processes\\/${definitionId}\\?version=\\d+$`);
  await processModelerPage.page.waitForURL(expectedURLWithVersion);
  expect(expectedURLWithVersion.test(processModelerPage.page.url())).toBeTruthy();

  // Open/close process select menu and process creation dialog
  const processSelectMenu = processModelerPage.page.getByTitle('Process List');

  await processSelectMenu.click();
  await expect(processModelerPage.page.getByRole('option', { name: 'Process Name' })).toBeVisible();

  const openProcessCreationDialogButton = processModelerPage.page.getByRole('button', {
    name: 'Create new process',
  });
  let processCreationDialog = await openModal(openProcessCreationDialogButton);
  await expect(processCreationDialog).toBeVisible();
  await closeModal(processCreationDialog.getByRole('button', { name: 'Cancel' }));
  await expect(processCreationDialog).not.toBeVisible();
  await processSelectMenu.click();
  processCreationDialog = await openModal(openProcessCreationDialogButton);
  await closeModal(processCreationDialog.getByRole('button', { name: 'Close' }));
  await expect(processCreationDialog).not.toBeVisible();
  await processSelectMenu.click();
  processCreationDialog = await openModal(openProcessCreationDialogButton);

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
  await processModelerPage.page.waitForURL((url) => {
    return url.pathname.match(expectedURLNewProcess) && !url.pathname.includes(definitionId);
  });
  expect(expectedURLNewProcess.test(processModelerPage.page.url())).toBeTruthy();
  const newDefinitionID = processModelerPage.page.url().split('/processes/').pop();
  expect(newDefinitionID).not.toEqual(definitionId);

  // Create subprocess and navigate
  await processModelerPage.createSubprocess();
  const openSubprocessButton = processModelerPage.page.locator('.bjs-drilldown');
  await expect(openSubprocessButton).toBeVisible();
  await openSubprocessButton.click();
  const expectedURLSubprocess = new RegExp(
    `\\/processes\\/[a-zA-Z0-9-_]+\\?subprocess\\=[a-zA-Z0-9-_]+`,
  );
  await processModelerPage.page.waitForURL(expectedURLSubprocess);
  expect(expectedURLSubprocess.test(processModelerPage.page.url())).toBeTruthy();
  const newSubprocessDefinitionID = processModelerPage.page.url().split('/processes/').pop();
  expect(newSubprocessDefinitionID).not.toEqual(definitionId);
});
