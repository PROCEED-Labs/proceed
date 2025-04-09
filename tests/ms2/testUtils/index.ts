import { Page, Locator } from '@playwright/test';
import {
  getElementsByTagName,
  toBpmnObject,
  toBpmnXml,
  updateBpmnOriginalAttributes,
} from '@proceed/bpmn-helper';

/**
 * this will mock the browsers clipboard API, since it might not be available in the test environment
 * due to invalid permissions. It's recommended to use this function in the beforeAll or beforeEach hook
 * of the test to inject the mock into the page very early. It will e.g. not work if it's called after
 * page.goto() has been called.
 * source: https://github.com/microsoft/playwright/issues/13037#issuecomment-1740643562
 */

export const mockClipboardAPI = async (page: Page) =>
  await page.addInitScript(() => {
    // create a mock of the clipboard API

    const mockClipboard = {
      clipboardData: '',
      clipboardItems: new Map(),
      write: async (items: ClipboardItem[]) => {
        for (const item of items) {
          for (const [_, type] of item.types.entries()) {
            mockClipboard.clipboardItems.set(type, item.getType(type));
          }
        }
      },
      read: async () => {
        const items = [];
        for (const [type, blob] of mockClipboard.clipboardItems.entries()) {
          items.push(new ClipboardItem({ [type]: blob }));
        }
        return items;
      },
      writeText: async (text: string) => {
        mockClipboard.clipboardData = text;
        mockClipboard.clipboardItems.clear();
      },
      readText: async () => {
        return mockClipboard.clipboardData;
      },
    };

    // override the native clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: false,
      enumerable: true,
      configurable: true,
    });
  });

/**
 * Will open a modal using the given trigger function and ensure that it is fully open before returning
 *
 * @param page the page the modal will open on
 * @param triggerFunction the function to run to open the modal
 *
 * @returns a locator that can be used to get the newly opened modal
 */
export async function openModal(page: Page, triggerFunction: () => Promise<void>) {
  const alreadyOpenCount = await page
    .locator(`div[aria-modal="true"]:not(.ant-zoom)`)
    .and(page.locator(`div[aria-modal="true"]:visible`))
    .count();

  await triggerFunction();

  // wait for the previous amount of modals + 1 modals to be findable and wait for the new modal to finish its animation
  // const openModalPromise = waitForAnimationEnd(page.locator(`div[aria-modal="true"].ant-zoom`));
  await page
    .locator(`div[aria-modal="true"]:not(.ant-zoom)`)
    .and(page.locator(`div[aria-modal="true"]:visible`))
    .nth(alreadyOpenCount)
    .waitFor({ state: 'visible' });

  const modal = await page.locator(`div[aria-modal="true"]:visible`).nth(alreadyOpenCount);

  /* Focus modal if browser is firefox */
  const browserName = await modal.evaluate(() => navigator.userAgent);
  if (browserName.includes('Firefox') /* || browserName.includes('WebKit') */) modal.focus();

  return modal;
}

/**
 * Will close a modal with the given function and wait for it to be closed before returning
 *
 * @param modal a locator to the modal to be closed
 * @param triggerFunction the function that triggers the modal to close
 */
export async function closeModal(modal: Locator, triggerFunction: () => Promise<void>) {
  /* Focus modal if browser is firefox */
  const browserName = await modal.evaluate(() => navigator.userAgent);
  if (browserName.includes('Firefox') /* || browserName.includes('WebKit') */) modal.focus();

  await triggerFunction();
  await modal.waitFor({ state: 'hidden' });
}

/**
 * Will wait for the page to be fully loaded and hydrated to ensure that the tested functionality can actually work
 *
 * @param page the page to be hydrated
 */
export async function waitForHydration(page: Page) {
  // this button should be in the header on every page
  const accountButton = page.getByRole('link', { name: 'user' });
  // the menu that open when hovering over the accountButton only works after the page has been fully hydrated
  await accountButton.hover();
  await page
    .locator('.ant-dropdown:not(.ant-dropdown-hidden)')
    .and(page.locator('.ant-dropdown:not(.ant-slide-up)'))
    .getByRole('link', { name: 'Profile Settings' })
    .waitFor({ state: 'visible' });
  // move the mouse away from the button to close the menu and go into a "clean" state for further testing
  await page.mouse.move(0, 0);
  await page.getByRole('menuitem', { name: 'Account Settings' }).waitFor({ state: 'hidden' });
}

export function removeCreatorDefinitionAttributes(xml: string): string {
  return xml.replace(
    /\sproceed:(creatorUsername|creatorSpaceName|creationDate|creatorName|creatorId|creatorSpaceId)=\"[^\"]*\"/g,
    '',
  );
}

export const setBpmnOriginalArttributes = async (bpmn: string) => {
  let definitions: any;
  try {
    const xmlObj = await toBpmnObject(bpmn);
    [definitions] = getElementsByTagName(xmlObj, 'bpmn:Definitions');
  } catch (err) {
    throw new Error(`Invalid BPMN: ${err}`);
  }

  await updateBpmnOriginalAttributes(definitions, {
    originalId: definitions.id,
    originalName: definitions.name,
    originalCreatorName: definitions.creatorName,
    originalCreatorId: definitions.creatorId,
    originalCreatorUsername: definitions.creatorUsername,
    originalCreatorSpaceId: definitions.creatorSpaceId,
    originalCreatorSpaceName: definitions.creatorSpaceName,
    originalCreationDate: definitions.creationDate,
    originalExporterVersion: definitions.exporterVersion,
    originalProcessVersionId: definitions.processVersionId,
    originalProcessVersionName: definitions.processVersionName,
    originalTargetNamespace: definitions.targetNamespace,
    originalUserDefinedId: definitions.userDefinedId,
    originalExporter: definitions.exporter,
  });

  return await toBpmnXml(definitions);
};
