import { test, expect } from './process-modeler.fixtures';

test('process modeler', async ({ processModelerPage }) => {
  // Open/close XML Viewer
  await processModelerPage.page.getByRole('button', { name: 'xml-sign' }).click();
  await expect(processModelerPage.page.getByRole('dialog', { name: 'BPMN XML' })).toBeVisible();
  //todo: check xml for startevent
  await processModelerPage.page.waitForTimeout(500);
  await processModelerPage.page.getByRole('button', { name: 'Ok' }).click();

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
  const openVersionCreationDialog = processModelerPage.page.getByRole('button', { name: 'plus' });
  await openVersionCreationDialog.click();
  const versionCreationDialog = processModelerPage.page.getByRole('dialog', {
    name: 'Create New Version',
  });
  await expect(versionCreationDialog).toBeVisible();
  await processModelerPage.page.getByRole('button', { name: 'Cancel' }).click();
  await expect(versionCreationDialog).not.toBeVisible();
  await openVersionCreationDialog.click();
  await processModelerPage.page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(versionCreationDialog).not.toBeVisible();

  // Fill version creation dialog and create new version
  const versionCreationSubmitButton = processModelerPage.page.getByRole('button', {
    name: 'Create Version',
  });
  const stringWith150Chars =
    'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam volu';
  await openVersionCreationDialog.click();
  await expect(versionCreationSubmitButton).toBeDisabled();
  await processModelerPage.page.getByPlaceholder('Version Name').fill('Version 1');
  await expect(versionCreationSubmitButton).toBeDisabled();
  await processModelerPage.page
    .getByPlaceholder('Version Description')
    .fill(`${stringWith150Chars}, characaters passing the 150 mark should not be visible`);
  await expect(processModelerPage.page.getByPlaceholder('Version Description')).toHaveText(
    stringWith150Chars,
  );
  await expect(versionCreationSubmitButton).toBeEnabled();
  await versionCreationSubmitButton.click();

  // Select newly created version to view its BPMN and check for URL change
  const versionSelectMenu = processModelerPage.page.getByText('Latest Version');
  await versionSelectMenu.click();
  await expect(
    processModelerPage.page.getByRole('option', { name: 'Latest Version' }),
  ).toBeVisible();
  await expect(processModelerPage.page.getByRole('option', { name: 'Version 1' })).toBeVisible();
  await processModelerPage.page.getByRole('option', { name: 'Version 1' }).click();
  await processModelerPage.page.waitForTimeout(500);
  const expectedURLWithVersion = new RegExp(
    `^http:\\/\\/localhost:3000\\/processes\\/${processModelerPage.processDefinitionID}\\?version=\\d+$`,
  );
  expect(expectedURLWithVersion.test(processModelerPage.page.url())).toBeTruthy();

  // Open/close process select menu and process creation dialog
  const processSelectMenu = processModelerPage.page.getByTitle('Process List');
  const openProcessCreationDialogButton = processModelerPage.page.getByRole('button', {
    name: 'Create new process',
  });
  const processCreationDialog = processModelerPage.page.getByRole('dialog', {
    name: 'Create Process',
  });
  await processSelectMenu.click();
  await expect(processModelerPage.page.getByRole('option', { name: 'Process Name' })).toBeVisible();
  await openProcessCreationDialogButton.click();
  await expect(processCreationDialog).toBeVisible();
  await processModelerPage.page.getByRole('button', { name: 'Cancel' }).click();
  await expect(processCreationDialog).not.toBeVisible();
  await processSelectMenu.click();
  await openProcessCreationDialogButton.click();
  await processModelerPage.page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(processCreationDialog).not.toBeVisible();
  await processSelectMenu.click();
  await openProcessCreationDialogButton.click();

  // Fill process creation dialog and create new process, check for url change
  await processModelerPage.page.getByLabel('Process Name').fill('New Process');
  await processModelerPage.page
    .getByLabel('Process Description')
    .fill(`${stringWith150Chars}, characaters passing the 150 mark should not be visible`);
  await expect(processModelerPage.page.getByLabel('Process Description')).toHaveText(
    stringWith150Chars,
  );
  await processModelerPage.page
    .getByRole('button', {
      name: 'Create',
      exact: true,
    })
    .click();
  await processModelerPage.page.waitForTimeout(500);
  const newDefinitionID = processModelerPage.page.url().split('/processes/').pop();
  const expectedURLNewProcess = new RegExp(
    `^http:\\/\\/localhost:3000\\/processes\\/[a-zA-Z0-9-_]+`,
  );
  expect(expectedURLNewProcess.test(processModelerPage.page.url())).toBeTruthy();
  expect(newDefinitionID).not.toEqual(processModelerPage.processDefinitionID);

  // Create subprocess and navigate
  await processModelerPage.createSubprocess();
  await processModelerPage.page.locator('.djs-shape[data-element-id^="Activity_"]').click();
  const openSubprocessButton = processModelerPage.page.getByRole('button', {
    name: 'Open Subprocess',
  });
  await expect(openSubprocessButton).toBeVisible();
  await openSubprocessButton.click();
  await processModelerPage.page.waitForTimeout(500);
  const newSubprocessDefinitionID = processModelerPage.page.url().split('/processes/').pop();
  const expectedURLSubprocess = new RegExp(
    `^http:\\/\\/localhost:3000\\/processes\\/[a-zA-Z0-9-_]+\\?subprocess\\=[a-zA-Z0-9-_]+`,
  );
  expect(expectedURLSubprocess.test(processModelerPage.page.url())).toBeTruthy();
  expect(newSubprocessDefinitionID).not.toEqual(processModelerPage.processDefinitionID);
});
