import { Browser, Page, chromium, firefox } from '@playwright/test';
import { test, expect } from './process-list.fixtures';

test('create a new process and remove it again', async ({ processListPage }) => {
  const { page } = processListPage;

  await page.getByRole('button', { name: 'New Process' }).click();
  await page.getByRole('textbox', { name: '* Process Name :' }).fill('Process Name');
  await page.getByLabel('Process Description').click();
  await page.getByLabel('Process Description').fill('Process Description');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.waitForURL(/processes\/[a-z0-9-_]+/);

  const processDefinitionID = page.url().split('processes/').pop();

  await processListPage.goto();

  await expect(page.locator(`tr[data-row-key="${processDefinitionID}"]`)).toBeVisible();

  await page
    .locator(`tr[data-row-key="${processDefinitionID}"]`)
    .getByRole('button', { name: 'delete' })
    .click();

  await page.getByRole('button', { name: 'OK' }).click();

  await expect(page.locator(`tr[data-row-key="${processDefinitionID}"]`)).not.toBeVisible();
});

test('import a process', async ({ processListPage }) => {
  const { page } = processListPage;

  const { definitionId } = await processListPage.importProcess('process1.bpmn');

  // open the new process in the modeler
  await page.locator(`tr[data-row-key="${definitionId}"]`).dblclick();
  await page.waitForURL(/processes\/[a-z0-9-_]+/);

  // check if the process in the modeler is the one that we tried to import
  await expect(page.locator('svg[data-element-id="Process_05s7742"]')).toBeVisible();
  await expect(page.locator('.djs-shape[data-element-id="StartEvent_1eclh91"]')).toBeVisible();
  await expect(page.locator('.djs-connection[data-element-id="Flow_034bmxw"]')).toBeVisible();
  await expect(page.locator('.djs-shape[data-element-id="Activity_1m5esxh"]')).toBeVisible();
  await expect(page.locator('.djs-connection[data-element-id="Flow_0evtfpc"]')).toBeVisible();
  await expect(page.locator('.djs-shape[data-element-id="Event_1oxwp3r"]')).toBeVisible();

  await processListPage.goto();
  await processListPage.removeProcess(definitionId);
});

test('export a single process', async ({ processListPage }) => {
  const { page } = processListPage;

  const { definitionId, bpmn: importBpmn } = await processListPage.importProcess('process1.bpmn');

  /*************************** BPMN Export ********************************/

  await page.locator(`tr[data-row-key="${definitionId}"]`).getByLabel('export').click();
  await expect(page.getByTestId('Export Modal').getByRole('dialog')).toBeVisible();
  await page.getByRole('radio', { name: 'bpmn' }).click();
  const { filename: bpmnFilename, content: exportBpmn } = await processListPage.handleDownload(
    async () => await page.getByRole('button', { name: 'OK' }).click(),
    'string',
  );
  expect(bpmnFilename).toMatch(/.bpmn$/);
  // check if the exported data is the expected bpmn (the one that was initially imported)
  expect(exportBpmn).toBe(importBpmn);

  /*************************** SVG Export ********************************/

  // test the svg export with only a single file
  await page.locator(`tr[data-row-key="${definitionId}"]`).getByLabel('export').click();
  await expect(page.getByTestId('Export Modal').getByRole('dialog')).toBeVisible();
  await page.getByRole('radio', { name: 'svg' }).click();
  const { filename: svgFilename, content: exportSvg } = await processListPage.handleDownload(
    async () => await page.getByRole('button', { name: 'OK' }).click(),
    'string',
  );

  // check that the exported svg matches the imported bpmn
  expect(svgFilename).toMatch(/.svg$/);
  expect(exportSvg).toMatch(/<svg/);
  expect(exportSvg).toMatch(/data-element-id="StartEvent_1eclh91"/);
  expect(exportSvg).toMatch(/data-element-id="Flow_034bmxw"/);
  expect(exportSvg).toMatch(/data-element-id="Activity_1m5esxh"/);
  expect(exportSvg).toMatch(/data-element-id="Flow_0evtfpc"/);
  expect(exportSvg).toMatch(/data-element-id="Event_1oxwp3r"/);

  // import a process containing collapsed subprocesses
  const { definitionId: subprocessDefinitionId, definitionName: subprocessDefinitionName } =
    await processListPage.importProcess('subprocess.bpmn');
  // test the svg export with an additional file being exported (export of subprocesses is being selected)
  await page.locator(`tr[data-row-key="${subprocessDefinitionId}"]`).getByLabel('export').click();
  await expect(page.getByTestId('Export Modal').getByRole('dialog')).toBeVisible();
  await page.getByRole('radio', { name: 'svg' }).click();
  await page.getByRole('checkbox', { name: 'with collapsed subprocesses' }).click();
  const { filename: multiSvgFilename, content: svgZip } = await processListPage.handleDownload(
    async () => await page.getByRole('button', { name: 'OK' }).click(),
    'zip',
  );

  // check that a zip has been exported
  expect(multiSvgFilename).toMatch(/.zip$/);

  function getFolderName(definitionName: string) {
    return definitionName.split(' ').join('_');
  }
  function hasFolder(zipFile: typeof svgZip, folderName: string) {
    return Object.values(zipFile.files)
      .filter((file) => file.dir)
      .some((dir) => dir.name === folderName + '/');
  }

  // check that there is a folder for the process containing two svgs, one for the root layer and one for the subprocess layer
  expect(hasFolder(svgZip, getFolderName(subprocessDefinitionName))).toBeTruthy();
  expect(svgZip.file(getFolderName(subprocessDefinitionName) + '/' + 'latest.svg')).toBeTruthy();
  expect(
    svgZip.file(
      getFolderName(subprocessDefinitionName) + '/' + 'latest_subprocess_Activity_1iz0b2a.svg',
    ),
  ).toBeTruthy();

  // check that the svg files contain the expected content
  const rootSvg = await svgZip
    .file(getFolderName(subprocessDefinitionName) + '/' + 'latest.svg')!
    .async('string');

  expect(rootSvg).toMatch(/<svg/);
  expect(rootSvg).toMatch(/data-element-id="StartEvent_1inc7tc"/);
  expect(rootSvg).toMatch(/data-element-id="Flow_1nwk7gv"/);
  expect(rootSvg).toMatch(/data-element-id="Activity_1iz0b2a"/);
  expect(rootSvg).toMatch(/data-element-id="Flow_1q734k8"/);
  expect(rootSvg).toMatch(/data-element-id="Event_1n7bc2z"/);

  const subprocessSvg = await svgZip
    .file(getFolderName(subprocessDefinitionName) + '/' + 'latest_subprocess_Activity_1iz0b2a.svg')!
    .async('string');

  expect(subprocessSvg).toMatch(/<svg/);
  expect(subprocessSvg).toMatch(/data-element-id="Event_0ueb679"/);
  expect(subprocessSvg).toMatch(/data-element-id="Flow_0gdubli"/);
  expect(subprocessSvg).toMatch(/data-element-id="Activity_0hr3urx"/);
  expect(subprocessSvg).toMatch(/data-element-id="Flow_09xvh9n"/);
  expect(subprocessSvg).toMatch(/data-element-id="Event_0wq3coj"/);

  /*************************** PNG Export ********************************/

  // test the png export with only a single file
  await page.locator(`tr[data-row-key="${definitionId}"]`).getByLabel('export').click();
  await expect(page.getByTestId('Export Modal').getByRole('dialog')).toBeVisible();
  await page.getByRole('radio', { name: 'png' }).click();
  const { filename: pngFilename, content: exportPng } = await processListPage.handleDownload(
    async () => await page.getByRole('button', { name: 'OK' }).click(),
    'string',
  );

  // check that a png has been exported
  expect(pngFilename).toMatch(/.png$/);

  // test the png export with an additional file being exported (export of subprocesses is being selected)
  await page.locator(`tr[data-row-key="${subprocessDefinitionId}"]`).getByLabel('export').click();
  await expect(page.getByTestId('Export Modal').getByRole('dialog')).toBeVisible();
  await page.getByRole('radio', { name: 'png' }).click();
  // the selection of the "with selected subprocesses" option should still be valid
  await expect(page.getByRole('checkbox', { name: 'with collapsed subprocesses' })).toBeChecked();

  const { filename: multiPngFilename, content: pngZip } = await processListPage.handleDownload(
    async () => await page.getByRole('button', { name: 'OK' }).click(),
    'zip',
  );

  // check that a zip has been exported
  expect(multiPngFilename).toMatch(/.zip$/);

  // check that there is a folder for the process containing two pngs, one for the root layer and one for the subprocess layer
  expect(hasFolder(pngZip, getFolderName(subprocessDefinitionName))).toBeTruthy();
  expect(pngZip.file(getFolderName(subprocessDefinitionName) + '/' + 'latest.png')).toBeTruthy();
  expect(
    pngZip.file(
      getFolderName(subprocessDefinitionName) + '/' + 'latest_subprocess_Activity_1iz0b2a.png',
    ),
  ).toBeTruthy();
});

test('export multiple processes', async ({ processListPage }) => {
  const { page } = processListPage;

  const {
    definitionId: process1Id,
    definitionName: process1Name,
    bpmn: process1Bpmn,
  } = await processListPage.importProcess('process1.bpmn');
  const { definitionName: process2Name } = await processListPage.importProcess('process2.bpmn');
  const {
    definitionId: process3Id,
    definitionName: process3Name,
    bpmn: process3Bpmn,
  } = await processListPage.importProcess('process3.bpmn');

  /*************************** BPMN Export ********************************/

  // Select processes 1 and 3
  await page.locator(`tr[data-row-key="${process1Id}"]`).getByRole('checkbox').click();
  await page.locator(`tr[data-row-key="${process3Id}"]`).getByRole('checkbox').click();

  await page.getByLabel('export').first().click();

  await expect(page.getByTestId('Export Modal').getByRole('dialog')).toBeVisible();

  await page.getByRole('radio', { name: 'bpmn' }).click();

  const { filename, content: zip } = await processListPage.handleDownload(
    async () => await page.getByRole('button', { name: 'OK' }).click(),
    'zip',
  );

  expect(filename).toMatch(/.zip$/);

  function getFolderName(definitionName: string) {
    return definitionName.split(' ').join('_');
  }

  function hasFolder(zipFile: typeof zip, folderName: string) {
    return Object.values(zipFile.files)
      .filter((file) => file.dir)
      .some((dir) => dir.name === folderName + '/');
  }

  // check that there is a folder for each process that was selected for export and none for the one not selected
  expect(hasFolder(zip, getFolderName(process1Name))).toBeTruthy();
  expect(hasFolder(zip, getFolderName(process2Name))).toBeFalsy();
  expect(hasFolder(zip, getFolderName(process3Name))).toBeTruthy();

  // check that each folder contains the latest bpmn of the process
  expect(zip.file(getFolderName(process1Name) + '/' + 'latest.bpmn')).toBeTruthy();
  const process1FileContent = await zip
    .file(getFolderName(process1Name) + '/' + 'latest.bpmn')!
    .async('string');
  expect(process1FileContent).toBe(process1Bpmn);

  expect(zip.file(getFolderName(process3Name) + '/' + 'latest.bpmn')).toBeTruthy();
  const process3FileContent = await zip
    .file(getFolderName(process3Name) + '/' + 'latest.bpmn')!
    .async('string');
  expect(process3FileContent).toBe(process3Bpmn);

  /*************************** SVG Export ********************************/

  await page.getByLabel('export').first().click();

  await expect(page.getByTestId('Export Modal').getByRole('dialog')).toBeVisible();

  await page.getByRole('radio', { name: 'svg' }).click();
  await page.getByRole('checkbox', { name: 'with collapsed subprocesses' }).click();

  const { filename: svgZipFilename, content: svgZip } = await processListPage.handleDownload(
    async () => await page.getByRole('button', { name: 'OK' }).click(),
    'zip',
  );

  expect(svgZipFilename).toMatch(/.zip$/);

  // check that there is a folder for each process that was selected for export and none for the one not selected
  expect(hasFolder(svgZip, getFolderName(process1Name))).toBeTruthy();
  expect(hasFolder(svgZip, getFolderName(process2Name))).toBeFalsy();
  expect(hasFolder(svgZip, getFolderName(process3Name))).toBeTruthy();

  // check that each folder contains the latest svg of the process
  expect(svgZip.file(getFolderName(process1Name) + '/' + 'latest.svg')).toBeTruthy();
  expect(svgZip.file(getFolderName(process3Name) + '/' + 'latest.svg')).toBeTruthy();
  expect(svgZip.file(getFolderName(process3Name) + '/' + 'latest_subprocess_X.svg')).toBeTruthy();
  expect(svgZip.file(getFolderName(process3Name) + '/' + 'latest_subprocess_Y.svg')).toBeTruthy();

  /*************************** PNG Export ********************************/

  await page.getByLabel('export').first().click();

  await expect(page.getByTestId('Export Modal').getByRole('dialog')).toBeVisible();

  await page.getByRole('radio', { name: 'png' }).click();
  // the selection of the "with selected subprocesses" option should still be valid
  await expect(page.getByRole('checkbox', { name: 'with collapsed subprocesses' })).toBeChecked();

  const { filename: pngZipFilename, content: pngZip } = await processListPage.handleDownload(
    async () => await page.getByRole('button', { name: 'OK' }).click(),
    'zip',
  );

  expect(pngZipFilename).toMatch(/.zip$/);

  // check that there is a folder for each process that was selected for export and none for the one not selected
  expect(hasFolder(pngZip, getFolderName(process1Name))).toBeTruthy();
  expect(hasFolder(pngZip, getFolderName(process2Name))).toBeFalsy();
  expect(hasFolder(pngZip, getFolderName(process3Name))).toBeTruthy();

  // check that each folder contains the latest svg of the process
  expect(pngZip.file(getFolderName(process1Name) + '/' + 'latest.png')).toBeTruthy();
  expect(pngZip.file(getFolderName(process3Name) + '/' + 'latest.png')).toBeTruthy();
  expect(pngZip.file(getFolderName(process3Name) + '/' + 'latest_subprocess_X.png')).toBeTruthy();
  expect(pngZip.file(getFolderName(process3Name) + '/' + 'latest_subprocess_Y.png')).toBeTruthy();
});

test('share-modal-test', async ({ processListPage }) => {
  const { page } = processListPage;

  let clipboardData: string;

  const { definitionId: process1Id } = await processListPage.importProcess('process1.bpmn');
  await page.goto(`/processes/${process1Id}`);
  await page.waitForURL(/processes\/[a-z0-9-_]+/);

  await page.getByRole('button', { name: 'share-alt' }).click();

  //await expect(page.getByText('Share', { exact: true })).toBeVisible();

  /*************************** Embed in Website ********************************/

  await page.getByRole('button', { name: 'Embed in Website' }).click();
  await expect(page.getByText('Allow iframe Embedding', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Allow iframe Embedding' }).click();
  await expect(page.locator('div[class="code"]')).toBeVisible();
  await page.getByTitle('copy code', { exact: true }).click();

  clipboardData = await processListPage.readClipboard(true);

  const regex =
    /<iframe src='((http|https):\/\/[a-zA-Z]+:[0-9]+\/shared-viewer\?token=[a-zA-Z0-9._-]+)'/;
  expect(clipboardData).toMatch(regex);

  /*************************** Copy Diagram As PNG ********************************/
  // skip this test for firebox
  if (page.context().browser().browserType() !== firefox) {
    await page.getByTitle('Copy Diagram as PNG', { exact: true }).click();
    await page.waitForTimeout(200);
    clipboardData = await processListPage.readClipboard(false);
    await expect(clipboardData).toMatch('image/png');
  }

  /*************************** Copy Diagram As XML ********************************/

  await page.getByTitle('Copy Diagram as XML', { exact: true }).click();

  clipboardData = await processListPage.readClipboard(true);

  const xmlRegex = /<([a-zA-Z0-9\-:_]+)[^>]*>[\s\S]*?<\/\1>/g;
  await expect(clipboardData).toMatch(xmlRegex);

  /*************************** Export as File ********************************/
  await page.getByTitle('Export as file', { exact: true }).click();
  await expect(page.getByTestId('Export Modal').getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'cancel' }).click();

  /*************************** Share Process with link ********************************/
  await page.getByRole('button', { name: 'Share Public Link' }).click();
  await page.getByText('Share Process with Public Link').click();

  await expect(page.locator('input[name="generated share link"]')).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Copy link' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Save QR Code' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Copy QR Code' })).toBeEnabled();

  await page.getByRole('button', { name: 'Copy link' }).click();

  clipboardData = await processListPage.readClipboard(true);

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
