import { test, testShortcuts, expect } from './process-modeler.fixtures';

test('process modeler', async ({ processModelerPage }) => {
  // Open/close XML Viewer
  await processModelerPage.page.getByRole('button', { name: 'xml-sign' }).click();
  await expect(processModelerPage.page.getByRole('dialog', { name: 'BPMN XML' })).toBeVisible();
  //todo: check xml for startevent
  await processModelerPage.page.waitForTimeout(2000); // wait for dialog to show before closing
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
  const openVersionCreationDialog = processModelerPage.page
    .getByLabel('general-modeler-toolbar')
    .getByRole('button', { name: 'plus' });
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
  const expectedURLWithVersion = new RegExp(
    `\\/processes\\/${processModelerPage.processDefinitionID}\\?version=\\d+$`,
  );
  await processModelerPage.page.waitForURL(expectedURLWithVersion);
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
  const expectedURLNewProcess = new RegExp(`\\/processes\\/[a-zA-Z0-9-_]+`);
  await processModelerPage.page.waitForURL((url) => {
    return (
      url.pathname.match(expectedURLNewProcess) &&
      !url.pathname.includes(processModelerPage.processDefinitionID)
    );
  });
  expect(expectedURLNewProcess.test(processModelerPage.page.url())).toBeTruthy();
  const newDefinitionID = processModelerPage.page.url().split('/processes/').pop();
  expect(newDefinitionID).not.toEqual(processModelerPage.processDefinitionID);

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
  expect(newSubprocessDefinitionID).not.toEqual(processModelerPage.processDefinitionID);
});

testShortcuts.describe('Shortcuts in Modeler', () => {
  testShortcuts(
    'close modeler / go to process list with shortcut',
    async ({ processModelerPage }) => {
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
    },
  );

  /* ctrl / meta + enter */
  testShortcuts('open Property-Panel with shortcut', async ({ processModelerPage }) => {
    const { page } = processModelerPage;

    /* Open Modal */
    await page.getByRole('main').press('Control+Enter');

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

    /* Open with meta */
    await page.getByRole('main').press('Meta+Enter');

    /* Check if Property-Panel is open */
    await expect(
      page.getByRole('region', { name: 'Properties' }),
      'Property-Panel should be openable via shortcuts',
    ).toBeVisible();
  });

  testShortcuts('open Share-Modal with shortcut', async ({ processModelerPage }) => {
    const { page } = processModelerPage;

    /* Open Share-Modal with Shift+Enter */
    await page.getByRole('main').press('Shift+Enter');

    /* Ensure entry-animation is done */
    await page.waitForTimeout(1_000);

    /* Check if Share-Modal is open */
    let modal = await page.getByRole('dialog');
    await expect(modal, 'Share-Modal should be openable via shortcuts').toBeVisible();

    /* Check if correct modal opened */
    let modalTitle = await modal.locator('div[class="ant-modal-title"]');
    await expect(modalTitle, 'Could not ensure that the correct modal opened').toHaveText(/share/i);

    /* Change between tabs */
    // TODO:
    /* --------------- */

    /* --------------- */

    /* Close modal */
    await page.getByRole('main').press('Escape');

    await page.waitForTimeout(1_000); /* Ensure that animation is over */

    /* Check if modal closed */
    await expect(modal, 'Share-Modal should be closeable via shortcuts').not.toBeVisible();
  });

  testShortcuts('open XML with shortcut', async ({ processModelerPage }) => {
    const { page } = processModelerPage;

    /* Open XML with ctrl / meta + x */
    await page.locator('body').press('Control+x');

    await page.waitForTimeout(1_000); /* Ensure that animation is over */

    /* Check if XML-Modal is open */
    let modal = await page.getByRole('dialog');
    await expect(modal, 'XML-Modal should be openable via shortcuts').toBeVisible();

    /* Check if correct modal opened */
    let modalTitle = await modal.locator('div[class="ant-modal-title"]');
    await expect(modalTitle, 'Could not ensure that the correct modal opened').toHaveText(/xml/i);

    /* Close Modal */
    await page.locator('body').press('Escape');

    await page.waitForTimeout(1_000); /* Ensure that animation is over */

    /* Check if modal closed */
    await expect(modal, 'XML-Modal should be closeable via shortcuts').not.toBeVisible();

    /* Open with meta */
    await page.locator('body').press('Meta+x');

    await page.waitForTimeout(1_000); /* Ensure that animation is over */

    /* Check if XML-Modal is open */
    modal = await page.getByRole('dialog');
    await expect(modal, 'XML-Modal should be openable via shortcuts').toBeVisible();
  });

  /* ctrl / meta + e */
  testShortcuts('open Export-Modal with shortcut', async ({ processModelerPage }) => {
    const { page } = processModelerPage;

    /* Open Export-Modal with ctrl / meta + e */
    // await page.getByRole('main').press('Control+E');
    await page.locator('body').press('Control+e');

    /* Ensure entry-animation is done */
    await page.waitForTimeout(1_000);

    /* Check if Export-Modal is open */
    let modal = await page.getByRole('dialog');
    await expect(modal, 'Export-Modal should be openable via shortcuts').toBeVisible();

    /* Check if correct modal opened */
    let modalTitle = await modal.locator('div[class="ant-modal-title"]');
    await expect(modalTitle, 'Could not ensure that the correct modal opened').toHaveText(
      /export/i,
    );

    /* Close Modal */
    // await page.locator('body').press('Escape');
    await page.getByRole('main').press('Escape');

    /* Ensure exit-animation is done */
    await page.waitForTimeout(1_000);

    /* Check if modal closed */
    await expect(modal, 'Export-Modal should be closeable via shortcuts').not.toBeVisible();

    /* Open with meta */
    await page.getByRole('main').press('Meta+e');

    /* Ensure entry-animation is done */
    await page.waitForTimeout(1_000);

    /* Check if Export-Modal is open */
    modal = await page.getByRole('dialog');
    await expect(modal, 'Export-Modal should be openable via shortcuts').toBeVisible();
  });
});
