import { Page, Locator } from '@playwright/test';

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
 * @param openButtonOrPage the button to click to open the modal or the page the modal should automatically open on
 *
 * @returns a locator that can be used to get the newly opened modal
 */
export async function openModal(triggerFunction: () => Promise<void>, page: Page) {
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

  // TODO: this might not work as expected in case of more than one modal being visible
  return page.locator(`div[aria-modal="true"]:visible`).last();
}

/**
 * Will close a modal with the given button and wait for it to be closed before returning
 *
 * @param closeButton the button that triggers the modal to close
 */
export async function closeModal(closeButton: Locator) {
  const page = closeButton.page();

  // workaround for the problem that doing page.locator(modalSelector, { has: modalLocator.locator(closeButtonSelector) }) does not work to select the modal since the locator for "has" cannot include the element itself
  const modalParent = page.locator(`*:has(> div[aria-modal="true"])`, { has: closeButton });
  const modal = modalParent.locator('div[aria-modal="true"]');

  await closeButton.click();

  await modal.waitFor({ state: 'hidden' });
}
