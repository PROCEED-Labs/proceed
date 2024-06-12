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
 * Can be used to wait for the animation of an element to end before proceeding
 *
 * BEWARE: this will deadlock when the animation has already finished before starting the function or when the element has no animation at all
 *
 * Builds upon this answer to an issue in the playwright library: https://github.com/microsoft/playwright/issues/15660#issuecomment-1185339343
 *
 * @param locator the locator that identifies the animated element
 */
async function waitForAnimationEnd(locator: Locator) {
  await locator.evaluate(async (e) => {
    // if the animation is delayed wait for its start before proceeding
    if (!e.getAnimations().length) {
      await new Promise(async (res) => {
        function onAnimationStart() {
          res(undefined);
          e.removeEventListener('animationstart', onAnimationStart);
        }
        e.addEventListener('animationstart', onAnimationStart);
      });
    }

    let animations = e.getAnimations();

    return Promise.all(animations.map((animation) => animation.finished));
  });
}

/**
 * Will open a modal using the given trigger function and ensure that it is fully open before returning
 *
 * @param trigger the function that triggers the modal opening
 * @param page the page the modal should be opened on (defaults to the default page)
 *
 * @returns a locator that can be used to get the newly opened modal
 */
export async function openModal(openButton: Locator) {
  const page = openButton.page();

  await openButton.click();

  // wait for the previous amount of modals + 1 modals to be findable and wait for the new modal to finish its animation
  await waitForAnimationEnd(page.locator(`div[aria-modal="true"].ant-zoom`));

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

  // workaround for the problem that doing page.locator(modalSelector, { has: modalLocator.locator(closeButtonSelector) }) does not work to select the modal since the locator for "has" cannot be outside the element we are looking for or the element itself
  const modalParent = page.locator(`*:has(> div[aria-modal="true"])`, { has: closeButton });
  const modal = modalParent.locator('div[aria-modal="true"]');

  await closeButton.click();

  await modal.waitFor({ state: 'hidden' });
}
