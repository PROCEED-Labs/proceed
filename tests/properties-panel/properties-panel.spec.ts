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
  const placeholderImageURL =
    'data:image/png;base64,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';
  const exampleImageURL = new RegExp(
    `.*\\/api\\/processes\\/${propertiesPanelPage.processDefinitionID}\\/images\\/[a-zA-Z0-9-_]+\\.jpeg\\?\\d+$`,
  );
  await expect(
    propertiesPanelPage.imageSection.getByRole('img', { name: 'Image' }),
  ).toHaveAttribute('src', placeholderImageURL);
  await propertiesPanelPage.addImage('example-image.jpg');
  expect(propertiesPanelPage.imageSection.getByLabel('edit')).toBeVisible();
  expect(propertiesPanelPage.imageSection.getByLabel('delete')).toBeVisible();
  await expect(
    propertiesPanelPage.imageSection.getByRole('img', { name: 'Image' }),
  ).toHaveAttribute('src', exampleImageURL);
  await propertiesPanelPage.imageSection.getByLabel('delete').click();
  await propertiesPanelPage.page.waitForTimeout(500);
  expect(await propertiesPanelPage.imageSection.innerText()).toEqual('Add Image');
  await expect(
    propertiesPanelPage.imageSection.getByRole('img', { name: 'Image' }),
  ).toHaveAttribute('src', placeholderImageURL);

  await expect(
    propertiesPanelPage.descriptionSection.getByText('Process Description', { exact: true }),
  ).toBeVisible();
  await propertiesPanelPage.addDescription('New Description');
  expect(propertiesPanelPage.descriptionSection).toContainText('New Description');

  const milestonesTable = propertiesPanelPage.milestonesSection.getByRole('table');
  const firstContentRow = milestonesTable.getByRole('row').nth(1);
  await expect(firstContentRow).toHaveText('No data');
  await propertiesPanelPage.addMilestone({
    ID: '123',
    name: 'Milestone A',
    description: 'Milestone Description',
  });
  await expect(firstContentRow.getByRole('cell').first()).toHaveText('123');
  await expect(firstContentRow.getByRole('cell').nth(1)).toHaveText('Milestone A');
  await expect(firstContentRow.getByRole('cell').nth(2)).toHaveText('Milestone Description');
  await firstContentRow.getByLabel('delete').click();
  await expect(firstContentRow).toHaveText('No data');

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
  const placeholderImageURL =
    'data:image/png;base64,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';
  const exampleImageURL = new RegExp(
    `.*\\/api\\/processes\\/${propertiesPanelPage.processDefinitionID}\\/images\\/[a-zA-Z0-9-_]+\\.jpeg\\?\\d+$`,
  );
  await expect(
    propertiesPanelPage.imageSection.getByRole('img', { name: 'Image' }),
  ).toHaveAttribute('src', placeholderImageURL);
  await propertiesPanelPage.addImage('example-image.jpg');
  expect(propertiesPanelPage.imageSection.getByLabel('edit')).toBeVisible();
  expect(propertiesPanelPage.imageSection.getByLabel('delete')).toBeVisible();
  await expect(
    propertiesPanelPage.imageSection.getByRole('img', { name: 'Image' }),
  ).toHaveAttribute('src', exampleImageURL);
  await propertiesPanelPage.imageSection.getByLabel('delete').click();
  await propertiesPanelPage.page.waitForTimeout(500);
  expect(await propertiesPanelPage.imageSection.innerText()).toEqual('Add Image');
  await expect(
    propertiesPanelPage.imageSection.getByRole('img', { name: 'Image' }),
  ).toHaveAttribute('src', placeholderImageURL);

  const descriptionText = await propertiesPanelPage.page
    .getByTestId('descriptionViewer')
    .innerText();
  expect(descriptionText).toEqual('');
  await propertiesPanelPage.addDescription('New Description');
  expect(propertiesPanelPage.descriptionSection).toContainText('New Description');

  const milestonesTable = propertiesPanelPage.milestonesSection.getByRole('table');
  const firstContentRow = milestonesTable.getByRole('row').nth(1);
  await expect(firstContentRow).toHaveText('No data');
  await propertiesPanelPage.addMilestone({
    ID: '123',
    name: 'Milestone A',
    description: 'Milestone Description',
  });
  await expect(firstContentRow.getByRole('cell').first()).toHaveText('123');
  await expect(firstContentRow.getByRole('cell').nth(1)).toHaveText('Milestone A');
  await expect(firstContentRow.getByRole('cell').nth(2)).toHaveText('Milestone Description');
  await firstContentRow.getByLabel('delete').click();
  await expect(firstContentRow).toHaveText('No data');

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
