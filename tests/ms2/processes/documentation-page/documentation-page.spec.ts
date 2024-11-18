import { Browser, Page, chromium } from '@playwright/test';
import { test, expect } from '../processes.fixtures';
import { closeModal, openModal } from '../../testUtils';

test('show process information', async ({ page, processListPage }) => {
  const { definitionId } = await processListPage.importProcess('process1.bpmn');
  await page.locator(`tr[data-row-key="${definitionId}"]>td:nth-child(3)`).click();
  await page.waitForURL(/processes\/[a-z0-9-_]+/);

  await expect(page.locator('.djs-shape[data-element-id="StartEvent_1eclh91"]')).toBeVisible();

  // go to the documentation page
  const documentationPagePromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'file-pdf' }).click();
  const documentationPage = await documentationPagePromise;

  await expect(documentationPage.getByText('Loading process data')).toBeVisible();
  await expect(documentationPage.getByText('Loading process data')).toBeHidden();

  // check if the process on the page is the correct one
  await expect(documentationPage.getByRole('heading', { name: 'Process 1' })).toBeVisible();
  const infoSection = documentationPage.locator('css=[class^=process-document_TitleInfos]');
  await expect(infoSection).toBeVisible();
  await expect(infoSection.getByText('Owner:')).toBeVisible();
  await expect(infoSection.getByText('Version: Latest')).toBeVisible();
  await expect(infoSection.getByText(/^Last Edit: .+$/)).toBeVisible();

  let elementSections = await documentationPage
    .locator('css=[class^=process-document_ElementPage]')
    .all();

  // check that the elements that should be visible are visible
  expect(elementSections.length).toBe(1);

  // check if the process overview is shown and the bpmn is correct
  const processOverview = elementSections[0];
  expect(processOverview.getByText('Process Diagram')).toBeVisible();
  await expect(
    processOverview.locator('.djs-shape[data-element-id="StartEvent_1eclh91"]'),
  ).toBeVisible();
  await expect(
    processOverview.locator('.djs-connection[data-element-id="Flow_034bmxw"]'),
  ).toBeVisible();
  await expect(
    processOverview.locator('.djs-shape[data-element-id="Activity_1m5esxh"]'),
  ).toBeVisible();
  await expect(
    processOverview.locator('.djs-connection[data-element-id="Flow_0evtfpc"]'),
  ).toBeVisible();
  await expect(
    processOverview.locator('.djs-shape[data-element-id="Event_1oxwp3r"]'),
  ).toBeVisible();
});

test('show content of collapsed subprocesses in a separate section', async ({
  page,
  processListPage,
}) => {
  const { definitionId } = await processListPage.importProcess('subprocess.bpmn');
  await page.locator(`tr[data-row-key="${definitionId}"]>td:nth-child(3)`).click();
  await page.waitForURL(/processes\/[a-z0-9-_]+/);

  await expect(page.locator('.djs-shape[data-element-id="StartEvent_1inc7tc"]')).toBeVisible();

  // go to the documentation page
  const documentationPagePromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'file-pdf' }).click();
  const documentationPage = await documentationPagePromise;

  await expect(documentationPage.getByText('Loading process data')).toBeVisible();
  await expect(documentationPage.getByText('Loading process data')).toBeHidden();

  let elementSections = await documentationPage
    .locator('css=[class^=process-document_ElementPage]')
    .all();

  // check that the elements that should be visible are visible
  expect(elementSections.length).toBe(2);

  // check if the overview of the subprocess is shown and the bpmn is correct
  const subprocessOverview = elementSections[1];
  expect(subprocessOverview.getByText('Subprocess: <Activity_1iz0b2a>')).toBeVisible();
  await expect(
    subprocessOverview.locator('.djs-shape[data-element-id="Event_0ueb679"]'),
  ).toBeVisible();
  await expect(
    subprocessOverview.locator('.djs-connection[data-element-id="Flow_0gdubli"]'),
  ).toBeVisible();
  await expect(
    subprocessOverview.locator('.djs-shape[data-element-id="Activity_0hr3urx"]'),
  ).toBeVisible();
  await expect(
    subprocessOverview.locator('.djs-connection[data-element-id="Flow_09xvh9n"]'),
  ).toBeVisible();
  await expect(
    subprocessOverview.locator('.djs-shape[data-element-id="Event_0wq3coj"]'),
  ).toBeVisible();
});

test('show version information', async ({ page, processListPage, processModelerPage }) => {
  // import the first process imported by the importer process and create a version to reference
  const { definitionId } = await processListPage.importProcess('import1.bpmn');
  await page.locator(`tr[data-row-key="${definitionId}"]>td:nth-child(3)`).click();
  await page.waitForURL(/processes\/[a-z0-9-_]+/);
  await processModelerPage.createVersion('Version 1', 'First Version');
  await page.getByText('Latest Version').click();
  await page.getByText('Version 1').click();
  await page.waitForURL(/\?version=/);

  await expect(page.locator('.djs-shape[data-element-id="StartEvent_0lu383t"]')).toBeVisible();

  // go to the documentation page
  const documentationPagePromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'file-pdf' }).click();
  const documentationPage = await documentationPagePromise;

  await expect(documentationPage.getByText('Loading process data')).toBeVisible();
  await expect(documentationPage.getByText('Loading process data')).toBeHidden();

  // check if the process information includes version information
  await expect(documentationPage.getByRole('heading', { name: 'Import 1' })).toBeVisible();
  const infoSection = documentationPage.locator('css=[class^=process-document_TitleInfos]');
  await expect(infoSection).toBeVisible();
  await expect(infoSection.getByText('Owner:')).toBeVisible();
  await expect(infoSection.getByText('Version: Version 1')).toBeVisible();
  await expect(infoSection.getByText('Version Description: First Version')).toBeVisible();
  await expect(infoSection.getByText(/^Creation Time: .+$/)).toBeVisible();
});

test('show meta data of a process element', async ({ page, processListPage }) => {
  const { definitionId } = await processListPage.importProcess('import1.bpmn');
  await page.locator(`tr[data-row-key="${definitionId}"]>td:nth-child(3)`).click();
  await page.waitForURL(/processes\/[a-z0-9-_]+/);

  await expect(page.locator('.djs-shape[data-element-id="StartEvent_0lu383t"]')).toBeVisible();

  // go to the documentation page
  const documentationPagePromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'file-pdf' }).click();
  const documentationPage = await documentationPagePromise;

  await expect(documentationPage.getByText('Loading process data')).toBeVisible();
  await expect(documentationPage.getByText('Loading process data')).toBeHidden();

  let elementSections = await documentationPage
    .locator('css=[class^=process-document_ElementPage]')
    .all();

  // check that the elements that should be visible are visible
  expect(elementSections.length).toBe(3);

  // check if the overview of the subprocess is shown with its name instead of its id
  const subprocessOverview = elementSections[1];
  expect(subprocessOverview.getByText('Subprocess: A')).toBeVisible();

  // check that there is no meta data for the subprocess
  await expect(
    subprocessOverview.locator('css=[class^=process-document_MetaInformation]'),
  ).toBeHidden();

  // check that the user task that has meta data is shown
  const subprocessMilestoneTask = elementSections[2];
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

  // check if the meta data is shown
  const metaInformation = subprocessMilestoneTask.locator(
    'css=[class^=process-document_MetaInformation]',
  );

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
});

test('recursively show information about imports', async ({
  page,
  processListPage,
  processModelerPage,
}) => {
  // import the first process imported by the importer process and create a version to reference
  const { definitionId: import1Id } = await processListPage.importProcess('import1.bpmn');
  await page.locator(`tr[data-row-key="${import1Id}"]>td:nth-child(3)`).click();
  await page.waitForURL(/processes\/[a-z0-9-_]+/);
  await expect(page.locator('.djs-shape[data-element-id="StartEvent_0lu383t"]')).toBeVisible();
  const import1Version = await processModelerPage.createVersion('Version 1', 'First Version');

  await processListPage.goto();
  // import the second process imported by the importer process and create a version to reference
  const { definitionId: import2Id } = await processListPage.importProcess('import2.bpmn');
  await page.locator(`tr[data-row-key="${import2Id}"]>td:nth-child(3)`).click();
  await page.waitForURL(/processes\/[a-z0-9-_]+/);
  await expect(page.locator('.djs-shape[data-element-id="StartEvent_11c5e5n"]')).toBeVisible();
  const import2Version = await processModelerPage.createVersion('Version 2', 'Second Version');

  await processListPage.goto();
  // import the process that imports the other two and set the correct versions in its bpmn
  const { definitionId: importerId } = await processListPage.importProcess(
    'importer.bpmn',
    undefined,
    async (bpmn) => {
      bpmn = bpmn.replace(/insert-import1-version-here/g, import1Version);
      bpmn = bpmn.replace(/insert-import1-definitionId-here/g, import1Id);
      bpmn = bpmn.replace(/insert-import2-version-here/g, import2Version);
      bpmn = bpmn.replace(/insert-import2-definitionId-here/g, import2Id);
      return bpmn;
    },
  );
  await page.locator(`tr[data-row-key="${importerId}"]>td:nth-child(3)`).click();
  await page.waitForURL(/processes\/[a-z0-9-_]+/);
  await expect(page.locator('.djs-shape[data-element-id="StartEvent_060jvsw"]')).toBeVisible();

  // go to the documentation page
  const documentationPagePromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'file-pdf' }).click();
  const documentationPage = await documentationPagePromise;

  await expect(documentationPage.getByText('Loading process data')).toBeVisible();
  await expect(documentationPage.getByText('Loading process data')).toBeHidden();

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

  // check that the user task in the subprocess in the import that has meta data is shown
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

  // check if the meta data is shown
  metaInformation = subprocessMilestoneTask.locator(
    'css=[class^=process-document_MetaInformation]',
  );

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
});

test('a setting allows to show the subprocess element instead of its content', async ({
  page,
  processListPage,
}) => {
  const { definitionId } = await processListPage.importProcess('import1.bpmn');
  await page.locator(`tr[data-row-key="${definitionId}"]>td:nth-child(3)`).click();
  await page.waitForURL(/processes\/[a-z0-9-_]+/);

  await expect(page.locator('.djs-shape[data-element-id="StartEvent_0lu383t"]')).toBeVisible();

  // go to the documentation page
  const documentationPagePromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'file-pdf' }).click();
  const documentationPage = await documentationPagePromise;

  await expect(documentationPage.getByText('Loading process data')).toBeVisible();
  await expect(documentationPage.getByText('Loading process data')).toBeHidden();

  let elementSections = await documentationPage
    .locator('css=[class^=process-document_ElementPage]')
    .all();

  // check that the elements that should be visible are visible
  expect(elementSections.length).toBe(3);

  // check if the overview of the subprocess is shown with its name instead of its id
  const subprocessOverview = elementSections[1];
  expect(subprocessOverview.getByText('Subprocess: A')).toBeVisible();

  // check that there is no meta data for the subprocess
  await expect(
    subprocessOverview.locator('css=[class^=process-document_MetaInformation]'),
  ).toBeHidden();

  // check that the user task that has meta data is shown
  const subprocessMilestoneTask = elementSections[2];
  await expect(subprocessMilestoneTask.getByRole('heading', { name: 'A.A' })).toBeVisible();

  // check that the visualisation of a subprocess can be set to show the subprocess element instead of the nested subprocess
  // which also removes all contained elements from the page
  let settingsModal = await openModal(documentationPage, () =>
    documentationPage.getByRole('button', { name: 'setting' }).click(),
  );
  await settingsModal.getByLabel('Nested Subprocesses').click();
  await closeModal(settingsModal, () => settingsModal.getByRole('button', { name: 'OK' }).click());

  elementSections = await documentationPage
    .locator('css=[class^=process-document_ElementPage]')
    .all();

  expect(elementSections.length).toBe(2);

  // check if the bpmn shown for the (collapsed) subprocess is the subprocess element instead of the subrocess content
  const import1SubprocessElementView = elementSections[1];
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
});

test('a setting allows to show a call activity instead of the imported process', async ({
  page,
  processListPage,
  processModelerPage,
}) => {
  // import the first process imported by the importer process and create a version to reference
  const { definitionId: import1Id } = await processListPage.importProcess('import1.bpmn');
  await page.locator(`tr[data-row-key="${import1Id}"]>td:nth-child(3)`).click();
  await page.waitForURL(/processes\/[a-z0-9-_]+/);
  await expect(page.locator('.djs-shape[data-element-id="StartEvent_0lu383t"]')).toBeVisible();
  const import1Version = await processModelerPage.createVersion('Version 1', 'First Version');

  await processListPage.goto();
  // import the second process imported by the importer process and create a version to reference
  const { definitionId: import2Id } = await processListPage.importProcess('import2.bpmn');
  await page.locator(`tr[data-row-key="${import2Id}"]>td:nth-child(3)`).click();
  await page.waitForURL(/processes\/[a-z0-9-_]+/);
  await expect(page.locator('.djs-shape[data-element-id="StartEvent_11c5e5n"]')).toBeVisible();
  const import2Version = await processModelerPage.createVersion('Version 2', 'Second Version');

  await processListPage.goto();
  // import the process that imports the other two and set the correct versions in its bpmn
  const { definitionId: importerId } = await processListPage.importProcess(
    'importer.bpmn',
    undefined,
    async (bpmn) => {
      bpmn = bpmn.replace(/insert-import1-version-here/g, import1Version);
      bpmn = bpmn.replace(/insert-import1-definitionId-here/g, import1Id);
      bpmn = bpmn.replace(/insert-import2-version-here/g, import2Version);
      bpmn = bpmn.replace(/insert-import2-definitionId-here/g, import2Id);
      return bpmn;
    },
  );
  await page.locator(`tr[data-row-key="${importerId}"]>td:nth-child(3)`).click();
  await page.waitForURL(/processes\/[a-z0-9-_]+/);
  await expect(page.locator('.djs-shape[data-element-id="StartEvent_060jvsw"]')).toBeVisible();

  // go to the documentation page
  const documentationPagePromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'file-pdf' }).click();
  const documentationPage = await documentationPagePromise;

  await expect(documentationPage.getByText('Loading process data')).toBeVisible();
  await expect(documentationPage.getByText('Loading process data')).toBeHidden();

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

  // check that the visualisation of a call activity can be set to show the call activity element instead of the imported process
  // which also removes all contained elements from the page
  const settingsModal = await openModal(documentationPage, () =>
    documentationPage.getByRole('button', { name: 'setting' }).click(),
  );
  await settingsModal.getByLabel('Imported Processes').click();
  await closeModal(settingsModal, () => settingsModal.getByRole('button', { name: 'OK' }).click());

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
});

test('a setting allows to show elements that have no meta data which are not shown by default', async ({
  page,
  processListPage,
}) => {
  const { definitionId } = await processListPage.importProcess('import1.bpmn');
  await page.locator(`tr[data-row-key="${definitionId}"]>td:nth-child(3)`).click();
  await page.waitForURL(/processes\/[a-z0-9-_]+/);

  await expect(page.locator('.djs-shape[data-element-id="StartEvent_0lu383t"]')).toBeVisible();

  // go to the documentation page
  const documentationPagePromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'file-pdf' }).click();
  const documentationPage = await documentationPagePromise;

  await expect(documentationPage.getByText('Loading process data')).toBeVisible();
  await expect(documentationPage.getByText('Loading process data')).toBeHidden();

  let elementSections = await documentationPage
    .locator('css=[class^=process-document_ElementPage]')
    .all();

  // check that the elements that should be visible are visible
  expect(elementSections.length).toBe(3);

  // check that the option to show elements that have no meta data and contain no other elements works as well (here in combination with the previously deselected options)
  const settingsModal = await openModal(documentationPage, () =>
    documentationPage.getByRole('button', { name: 'setting' }).click(),
  );
  await settingsModal.getByLabel('Exclude Empty Elements').click();

  // prevent the tooltip of the unchecked checkbox from overlapping the confirmation button when we try to click it next
  let tooltips = await documentationPage.getByRole('tooltip').all();
  await documentationPage.mouse.move(0, 0);
  await Promise.all(tooltips.map((tooltip) => tooltip.waitFor({ state: 'hidden' })));

  await closeModal(settingsModal, () => settingsModal.getByRole('button', { name: 'OK' }).click());

  const elementSection = await documentationPage.locator(
    'css=[class^=process-document_ElementPage]',
  );

  expect(elementSection).toHaveCount(9);
  // there should be sections for all the elements in the root process including the start and end event
  // but there should not be sections for sequence flows
  expect(elementSection.first().getByText('Process Diagram')).toBeVisible();
  expect(elementSection.getByRole('heading', { name: /^B$/ })).toBeVisible();
  expect(elementSection.getByText('<Event_1dwf3dy>')).toBeVisible();
  expect(elementSection.getByText('<StartEvent_0lu383t>')).toBeVisible();
  expect(elementSection.getByText('Subprocess: A')).toBeVisible();
  expect(elementSection.getByText('<Event_0dadznn>')).toBeVisible();
  expect(elementSection.getByText('<Event_1ney7ih>')).toBeVisible();
  expect(elementSection.getByRole('heading', { name: 'A.A' })).toBeVisible();
  expect(elementSection.getByRole('heading', { name: 'A.B' })).toBeVisible();
});

test('the page shows only imported processes that are shared themselves to other users', async ({
  page,
  processListPage,
  processModelerPage,
  ms2Page,
}) => {
  test.slow();
  // import the first process imported by the importer process and create a version to reference
  const { definitionId: import1Id } = await processListPage.importProcess('import1.bpmn');
  await page.locator(`tr[data-row-key="${import1Id}"]>td:nth-child(3)`).click();
  await page.waitForURL(/processes\/[a-z0-9-_]+/);
  await expect(page.locator('.djs-shape[data-element-id="StartEvent_0lu383t"]')).toBeVisible();
  const import1Version = await processModelerPage.createVersion('Version 1', 'First Version');

  await processListPage.goto();
  // import the second process imported by the importer process and create a version to reference
  const { definitionId: import2Id } = await processListPage.importProcess('import2.bpmn');
  await page.locator(`tr[data-row-key="${import2Id}"]>td:nth-child(3)`).click();
  await page.waitForURL(/processes\/[a-z0-9-_]+/);
  await expect(page.locator('.djs-shape[data-element-id="StartEvent_11c5e5n"]')).toBeVisible();
  const import2Version = await processModelerPage.createVersion('Version 2', 'Second Version');

  // share this process so it is visible in the  documentation for other users
  const shareModal = await openModal(page, () =>
    page.getByRole('button', { name: 'share-alt' }).click(),
  );
  await shareModal.getByText('Share Process with Public Link').click();
  await page
    .locator('.ant-message')
    .filter({ hasText: 'Process shared' })
    .waitFor({ state: 'visible' });

  await processListPage.goto();
  // import the process that imports the other two and set the correct versions in its bpmn
  const { definitionId: importerId } = await processListPage.importProcess(
    'importer.bpmn',
    undefined,
    async (bpmn) => {
      bpmn = bpmn.replace(/insert-import1-version-here/g, import1Version);
      bpmn = bpmn.replace(/insert-import1-definitionId-here/g, import1Id);
      bpmn = bpmn.replace(/insert-import2-version-here/g, import2Version);
      bpmn = bpmn.replace(/insert-import2-definitionId-here/g, import2Id);
      return bpmn;
    },
  );
  await page.locator(`tr[data-row-key="${importerId}"]>td:nth-child(3)`).click();
  await page.waitForURL(/processes\/[a-z0-9-_]+/);
  await expect(page.locator('.djs-shape[data-element-id="StartEvent_060jvsw"]')).toBeVisible();

  // go to the documentation page
  const documentationPagePromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'file-pdf' }).click();
  const documentationPage = await documentationPagePromise;

  await expect(documentationPage.getByText('Loading process data')).toBeVisible();
  await expect(documentationPage.getByText('Loading process data')).toBeHidden();

  let elementSections = await documentationPage
    .locator('css=[class^=process-document_ElementPage]')
    .all();

  // check that the elements that should be visible to the owner are visible
  expect(elementSections.length).toBe(5);

  // check if the process overview is shown and the bpmn is correct
  const processOverview = elementSections[0];
  expect(processOverview.getByText('Process Diagram')).toBeVisible();

  // check if the overview of the first import is shown and the bpmn is correct
  const import1Overview = elementSections[1];
  expect(import1Overview.getByText('Imported Process: Import 1')).toBeVisible();

  // check if the overview of the subprocess in the first import is shown and the bpmn is correct
  const import1SubprocessOverview = elementSections[2];
  expect(import1SubprocessOverview.getByText('Subprocess: A')).toBeVisible();

  // check that the user task in the subprocess in the import that has meta data is shown
  const subprocessMilestoneTask = elementSections[3];
  await expect(subprocessMilestoneTask.getByRole('heading', { name: 'A.A' })).toBeVisible();

  // check if the overview of the first import is shown and the bpmn is correct
  const import2Overview = elementSections[4];
  expect(import2Overview.getByText('Imported Process: Import 2')).toBeVisible();

  // share process with link
  await openModal(page, () => page.getByRole('button', { name: 'share-alt' }).click());

  await page.getByRole('button', { name: 'Share Public Link' }).click();
  await page.getByText('Share Process with Public Link').click();

  await expect(page.locator('input[name="generated share link"]')).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Copy link' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Save QR Code' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Copy QR Code' })).toBeEnabled();

  await page.getByRole('button', { name: 'Copy link' }).click();

  const clipboardData = await ms2Page.readClipboard(true);

  // Visit the shared link
  const browser: Browser = await chromium.launch();
  const newPage: Page = await browser.newPage();

  await newPage.goto(`${clipboardData}`);
  await newPage.waitForURL(`${clipboardData}`);

  // check that the imported processes that are not shared are not visible to an non-owner

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
});

test('allow a different user that was given the share link to import the shared process', async ({
  page,
  processListPage,
  ms2Page,
}) => {
  const { definitionId } = await processListPage.importProcess('process1.bpmn');
  await page.locator(`tr[data-row-key="${definitionId}"]>td:nth-child(3)`).click();
  await page.waitForURL(/processes\/[a-z0-9-_]+/);

  await expect(page.locator('.djs-shape[data-element-id="StartEvent_1eclh91"]')).toBeVisible();

  // go to the documentation page
  const documentationPagePromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'file-pdf' }).click();
  const documentationPage = await documentationPagePromise;

  await expect(documentationPage.getByText('Loading process data')).toBeVisible();
  await expect(documentationPage.getByText('Loading process data')).toBeHidden();

  // check that the "Add to your workspace option is not shown to a user that already owns the process"
  await expect(
    documentationPage.getByRole('button', { name: 'Add to your workspace' }),
  ).toBeHidden();

  // share process with link
  await openModal(page, () => page.getByRole('button', { name: 'share-alt' }).click());

  await page.getByRole('button', { name: 'Share Public Link' }).click();
  await page.getByText('Share Process with Public Link').click();

  await expect(page.locator('input[name="generated share link"]')).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Copy link' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Save QR Code' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Copy QR Code' })).toBeEnabled();

  await page.getByRole('button', { name: 'Copy link' }).click();

  const clipboardData = await ms2Page.readClipboard(true);

  // Visit the shared link
  const browser: Browser = await chromium.launch();
  const newPage: Page = await browser.newPage();

  await newPage.goto(`${clipboardData}`);
  await newPage.waitForURL(`${clipboardData}`);

  // check that the add to workspace button is visible since the user does not own the process
  await expect(newPage.getByRole('button', { name: 'Add to your workspace' })).toBeVisible();

  // Add the shared process to the workspace
  await newPage.getByRole('button', { name: 'Add to your workspace' }).click();
  await newPage.waitForURL(/signin\?callbackUrl=([^]+)/);

  await newPage.getByRole('button', { name: 'Create a Process' }).click();
  await newPage.waitForURL(/shared-viewer\?token=([^]+)/);

  await newPage.getByRole('button', { name: 'My Space' }).click();
  await newPage.waitForURL(/processes\/[a-z0-9-_]+/);

  const newProcessId = newPage.url().split('/processes/').pop();

  await newPage.getByRole('link', { name: 'process list' }).click();
  await newPage.waitForURL(/processes/);
  await expect(newPage.locator(`tr[data-row-key="${newProcessId}"]`)).toBeVisible();

  // cleanup the process added by the guest user
  const deleteModal = await openModal(newPage, () =>
    newPage
      .locator(`tr[data-row-key="${newProcessId}"]`)
      .getByRole('button', { name: 'delete' })
      .click(),
  );
  await closeModal(deleteModal, () => deleteModal.getByRole('button', { name: 'OK' }).click());
});
