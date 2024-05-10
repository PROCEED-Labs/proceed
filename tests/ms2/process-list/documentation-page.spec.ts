import { Browser, Page, chromium, firefox } from '@playwright/test';
import { test, expect } from './process-list.fixtures';

test('documentation page functionality', async ({ processListPage }) => {
  const { page } = processListPage;

  /*********************** Setup **************************/

  // import the first process imported by the importer process and create a version to reference
  const import1Id = 'import1-definition-id';
  await processListPage.importProcess('import1.bpmn', import1Id);
  await page.locator(`tr[data-row-key="${import1Id}"]`).dblclick();
  await page.waitForURL(/processes\/[a-z0-9-_]+/);
  await page.getByRole('button', { name: 'plus' }).click();
  await page.getByPlaceholder('Version Name').click();
  await page.getByPlaceholder('Version Name').fill('Version 1');
  await page.getByPlaceholder('Version Description').click();
  await page.getByPlaceholder('Version Description').fill('First Version');
  await page.getByRole('button', { name: 'Create Version' }).click();
  await page.getByText('Latest Version').click();
  await page.getByText('Version 1').click();
  await page.waitForURL(/\?version=/);
  const import1Version = page.url().split('?version=').pop();

  await processListPage.goto();
  // import the second process imported by the importer process and create a version to reference
  const import2Id = 'import2-definition-id';
  await processListPage.importProcess('import2.bpmn', import2Id);
  await page.locator(`tr[data-row-key="${import2Id}"]`).dblclick();
  await page.waitForURL(/processes\/[a-z0-9-_]+/);
  await page.getByRole('button', { name: 'plus' }).click();
  await page.getByPlaceholder('Version Name').click();
  await page.getByPlaceholder('Version Name').fill('Version 2');
  await page.getByPlaceholder('Version Description').click();
  await page.getByPlaceholder('Version Description').fill('Second Version');
  await page.getByRole('button', { name: 'Create Version' }).click();
  await page.getByText('Latest Version').click();
  await page.getByText('Version 2').click();
  await page.waitForURL(/\?version=/);
  const import2Version = page.url().split('?version=').pop();

  // share this process so it is visible in the  documentation for other users
  await page.getByRole('button', { name: 'share-alt' }).click();
  await page.getByText('Share Process with Public Link').click();

  await processListPage.goto();
  // import the process that imports the other two and set the correct versions in its bpmn
  const { definitionId: importerId } = await processListPage.importProcess(
    'importer.bpmn',
    undefined,
    async (bpmn) => {
      bpmn = bpmn.replace(/insert-import1-version-here/g, import1Version);
      bpmn = bpmn.replace(/insert-import2-version-here/g, import2Version);
      return bpmn;
    },
  );
  await page.locator(`tr[data-row-key="${importerId}"]`).dblclick();
  await page.waitForURL(/processes\/[a-z0-9-_]+/);

  /************************* Testing as the user owning the process ***************************/

  // go to the documentation page
  const documentationPagePromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'file-pdf' }).click();
  const documentationPage = await documentationPagePromise;

  // check if the process on the page is the correct one
  await expect(documentationPage.getByRole('heading', { name: 'Importer' })).toBeVisible();
  const infoSection = documentationPage.locator('css=[class^=process-document_TitleInfos]');
  await expect(infoSection).toBeVisible();
  await expect(infoSection.getByText('Owner:')).toBeVisible();
  await expect(infoSection.getByText('Version: Latest')).toBeVisible();
  await expect(infoSection.getByText(/^Last Edit: .+$/)).toBeVisible();

  let elementSections = await documentationPage
    .locator('css=[class^=process-document_ElementPage]')
    .all();

  // check that the elements that should be visible are visible
  expect(elementSections.length).toBe(5);

  // check if the process overview is shown and the bpmn is correct
  const processOverview = elementSections[0];
  expect(processOverview.getByText('Process Diagram')).toBeVisible();
  await expect(
    processOverview.locator('.djs-shape[data-element-id="StartEvent_060jvsw"]'),
  ).toBeVisible();
  await expect(
    processOverview.locator('.djs-connection[data-element-id="Flow_11v1suu"]'),
  ).toBeVisible();
  await expect(
    processOverview.locator('.djs-shape[data-element-id="Activity_0ehc3tb"]'),
  ).toBeVisible();
  await expect(
    processOverview.locator('.djs-connection[data-element-id="Flow_11dnio8"]'),
  ).toBeVisible();
  await expect(
    processOverview.locator('.djs-shape[data-element-id="Activity_0ahspz3"]'),
  ).toBeVisible();
  await expect(
    processOverview.locator('.djs-connection[data-element-id="Flow_0aa5vf1"]'),
  ).toBeVisible();
  await expect(
    processOverview.locator('.djs-shape[data-element-id="Event_05hheu3"]'),
  ).toBeVisible();

  // check if the meta data of the process is shown
  let metaInformation = processOverview.locator('css=[class^=process-document_MetaInformation]');
  expect(metaInformation.getByText('General Description')).toBeVisible();
  expect(metaInformation.getByText('A process importing two other processes')).toBeVisible();

  // check if the overview of the first import is shown and the bpmn is correct
  const import1Overview = elementSections[1];
  expect(import1Overview.getByText('Imported Process: Import 1')).toBeVisible();
  await expect(
    import1Overview.locator('.djs-shape[data-element-id="StartEvent_0lu383t"]'),
  ).toBeVisible();
  await expect(
    import1Overview.locator('.djs-connection[data-element-id="Flow_0khcvxi"]'),
  ).toBeVisible();
  await expect(
    import1Overview.locator('.djs-shape[data-element-id="Activity_1qnnqlx"]'),
  ).toBeVisible();
  await expect(
    import1Overview.locator('.djs-connection[data-element-id="Flow_11ramgm"]'),
  ).toBeVisible();
  await expect(
    import1Overview.locator('.djs-shape[data-element-id="Activity_0h021fd"]'),
  ).toBeVisible();
  await expect(
    import1Overview.locator('.djs-connection[data-element-id="Flow_07y98js"]'),
  ).toBeVisible();
  await expect(
    import1Overview.locator('.djs-shape[data-element-id="Event_1dwf3dy"]'),
  ).toBeVisible();

  // check if the meta data of the import 1 process is shown
  metaInformation = import1Overview.locator('css=[class^=process-document_MetaInformation]');
  await expect(metaInformation.getByText('General Description')).toBeHidden();
  await expect(metaInformation.getByText('Version Information')).toBeVisible();
  await expect(metaInformation.getByText('Version: Version 1')).toBeVisible();
  await expect(metaInformation.getByText('Version Description: First Version')).toBeVisible();
  await expect(metaInformation.getByText(/^Creation Time: .+$/)).toBeVisible();

  // check if the overview of the subprocess in the first import is shown and the bpmn is correct
  const import1SubprocessOverview = elementSections[2];
  expect(import1SubprocessOverview.getByText('Subprocess: A')).toBeVisible();
  await expect(
    import1SubprocessOverview.locator('.djs-shape[data-element-id="Event_0dadznn"]'),
  ).toBeVisible();
  await expect(
    import1SubprocessOverview.locator('.djs-connection[data-element-id="Flow_1uie0do"]'),
  ).toBeVisible();
  await expect(
    import1SubprocessOverview.locator('.djs-shape[data-element-id="Activity_1vyrvs7"]'),
  ).toBeVisible();
  await expect(
    import1SubprocessOverview.locator('.djs-connection[data-element-id="Flow_16djkfc"]'),
  ).toBeVisible();
  await expect(
    import1SubprocessOverview.locator('.djs-shape[data-element-id="Activity_0d80j9z"]'),
  ).toBeVisible();
  await expect(
    import1SubprocessOverview.locator('.djs-connection[data-element-id="Flow_1olixk3"]'),
  ).toBeVisible();
  await expect(
    import1SubprocessOverview.locator('.djs-shape[data-element-id="Event_1ney7ih"]'),
  ).toBeVisible();

  // check that there is no meta data for the subprocess
  await expect(
    import1SubprocessOverview.locator('css=[class^=process-document_MetaInformation]'),
  ).toBeHidden();

  // check milestones and meta data on an element in the subprocess
  const subprocessMilestoneTask = elementSections[3];
  await expect(subprocessMilestoneTask.getByRole('heading', { name: 'A.A' })).toBeVisible();
  // the elements of the subprocess that contains the task which are not related to the task should not be visible
  await expect(
    subprocessMilestoneTask
      .locator('.djs-shape[data-element-id="Event_0dadznn"]')
      .getAttribute('style'),
  ).resolves.toMatch(/display: none/);
  await expect(
    subprocessMilestoneTask
      .locator('.djs-shape[data-element-id="Activity_0d80j9z"]')
      .getAttribute('style'),
  ).resolves.toMatch(/display: none/);
  await expect(
    subprocessMilestoneTask
      .locator('.djs-connection[data-element-id="Flow_1olixk3"]')
      .getAttribute('style'),
  ).resolves.toMatch(/display: none/);
  await expect(
    subprocessMilestoneTask
      .locator('.djs-shape[data-element-id="Event_1ney7ih"]')
      .getAttribute('style'),
  ).resolves.toMatch(/display: none/);
  // instead the task and its incoming and outgoing sequence flows should be visible
  await expect(
    subprocessMilestoneTask
      .locator('.djs-connection[data-element-id="Flow_1uie0do"]')
      .getAttribute('style'),
  ).resolves.not.toMatch(/display: none/);
  await expect(
    subprocessMilestoneTask
      .locator('.djs-shape[data-element-id="Activity_1vyrvs7"]')
      .getAttribute('style'),
  ).resolves.not.toMatch(/display: none/);
  await expect(
    subprocessMilestoneTask
      .locator('.djs-connection[data-element-id="Flow_16djkfc"]')
      .getAttribute('style'),
  ).resolves.not.toMatch(/display: none/);

  // check if the meta data of the import 1 process is shown
  metaInformation = subprocessMilestoneTask.locator(
    'css=[class^=process-document_MetaInformation]',
  );
  await expect(metaInformation.getByText('General Description')).toBeHidden();
  await expect(metaInformation.getByText('Version Information')).toBeHidden();

  await expect(metaInformation.getByText('Meta Data')).toBeVisible();
  await expect(metaInformation.getByRole('row', { name: 'costsPlanned' })).toBeVisible();
  await expect(
    metaInformation
      .getByRole('row', { name: 'costsPlanned' })
      .getByRole('cell', { name: '123,00 €' }),
  ).toBeVisible();
  await expect(metaInformation.getByRole('row', { name: 'prop1' })).toBeVisible();
  await expect(
    metaInformation.getByRole('row', { name: 'prop1' }).getByRole('cell', { name: 'test123' }),
  ).toBeVisible();

  await expect(metaInformation.getByText('Milestones')).toBeVisible();
  await expect(metaInformation.getByRole('row', { name: 'MS-1' })).toBeVisible();
  await expect(
    metaInformation.getByRole('row', { name: 'MS-1' }).getByRole('cell', { name: 'Milestone 1' }),
  ).toBeVisible();
  await expect(
    metaInformation
      .getByRole('row', { name: 'MS-1' })
      .getByRole('cell', { name: 'First Milestone' }),
  ).toBeVisible();

  // check if the overview of the first import is shown and the bpmn is correct
  const import2Overview = elementSections[4];
  expect(import2Overview.getByText('Imported Process: Import 2')).toBeVisible();
  await expect(
    import2Overview.locator('.djs-shape[data-element-id="StartEvent_11c5e5n"]'),
  ).toBeVisible();
  await expect(
    import2Overview.locator('.djs-connection[data-element-id="Flow_14wofxg"]'),
  ).toBeVisible();
  await expect(
    import2Overview.locator('.djs-shape[data-element-id="Activity_0car07j"]'),
  ).toBeVisible();
  await expect(
    import2Overview.locator('.djs-connection[data-element-id="Flow_1rm9mx3"]'),
  ).toBeVisible();
  await expect(
    import2Overview.locator('.djs-shape[data-element-id="Activity_013wagm"]'),
  ).toBeVisible();
  await expect(
    import2Overview.locator('.djs-connection[data-element-id="Flow_1j401tl"]'),
  ).toBeVisible();
  await expect(
    import2Overview.locator('.djs-shape[data-element-id="Activity_1r1rpgl"]'),
  ).toBeVisible();
  await expect(
    import2Overview.locator('.djs-connection[data-element-id="Flow_0s9fl5z"]'),
  ).toBeVisible();
  await expect(
    import2Overview.locator('.djs-shape[data-element-id="Event_0gy99s6"]'),
  ).toBeVisible();

  // check if the meta data of the import 1 process is shown
  metaInformation = import2Overview.locator('css=[class^=process-document_MetaInformation]');
  await expect(metaInformation.getByText('General Description')).toBeHidden();
  await expect(metaInformation.getByText('Version Information')).toBeVisible();
  await expect(metaInformation.getByText('Version: Version 2')).toBeVisible();
  await expect(metaInformation.getByText('Version Description: Second Version')).toBeVisible();
  await expect(metaInformation.getByText(/^Creation Time: .+$/)).toBeVisible();

  /******* Test Page Options ********/

  // check that the visualisation of a subprocess can be set to show the subprocess element instead of the nested subprocess
  // which also removes all contained elements from the page
  await documentationPage.getByRole('button', { name: 'setting' }).click();
  await documentationPage.getByLabel('Nested Subprocesses').uncheck();
  await documentationPage.getByRole('button', { name: 'OK' }).click();

  elementSections = await documentationPage
    .locator('css=[class^=process-document_ElementPage]')
    .all();

  expect(elementSections.length).toBe(4);

  // check if the bpmn shown for the (collapsed) subprocess is the subprocess element instead of the subrocess content
  const import1SubprocessElementView = elementSections[2];
  expect(import1SubprocessElementView.getByText('Subprocess: A')).toBeVisible();

  // the start event inside the subprocess should not be visible
  await expect(
    import1SubprocessElementView.locator('.djs-shape[data-element-id="Event_0dadznn"]'),
  ).not.toBeVisible();
  // the elements of the imported process that contains the subprocess which are not related to the subprocess should not be visible
  await expect(
    import1SubprocessElementView
      .locator('.djs-shape[data-element-id="StartEvent_0lu383t"]')
      .getAttribute('style'),
  ).resolves.toMatch(/display: none/);
  await expect(
    import1SubprocessElementView
      .locator('.djs-shape[data-element-id="Activity_0h021fd"]')
      .getAttribute('style'),
  ).resolves.toMatch(/display: none/);
  await expect(
    import1SubprocessElementView
      .locator('.djs-connection[data-element-id="Flow_07y98js"]')
      .getAttribute('style'),
  ).resolves.toMatch(/display: none/);
  await expect(
    import1SubprocessElementView
      .locator('.djs-shape[data-element-id="Event_1dwf3dy"]')
      .getAttribute('style'),
  ).resolves.toMatch(/display: none/);
  // instead the subprocess element and its incoming and outgoing sequence flow should be visible
  await expect(
    import1SubprocessElementView
      .locator('.djs-connection[data-element-id="Flow_0khcvxi"]')
      .getAttribute('style'),
  ).resolves.not.toMatch(/display: none/);
  await expect(
    import1SubprocessElementView
      .locator('.djs-shape[data-element-id="Activity_1qnnqlx"]')
      .getAttribute('style'),
  ).resolves.not.toMatch(/display: none/);
  await expect(
    import1SubprocessElementView
      .locator('.djs-connection[data-element-id="Flow_11ramgm"]')
      .getAttribute('style'),
  ).resolves.not.toMatch(/display: none/);

  // check that the visualisation of a call activity can be set to show the call activity element instead of the imported process
  // which also removes all contained elements from the page
  await documentationPage.getByRole('button', { name: 'setting' }).click();
  await documentationPage.getByLabel('Imported Processes').uncheck();
  await documentationPage.getByRole('button', { name: 'OK' }).click();

  elementSections = await documentationPage
    .locator('css=[class^=process-document_ElementPage]')
    .all();

  expect(elementSections.length).toBe(3);

  // check if the bpmn shown for the call activities is the call activity elements instead of the imported process
  const callActivity1View = elementSections[1];
  expect(callActivity1View.getByText('Call Activity: Import 1')).toBeVisible();

  // the start event of the imported process should not be visible
  await expect(
    callActivity1View.locator('.djs-shape[data-element-id="StartEvent_0lu383t"]'),
  ).not.toBeVisible();
  // the elements of the main process that are not related to the call activity element should not be visible
  await expect(
    callActivity1View
      .locator('.djs-shape[data-element-id="StartEvent_060jvsw"]')
      .getAttribute('style'),
  ).resolves.toMatch(/display: none/);
  await expect(
    callActivity1View
      .locator('.djs-shape[data-element-id="Activity_0ahspz3"]')
      .getAttribute('style'),
  ).resolves.toMatch(/display: none/);
  await expect(
    callActivity1View
      .locator('.djs-connection[data-element-id="Flow_0aa5vf1"]')
      .getAttribute('style'),
  ).resolves.toMatch(/display: none/);
  await expect(
    callActivity1View.locator('.djs-shape[data-element-id="Event_05hheu3"]').getAttribute('style'),
  ).resolves.toMatch(/display: none/);
  // instead the subprocess element and its incoming and outgoing sequence flow should be visible
  await expect(
    callActivity1View
      .locator('.djs-connection[data-element-id="Flow_11v1suu"]')
      .getAttribute('style'),
  ).resolves.not.toMatch(/display: none/);
  await expect(
    callActivity1View
      .locator('.djs-shape[data-element-id="Activity_0ehc3tb"]')
      .getAttribute('style'),
  ).resolves.not.toMatch(/display: none/);
  await expect(
    callActivity1View
      .locator('.djs-connection[data-element-id="Flow_11dnio8"]')
      .getAttribute('style'),
  ).resolves.not.toMatch(/display: none/);

  // check that the option to show elements that have no meta data and contain no other elements works as well (here in combination with the previously deselected options)
  await documentationPage.getByRole('button', { name: 'setting' }).click();
  await documentationPage.getByLabel('Exclude Empty Elements').uncheck();
  await documentationPage.getByRole('button', { name: 'OK' }).click();

  elementSections = await documentationPage
    .locator('css=[class^=process-document_ElementPage]')
    .all();

  expect(elementSections.length).toBe(5);
  // there should be sections for all the elements in the root process including the start and end event
  // but there should not be sections for sequence flows
  expect(elementSections[0].getByText('Process Diagram')).toBeVisible();
  expect(elementSections[1].getByText('<Event_05hheu3>')).toBeVisible();
  expect(elementSections[2].getByText('<StartEvent_060jvsw>')).toBeVisible();
  expect(elementSections[3].getByText('Call Activity: Import 1')).toBeVisible();
  expect(elementSections[4].getByText('Call Activity: Import 2')).toBeVisible();

  // check that the "Add to your workspace option is not shown to a user that already owns the process"
  await expect(
    documentationPage.getByRole('button', { name: 'Add to your workspace' }),
  ).toBeHidden();

  /************************* Testing as a guest user opening the share link ***************************/
  await page.getByRole('button', { name: 'share-alt' }).click();

  // share process with link
  await page.getByRole('button', { name: 'Share Public Link' }).click();
  await page.getByText('Share Process with Public Link').click();

  await expect(page.locator('input[name="generated share link"]')).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Copy link' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Save QR Code' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Copy QR Code' })).toBeEnabled();

  await page.getByRole('button', { name: 'Copy link' }).click();

  const clipboardData = await processListPage.readClipboard(true);

  // Visit the shared link
  const browser: Browser = await chromium.launch();
  const newPage: Page = await browser.newPage();

  await newPage.goto(`${clipboardData}`);
  await newPage.waitForURL(`${clipboardData}`);

  // check that the process imported by the "Import 1" Call-Activity is not visible since it is not owned by the user and also not shared
  await expect(newPage.locator('css=[class^=process-document_ElementPage]')).toHaveCount(2);
  await expect(
    newPage
      .locator('css=[class^=process-document_ElementPage]')
      .first()
      .getByText('Process Diagram'),
  ).toBeVisible();
  // the process imported by the "Import 2" Call-Activity should be visible since it is shared
  await expect(
    newPage
      .locator('css=[class^=process-document_ElementPage]')
      .nth(1)
      .getByText('Imported Process: Import 2'),
  ).toBeVisible();
  await expect(newPage.getByText('Imported Process: Import 1')).not.toBeVisible();

  // check that the add to workspace button is visible since the user does not own the process
  await expect(newPage.getByRole('button', { name: 'Add to your workspace' })).toBeVisible();

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

  // cleanup the process added by the guest user
  await newPage
    .locator(`tr[data-row-key="${newProcessId}"]`)
    .getByRole('button', { name: 'delete' })
    .click();
  await newPage.getByRole('button', { name: 'OK' }).click();
});
