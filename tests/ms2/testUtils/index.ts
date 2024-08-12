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
 * @param page the page the modal will open on
 * @param triggerFunction the function to run to open the modal
 *
 * @returns a locator that can be used to get the newly opened modal
 */
export async function openModal(page: Page, triggerFunction: () => Promise<any>) {
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

  return page.locator(`div[aria-modal="true"]:visible`).nth(alreadyOpenCount);
}

/**
 * Will close a modal with the given function and wait for it to be closed before returning
 *
 * @param modal a locator to the modal to be closed
 * @param triggerFunction the function that triggers the modal to close
 */
export async function closeModal(modal: Locator, triggerFunction: () => Promise<void>) {
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
  const accountButton = page.locator('a[href$="/profile"].ant-dropdown-trigger');
  // the menu that open when hovering over the accountButton only works after the page has been fully hydrated
  await accountButton.hover();
  await page
    .locator('.ant-dropdown:not(.ant-dropdown-hidden)')
    .and(page.locator('.ant-dropdown:not(.ant-slide-up)'))
    .getByRole('menuitem', { name: 'Profile Settings' })
    .waitFor({ state: 'visible' });
  // move the mouse away from the button to close the menu and go into a "clean" state for further testing
  await page.mouse.move(0, 0);
  await page.getByRole('menuitem', { name: 'Account Settings' }).waitFor({ state: 'hidden' });
}

export async function useMailInbox<T>(use: (client: any) => Promise<T>) {
  const { ImapFlow } = require('imapflow');

  const client = new ImapFlow({
    host: process.env.TEST_EMAIL_HOST,
    port: 993,
    secure: true,
    auth: {
      user: process.env.TEST_EMAIL,
      pass: process.env.TEST_EMAIL_PASSWORD,
    },
    logger: false,
  });
  let lock: any;
  let response: T;

  try {
    await client.connect();

    lock = await client.getMailboxLock('INBOX');

    return await use(client);
  } finally {
    if (lock) lock.release();
    await client.logout();
  }
}

/**
 * get signin link from email inbox
 *
 * NOTE: this function deletes all emails from no-reply until it finds a match that respects the
 * sentDate, thus it should not be used concurrently
 * */
export async function getSigninLink(sentDate: Date) {
  return await useMailInbox(async (client) => {
    const sender = 'no-reply@proceed-labs.org';
    let foundLink: string | undefined | null;

    // for timing
    const start = Date.now();
    const waitForEmailTimeout = 20_000;
    const receivedDateError = 10_000;
    const coolDown = 2000;

    while (Date.now() - start < waitForEmailTimeout && !foundLink) {
      const seenMails: string[] = [];

      for await (let message of client.fetch(
        { from: sender },
        { bodyParts: ['TEXT'], envelope: true },
      )) {
        seenMails.push(message.seq);
        const text: string = message.bodyParts.get('text').toString().replace(/=\r\n/g, '');
        const afterSentDate =
          message.envelope.date.getTime() >= sentDate.getTime() - receivedDateError;
        //
        let signinLink = text.match(/\n(https:\/\/.*callback\/email.*)/)?.[1];
        signinLink = signinLink?.replace(/=3D/g, '=');

        if (signinLink && afterSentDate) foundLink = signinLink;
      }

      // you can't delete emails whilst reading them
      for (const seq of seenMails) await client.messageDelete(seq);

      await new Promise((res) => setTimeout(res, coolDown));
    }

    return foundLink;
  });
}
