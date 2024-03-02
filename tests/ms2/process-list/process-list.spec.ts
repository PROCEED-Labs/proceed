import { test, expect } from './process-list.fixtures';

test('create a new process and remove it again', async ({ processListPage }) => {
  const { page } = processListPage;

  await page.getByRole('button', { name: 'New Process' }).click();
  await page.getByRole('textbox', { name: '* Process Name :' }).fill('Process Name');
  await page.getByLabel('Process Description').click();
  await page.getByLabel('Process Description').fill('Process Description');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.waitForTimeout(2000);

  const processDefinitionID = page
    .url()
    .split(processListPage.getPageURL() + '/')
    .pop();

  await processListPage.goto();

  await expect(page.locator(`tr[data-row-key="${processDefinitionID}"]`)).toBeVisible();

  await page
    .locator(`tr[data-row-key="${processDefinitionID}"]`)
    .getByRole('button', { name: 'delete' })
    .click();

  await page.getByRole('button', { name: 'OK' }).click();

  await expect(page.locator(`tr[data-row-key="${processDefinitionID}"]`)).not.toBeVisible();
});

test('open the export dialog for a single process', async ({ processListPage }) => {
  const { page } = processListPage;

  const definitionId = await processListPage.createProcess();

  await page.locator(`tr[data-row-key="${definitionId}"]`).getByLabel('export').click();

  await expect(page.getByTestId('Export Modal').getByRole('dialog')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');

  await page.getByRole('radio', { name: 'bpmn' }).click();
  await page.getByRole('button', { name: 'OK' }).click();

  const download = await downloadPromise;

  const stream = await download.createReadStream();

  // stream to string: https://stackoverflow.com/a/49428486
  const data = await new Promise((resolve, reject) => {
    let chunks = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });

  console.log(data);

  await processListPage.removeProcess(definitionId);
});

test('open the export dialog for multiple processes', async ({ processListPage }) => {
  const { page } = processListPage;

  const process1Id = await processListPage.createProcess({
    processName: 'Process 1',
    description: 'Description 1',
  });
  const process2Id = await processListPage.createProcess({
    processName: 'Process 2',
    description: 'Description 2',
  });
  const process3Id = await processListPage.createProcess({
    processName: 'Process 3',
    description: 'Description 3',
  });

  // Select processes 1 and 3
  await page.locator(`tr[data-row-key="${process1Id}"]`).getByRole('checkbox').click();
  await page.locator(`tr[data-row-key="${process3Id}"]`).getByRole('checkbox').click();

  await page.getByLabel('export').first().click();

  await expect(page.getByTestId('Export Modal').getByRole('dialog')).toBeVisible();

  await page.getByRole('button', { name: 'close' }).click();

  await processListPage.removeAllProcesses();
});
