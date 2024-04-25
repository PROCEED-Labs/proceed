import { Page } from '@playwright/test';

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
