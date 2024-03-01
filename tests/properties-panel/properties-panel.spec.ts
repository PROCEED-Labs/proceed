import { Page } from '@playwright/test';
import { test, expect } from './properties-panel.fixtures';

test('open properties panel for process and fill property values', async ({
  propertiesPanelPage,
}) => {
  const openButton = propertiesPanelPage.page.getByRole('button', { name: 'info-circle' });
  await openButton.click();

  expect(await propertiesPanelPage.generalSection.locator('input[name="Name"]').isDisabled()).toBe(
    true,
  );
  expect(await propertiesPanelPage.generalSection.locator('input[name="Type"]').isDisabled()).toBe(
    true,
  );

  expect(await propertiesPanelPage.imageSection.innerText()).toEqual('Add Image');
  await propertiesPanelPage.addImage('example-image.jpg');
  expect(await propertiesPanelPage.imageSection.innerText()).toEqual('Edit Image');

  await expect(
    propertiesPanelPage.descriptionSection.getByText('Process Description', { exact: true }),
  ).toBeVisible();
  await propertiesPanelPage.addDescription('New Description');
  expect(propertiesPanelPage.descriptionSection).toContainText('New Description');

  await expect(propertiesPanelPage.milestonesSection.getByText('No data')).toBeVisible();
  await propertiesPanelPage.addMilestone({
    ID: '123',
    name: 'Milestone A',
    description: 'Milestone Description',
  });
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
  await propertiesPanelPage.editPlannedDuration({ years: 1, months: 2, days: 3 });
  expect(await propertiesPanelPage.page.getByPlaceholder('Planned Duration').inputValue()).toEqual(
    '1 Years, 2 Months, 3 Days',
  );
  await propertiesPanelPage.editPlannedDuration({
    years: 1,
    months: 2,
    days: 3,
    hours: 4,
    minutes: 5,
    seconds: 6,
  });
  expect(await propertiesPanelPage.page.getByPlaceholder('Planned Duration').inputValue()).toEqual(
    '1 Y, 2 M, 3 D, 4 H, 5 M, 6 S ',
  );

  expect(
    await propertiesPanelPage.customPropertiesSection.getByPlaceholder('Custom Name').inputValue(),
  ).toEqual('');
  expect(
    await propertiesPanelPage.customPropertiesSection.getByPlaceholder('Custom Value').inputValue(),
  ).toEqual('');
  await propertiesPanelPage.addCustomProperty('New Custom Property', 'New Custom Value');
  expect(
    await propertiesPanelPage.customPropertiesSection.getByPlaceholder('Custom Name').count(),
  ).toEqual(2);
  expect(
    await propertiesPanelPage.customPropertiesSection.getByPlaceholder('Custom Value').count(),
  ).toEqual(2);
  expect(
    await propertiesPanelPage.customPropertiesSection
      .getByPlaceholder('Custom Name')
      .first()
      .inputValue(),
  ).toEqual('New Custom Property');
  expect(
    await propertiesPanelPage.customPropertiesSection
      .getByPlaceholder('Custom Value')
      .first()
      .inputValue(),
  ).toEqual('New Custom Value');
  expect(
    await propertiesPanelPage.customPropertiesSection
      .getByPlaceholder('Custom Name')
      .nth(1)
      .inputValue(),
  ).toEqual('');
  expect(
    await propertiesPanelPage.customPropertiesSection
      .getByPlaceholder('Custom Value')
      .nth(1)
      .inputValue(),
  ).toEqual('');
  await propertiesPanelPage.customPropertiesSection.getByRole('button', { name: 'delete' }).click();
  expect(
    await propertiesPanelPage.customPropertiesSection.getByPlaceholder('Custom Name').count(),
  ).toEqual(1);
  expect(
    await propertiesPanelPage.customPropertiesSection.getByPlaceholder('Custom Name').inputValue(),
  ).toEqual('');
  expect(
    await propertiesPanelPage.customPropertiesSection.getByPlaceholder('Custom Value').count(),
  ).toEqual(1);
  expect(
    await propertiesPanelPage.customPropertiesSection.getByPlaceholder('Custom Value').inputValue(),
  ).toEqual('');
});

test('open properties panel for element and fill property values', async ({
  propertiesPanelPage,
}) => {
  await propertiesPanelPage.page.locator('rect').first().click(); // click on start event (which is the only element in this process)

  const openButton = propertiesPanelPage.page.getByRole('button', { name: 'info-circle' });
  await openButton.click();

  expect(
    await propertiesPanelPage.generalSection.locator('input[name="Name"]').inputValue(),
  ).toEqual('');
  await propertiesPanelPage.generalSection.getByTestId('nameInputEdit').click();
  await propertiesPanelPage.generalSection.locator('input[name="Name"]').fill('New Name');
  expect(
    await propertiesPanelPage.generalSection.locator('input[name="Name"]').inputValue(),
  ).toEqual('New Name');
  expect(await propertiesPanelPage.generalSection.locator('input[name="Type"]').isDisabled()).toBe(
    true,
  );
  expect(
    await propertiesPanelPage.generalSection.locator('input[name="Type"]').inputValue(),
  ).toEqual('bpmn:StartEvent');

  expect(await propertiesPanelPage.imageSection.innerText()).toEqual('Add Image');
  await propertiesPanelPage.addImage('example-image.jpg');
  expect(await propertiesPanelPage.imageSection.innerText()).toEqual('Edit Image');

  const descriptionText = await propertiesPanelPage.page
    .getByTestId('descriptionViewer')
    .innerText();
  expect(descriptionText).toEqual('');

  await expect(propertiesPanelPage.milestonesSection.getByText('No data')).toBeVisible();

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
