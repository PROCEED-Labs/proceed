import { test, expect } from './properties-panel.fixtures';

test('open properties panel for process', async ({ propertiesPanelPage }) => {
  const openButton = propertiesPanelPage.page.getByRole('button', { name: 'info-circle' });
  await openButton.click();

  const generalSection = propertiesPanelPage.page.getByTestId('generalSection');

  expect(await generalSection.locator('input[name="Name"]').isDisabled()).toBe(true);

  expect(await generalSection.locator('input[name="Type"]').isDisabled()).toBe(true);

  const imageSection = propertiesPanelPage.page.getByTestId('imageSection');

  expect(await imageSection.innerText()).toEqual('Add Image');

  const fileChooserPromise = propertiesPanelPage.page.waitForEvent('filechooser');
  await imageSection.getByText('Add Image').click();
  const fileChooser = await fileChooserPromise;
  const imagePath = propertiesPanelPage.path.join(__dirname, 'example-image.jpg');
  await fileChooser.setFiles(imagePath);

  await propertiesPanelPage.page.waitForTimeout(1000); // wait until image is loaded

  expect(await imageSection.innerText()).toEqual('Edit Image');

  const descriptionSection = propertiesPanelPage.page.getByTestId('descriptionSection');
  await expect(descriptionSection.getByText('Process Description', { exact: true })).toBeVisible();

  await descriptionSection.getByLabel('edit').click(); // click edit description button
  await propertiesPanelPage.page
    .locator('.toastui-editor-ww-container > .toastui-editor > .ProseMirror')
    .fill('New Description');
  await propertiesPanelPage.page.getByRole('button', { name: 'Save' }).click();

  await propertiesPanelPage.page.waitForTimeout(500); // wait until description dialog is closed

  expect(descriptionSection).toContainText('New Description');

  const milestonesSection = propertiesPanelPage.page.getByTestId('milestonesSection');

  await expect(milestonesSection.getByText('No data')).toBeVisible();

  await milestonesSection.getByLabel('plus').click();

  const milestonesModal = propertiesPanelPage.page.getByLabel('Create new Milestone');

  await milestonesModal.getByPlaceholder('Milestone ID').fill('123');
  await milestonesModal.getByPlaceholder('Milestone Name').fill('Milestone A');
  await milestonesModal
    .locator('.toastui-editor-ww-container > .toastui-editor > .ProseMirror')
    .fill('Milestone Description');

  await milestonesModal.getByRole('button', { name: 'Create Milestone' }).click();

  await propertiesPanelPage.page.waitForTimeout(500); // wait until milestone modal is closed

  // TODO: Check if milestone entry was added to table

  expect(await propertiesPanelPage.page.getByPlaceholder('Planned Cost').inputValue()).toEqual('');
  await propertiesPanelPage.page.getByTestId('plannedCostInputEdit').click();
  await propertiesPanelPage.page.getByPlaceholder('Planned Cost').fill('100');
  expect(await propertiesPanelPage.page.getByPlaceholder('Planned Cost').inputValue()).toEqual(
    '100',
  );

  expect(await propertiesPanelPage.page.getByPlaceholder('Planned Duration').inputValue()).toEqual(
    '',
  );

  await propertiesPanelPage.page.getByTestId('plannedDurationInputEdit').click();

  await propertiesPanelPage.page.locator('input[name="years"]').fill('1');
  await propertiesPanelPage.page.locator('input[name="months"]').fill('2');
  await propertiesPanelPage.page.locator('input[name="days"]').fill('3');
  await propertiesPanelPage.page.getByRole('button', { name: 'Save' }).click();

  propertiesPanelPage.page.waitForTimeout(500);
  expect(await propertiesPanelPage.page.getByPlaceholder('Planned Duration').inputValue()).toEqual(
    '1 Years, 2 Months, 3 Days',
  );

  await propertiesPanelPage.page.getByTestId('plannedDurationInputEdit').click();

  await propertiesPanelPage.page.locator('input[name="years"]').fill('1');
  await propertiesPanelPage.page.locator('input[name="months"]').fill('2');
  await propertiesPanelPage.page.locator('input[name="days"]').fill('3');
  await propertiesPanelPage.page.locator('input[name="hours"]').fill('4');
  await propertiesPanelPage.page.locator('input[name="minutes"]').fill('5');
  await propertiesPanelPage.page.locator('input[name="seconds"]').fill('6');
  await propertiesPanelPage.page.getByRole('button', { name: 'Save' }).click();

  propertiesPanelPage.page.waitForTimeout(500);
  expect(await propertiesPanelPage.page.getByPlaceholder('Planned Duration').inputValue()).toEqual(
    '1 Y, 2 M, 3 D, 4 H, 5 M, 6 S ',
  );

  const customPropertiesSection = propertiesPanelPage.page.getByTestId('customPropertiesSection');

  expect(await customPropertiesSection.getByPlaceholder('Custom Name').inputValue()).toEqual('');
  await customPropertiesSection.getByPlaceholder('Custom Name').fill('New Custom Property');
  expect(await customPropertiesSection.getByPlaceholder('Custom Value').inputValue()).toEqual('');
  await customPropertiesSection.getByPlaceholder('Custom Value').fill('New Custom Value');

  customPropertiesSection.locator('form').getByRole('button', { name: 'plus' }).click();
  await propertiesPanelPage.page.waitForTimeout(500);

  expect(await customPropertiesSection.getByPlaceholder('Custom Name').count()).toEqual(2);
  expect(await customPropertiesSection.getByPlaceholder('Custom Value').count()).toEqual(2);
  expect(
    await customPropertiesSection.getByPlaceholder('Custom Name').first().inputValue(),
  ).toEqual('New Custom Property');
  expect(
    await customPropertiesSection.getByPlaceholder('Custom Value').first().inputValue(),
  ).toEqual('New Custom Value');
  expect(await customPropertiesSection.getByPlaceholder('Custom Name').nth(1).inputValue()).toEqual(
    '',
  );
  expect(
    await customPropertiesSection.getByPlaceholder('Custom Value').nth(1).inputValue(),
  ).toEqual('');

  await customPropertiesSection.getByRole('button', { name: 'delete' }).click();

  expect(await customPropertiesSection.getByPlaceholder('Custom Name').count()).toEqual(1);
  expect(await customPropertiesSection.getByPlaceholder('Custom Name').inputValue()).toEqual('');
  expect(await customPropertiesSection.getByPlaceholder('Custom Value').count()).toEqual(1);
  expect(await customPropertiesSection.getByPlaceholder('Custom Value').inputValue()).toEqual('');
});

test('open properties panel for element', async ({ propertiesPanelPage }) => {
  await propertiesPanelPage.page.locator('rect').first().click(); // click on start event (which is the only element in this process)

  const openButton = propertiesPanelPage.page.getByRole('button', { name: 'info-circle' });
  await openButton.click();

  const generalSection = propertiesPanelPage.page.getByTestId('generalSection');
  expect(await generalSection.locator('input[name="Name"]').inputValue()).toEqual('');

  await generalSection.getByTestId('nameInputEdit').click();

  await generalSection.locator('input[name="Name"]').fill('New Name');
  expect(await generalSection.locator('input[name="Name"]').inputValue()).toEqual('New Name');

  expect(await generalSection.locator('input[name="Type"]').isDisabled()).toBe(true);
  expect(await generalSection.locator('input[name="Type"]').inputValue()).toEqual(
    'bpmn:StartEvent',
  );

  const descriptionText = await propertiesPanelPage.page
    .getByTestId('descriptionViewer')
    .innerText();
  expect(descriptionText).toEqual('');

  const milestonesSection = propertiesPanelPage.page.getByTestId('milestonesSection');
  await expect(milestonesSection.getByText('No data')).toBeVisible();

  expect(await propertiesPanelPage.page.getByPlaceholder('Planned Cost').inputValue()).toEqual('');
  expect(await propertiesPanelPage.page.getByPlaceholder('Planned Duration').inputValue()).toEqual(
    '',
  );

  expect(await propertiesPanelPage.page.getByPlaceholder('Custom Name').inputValue()).toEqual('');
  expect(await propertiesPanelPage.page.getByPlaceholder('Custom Value').inputValue()).toEqual('');

  await propertiesPanelPage.page.locator('.ant-color-picker-trigger').first().click(); // click button to change background color
  await expect(propertiesPanelPage.page.locator('.ant-popover-content')).toBeVisible(); // popover for color picker should be visible

  propertiesPanelPage.page
    .getByRole('tooltip', { name: 'HEX # right Recommended right' })
    .getByRole('textbox')
    .fill('#FF00AA');

  await propertiesPanelPage.page.locator('.ant-popover-content').blur();
  await propertiesPanelPage.page.waitForTimeout(500);

  const startEvent = propertiesPanelPage.page.locator('g.djs-element circle').first();
  const fillColor = await startEvent.evaluate((element) => {
    const style = getComputedStyle(element);
    return style.fill;
  });
  expect(fillColor).toEqual('rgb(255, 0, 170)');

  await propertiesPanelPage.page.locator('.ant-color-picker-trigger').nth(1).click(); // click button to change stroke color
  await expect(propertiesPanelPage.page.locator('.ant-popover-content').nth(1)).toBeVisible(); // popover for color picker should be visible

  propertiesPanelPage.page
    .getByRole('tooltip', { name: 'HEX # right Recommended right' })
    .getByRole('textbox')
    .nth(1)
    .fill('#FF00AA');

  await propertiesPanelPage.page.waitForTimeout(500);

  const strokeColor = await startEvent.evaluate((element) => {
    const style = getComputedStyle(element);
    return style.stroke;
  });
  expect(strokeColor).toEqual('rgb(255, 0, 170)');
});
