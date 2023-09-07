import url from 'url';
import logger from '../../../shared-electron-server/logging.js';
import { getBackendConfig } from '../../../shared-electron-server/data/config.js';
import ports from '../../../../../ports.js';

export const getUrlParts = (uri) => {
  if (uri) {
    const urlData = url.parse(uri, true);
    if (urlData.query) {
      return urlData.query;
    }
  }

  return {};
};

export const sortSpaceDelimitedString = (string) => {
  return string.split(' ').sort().join(' ');
};

// ensures no trailing backslash for strings, especially urls
export const ensureNoBackslash = (url) => {
  return url[url.length - 1] === '/' ? url.substring(0, url.length - 1) : url;
};

const wait = (interval) => new Promise((resolve) => setTimeout(resolve, interval));

// retry function to execute functions sveral times specified by retriesLeft
// the waiting time between executions increases by double the amount of interval
export const retry = async (fn, beforeNextTry, retriesLeft = 1, interval = 300) => {
  try {
    return await fn();
  } catch (e) {
    logger.error(e.toString());
    if (retriesLeft === 0) {
      const error = new Error('Not able fulfill request after all retries.');
      if ('status' in e) error.status = e.status;
      throw error;
    }
    interval *= 2;
    if (beforeNextTry) await beforeNextTry();
    await wait(interval);
    return retry(fn, beforeNextTry, --retriesLeft, interval);
  }
};

export function isOriginTrusted(origin) {
  if (!origin) return false;

  const defaultTrustedOrigins = [];

  // we should always allow local requests from the frontend and the puppeteer client
  if (process.env.NODE_ENV === 'development') {
    defaultTrustedOrigins.push(`https://localhost:${ports['dev-server'].frontend}`);
    defaultTrustedOrigins.push(`https://localhost:${ports['dev-server'].puppeteer}`);
  } else {
    defaultTrustedOrigins.push(`https://localhost:${ports.frontend}`);
    defaultTrustedOrigins.push(`https://localhost:${ports.puppeteer}`);
  }

  const { trustedOrigins } = getBackendConfig();

  const isTrustedByDefault = defaultTrustedOrigins.some(
    (defaultTrustedOrigin) => ensureNoBackslash(origin) === ensureNoBackslash(defaultTrustedOrigin),
  );
  // allow request with specifically defined origins in the config or for every request when there is no entry (to allow initial setup)
  const isTrustedThroughConfig =
    trustedOrigins.length === 0 ||
    trustedOrigins.some(
      (trustedOrigin) => ensureNoBackslash(origin) === ensureNoBackslash(trustedOrigin),
    );

  return isTrustedByDefault || isTrustedThroughConfig;
}
