import { test, expect } from './properties-panel.fixtures';

test('open properties panel for process', async ({ propertiesPanelPage }) => {
  const openButton = propertiesPanelPage.page.getByRole('button', { name: 'setting' });
  await openButton.click();

  const generalSection = propertiesPanelPage.page
    .locator('div')
    .filter({ hasText: /^General$/ })
    .first()
    .locator('..');

  expect(
    await generalSection
      .locator('div')
      .filter({ hasText: /^Name$/ })
      .first()
      .getByRole('textbox')
      .isDisabled(),
  ).toBe(true);

  expect(
    await generalSection
      .locator('div')
      .filter({ hasText: /^Name$/ })
      .first()
      .getByRole('textbox')
      .inputValue(),
  ).toEqual('PROCEED Main Process');

  expect(
    await generalSection
      .locator('div')
      .filter({ hasText: /^Type$/ })
      .first()
      .getByRole('textbox')
      .isDisabled(),
  ).toBe(true);

  expect(
    await generalSection
      .locator('div')
      .filter({ hasText: /^Type$/ })
      .first()
      .getByRole('textbox')
      .inputValue(),
  ).toEqual('bpmn:Process');

  const descriptionElement = propertiesPanelPage.page
    .locator('div:below(:nth-match(:text("Description"), 1))')
    .first();

  expect(await descriptionElement.innerText()).toEqual('Process Description');

  await propertiesPanelPage.page.getByLabel('edit').locator('svg').click(); // click edit description button
  await propertiesPanelPage.page
    .locator('.toastui-editor-ww-container > .toastui-editor > .ProseMirror')
    .fill('New Description');
  await propertiesPanelPage.page.getByRole('button', { name: 'Save' }).click();

  await propertiesPanelPage.page.waitForTimeout(500); // wait until description dialog is closed

  expect(await descriptionElement.innerText()).toEqual('New Description');

  const milestonesSection = propertiesPanelPage.page
    .locator('div')
    .filter({ hasText: /^Milestones$/ })
    .first()
    .locator('..');

  await expect(milestonesSection.getByText('No data')).toBeVisible();

  await milestonesSection.getByLabel('plus').locator('svg').click();

  await propertiesPanelPage.page.getByPlaceholder('Milestone ID').fill('123');
  await propertiesPanelPage.page.getByPlaceholder('Milestone Name').fill('Milestone A');
  await propertiesPanelPage.page
    .getByLabel('Create new Milestone')
    .locator('#name')
    .locator('.toastui-editor-ww-container > .toastui-editor > .ProseMirror')
    .fill('Milestone Description');

  await propertiesPanelPage.page.getByRole('button', { name: 'Create Milestone' }).click();

  await propertiesPanelPage.page.waitForTimeout(500); // wait until milestone dialog is closed

  // TODO: Check if milestone entry was added to table

  const propertiesSection = propertiesPanelPage.page
    .locator('div')
    .filter({ hasText: /^Properties$/ })
    .first()
    .locator('..');

  expect(await propertiesSection.getByPlaceholder('Planned Cost').inputValue()).toEqual('');
  await propertiesSection.getByPlaceholder('Planned Cost').fill('100');
  expect(await propertiesSection.getByPlaceholder('Planned Cost').inputValue()).toEqual('100');

  expect(await propertiesSection.getByPlaceholder('Planned Duration').inputValue()).toEqual('');

  await propertiesPanelPage.page.getByPlaceholder('Planned Duration').click();

  await propertiesPanelPage.page.locator('#years').fill('1');
  await propertiesPanelPage.page.locator('#months').fill('2');
  await propertiesPanelPage.page.locator('#days').fill('3');
  await propertiesPanelPage.page.locator('#hours').fill('4');
  await propertiesPanelPage.page.locator('#minutes').fill('5');
  await propertiesPanelPage.page.locator('#seconds').fill('6');
  await propertiesPanelPage.page.getByRole('button', { name: 'Save' }).click();

  propertiesPanelPage.page.waitForTimeout(500);
  expect(await propertiesSection.getByPlaceholder('Planned Duration').inputValue()).toEqual(
    'P1Y2M3DT4H5M6S',
  );

  const customPropertiesSection = propertiesPanelPage.page
    .locator('div')
    .filter({ hasText: 'Custom Properties' })
    .first()
    .locator('..');

  expect(await customPropertiesSection.getByPlaceholder('Custom Name').inputValue()).toEqual('');
  await customPropertiesSection.getByPlaceholder('Custom Name').fill('New Custom Property');
  await customPropertiesSection.getByPlaceholder('Custom Name').blur();
  expect(await customPropertiesSection.getByPlaceholder('Custom Value').inputValue()).toEqual('');
  await customPropertiesSection.getByPlaceholder('Custom Value').fill('New Custom Value');
  await customPropertiesSection.getByPlaceholder('Custom Value').blur();

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

  await customPropertiesSection.getByRole('img', { name: 'delete' }).locator('svg').nth(1).click(); // click on delete button for custom property

  expect(await customPropertiesSection.getByPlaceholder('Custom Name').count()).toEqual(1);
  expect(await customPropertiesSection.getByPlaceholder('Custom Name').inputValue()).toEqual('');
  expect(await customPropertiesSection.getByPlaceholder('Custom Value').count()).toEqual(1);
  expect(await customPropertiesSection.getByPlaceholder('Custom Value').inputValue()).toEqual('');
});

test('open properties panel for element', async ({ propertiesPanelPage }) => {
  await propertiesPanelPage.page.locator('rect').first().click(); // click on start event (which is the only element in this process)

  const openButton = propertiesPanelPage.page.getByRole('button', { name: 'setting' });
  await openButton.click();

  const generalSection = propertiesPanelPage.page
    .locator('div')
    .filter({ hasText: /^General$/ })
    .first()
    .locator('..');
  expect(
    await generalSection
      .locator('div')
      .filter({ hasText: /^Name$/ })
      .first()
      .getByRole('textbox')
      .inputValue(),
  ).toEqual('');

  await generalSection
    .locator('div')
    .filter({ hasText: /^Name$/ })
    .first()
    .getByRole('textbox')
    .fill('New Name');
  expect(
    await generalSection
      .locator('div')
      .filter({ hasText: /^Name$/ })
      .first()
      .getByRole('textbox')
      .inputValue(),
  ).toEqual('New Name');

  expect(
    await generalSection
      .locator('div')
      .filter({ hasText: /^Type$/ })
      .first()
      .getByRole('textbox')
      .isDisabled(),
  ).toBe(true);
  expect(
    await generalSection
      .locator('div')
      .filter({ hasText: /^Type$/ })
      .first()
      .getByRole('textbox')
      .inputValue(),
  ).toEqual('bpmn:StartEvent');

  const descriptionText = await propertiesPanelPage.page
    .locator('div:below(:nth-match(:text("Description"), 1))')
    .first()
    .innerText();
  expect(descriptionText).toEqual('');

  const milestonesSection = propertiesPanelPage.page
    .locator('div')
    .filter({ hasText: /^Milestones$/ })
    .first()
    .locator('..');
  await expect(milestonesSection.getByText('No data')).toBeVisible();

  const propertiesSection = propertiesPanelPage.page
    .locator('div')
    .filter({ hasText: /^Properties$/ })
    .first()
    .locator('..');
  expect(await propertiesSection.getByPlaceholder('Planned Cost').inputValue()).toEqual('');
  expect(await propertiesSection.getByPlaceholder('Planned Duration').inputValue()).toEqual('');

  const customPropertiesSection = propertiesPanelPage.page
    .locator('div')
    .filter({ hasText: 'Custom Properties' })
    .first()
    .locator('..');
  expect(await customPropertiesSection.getByPlaceholder('Custom Name').inputValue()).toEqual('');
  expect(await customPropertiesSection.getByPlaceholder('Custom Value').inputValue()).toEqual('');

  await propertiesPanelPage.page.locator('.ant-color-picker-color-block-inner').first().click(); // click button to change background color
  await expect(propertiesPanelPage.page.locator('.ant-popover-content')).toBeVisible(); // popover for color picker should be visible

  propertiesPanelPage.page
    .getByRole('tooltip', { name: 'HEX # right Recommended right' })
    .getByRole('textbox')
    .fill('#FF00AA');

  await propertiesPanelPage.page.waitForTimeout(500);

  const startEvent = propertiesPanelPage.page.locator('g.djs-element circle').first();
  const fillColor = await startEvent.evaluate((element) => {
    const style = getComputedStyle(element);
    return style.fill;
  });
  expect(fillColor).toEqual('rgb(255, 0, 170)');

  await propertiesPanelPage.page.locator('.ant-color-picker-color-block-inner').nth(1).click(); // click button to change stroke color
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
