import AcmeService, { getCertificateDomains } from './acme-service.js';
import logger from '../../shared-electron-server/logging.js';
import eventHandler from '../../../frontend/backend-api/event-system/EventHandler.js';
import { getBackendConfig } from '../../shared-electron-server/data/config.js';

import __dirname from '../dirname-node.js';

import fse from 'fs-extra';
import path from 'path';

let letsencryptService = null;

/**
 * Returns a certificate which is supposed to be used for the servers that provide the frontend and the websockets
 *
 * @param {String} letsencryptPath the file path where the Let's Encrypt Challenge Files are served from
 * @returns {{ cert: String, key: String }} The private key and public certificate to use
 */
export async function getCertificate(letsencryptPath) {
  // skip search for certificates in development and directly use dev certificate
  if (process.env.NODE_ENV === 'production') {
    // use user provided certificate if possible
    const certPath = path.join(__dirname, './ssl/certificate.pem');
    const keyPath = path.join(__dirname, './ssl/private-key.key');

    if (fse.existsSync(certPath) && fse.existsSync(keyPath)) {
      logger.info(
        'Found user provided certificate in ssl/certificate.pem and user provided private key in ssl/private-key.key!'
      );
      const cert = fse.readFileSync(certPath, 'ascii');
      const key = fse.readFileSync(keyPath, 'ascii');

      // early exit if there was a user provided certificate
      return { cert, key };
    }

    try {
      // initialize the ACME client and try to get a certificate if no user provided certificate was found
      letsencryptService = new AcmeService(letsencryptPath);
      await letsencryptService.init();

      const certificateData = await letsencryptService.getCertificate();
      if (certificateData) {
        // early exit if we were able to get a certificate from Let's Encrypt
        return certificateData;
      }
    } catch (err) {
      logger.error(`Failed getting a Let's Encrypt certificate. Reason: ${err.message}`);
    }
  }
  // Fall back to dev certificate if we could neither get a user provided certificate nor a Let's Encrypt Certificate
  // or if we are in a development environment
  const certificate = fse.readFileSync(path.join(__dirname, 'https-public-dev-certificate.pem'));
  const privateKey = fse.readFileSync(path.join(__dirname, 'https-private-dev-key.key'));
  logger.warn(
    'Unable to get a certificate. Took development self-signed certificate and private key. These are not secure as they are publicly available and should not be used outside a development environment.'
  );

  return { key: privateKey, cert: certificate };
}

/**
 * Will initialize an AcmeService to augment the already existing Certificate.
 *
 * This will request a Let's Encrypt Certificate for URLs that are entered into the config and that point at the server
 * but are not covered by the main certificate. Requests to the URLs will be served using the Let's Encrypt Certificate while all others are served
 * using the main certificate
 *
 * @param {String} letsencryptPath the file path where the Let's Encrypt Challenge Files are served from
 * @param {Object[]} frontendServers the node https servers used for the frontend and the websockets
 * @param {String[]} coveredDomains the domains that are already covered by the main certificate and should not be considered for the LE certificate
 */
async function initAdditionalLetsEnrypt(letsencryptPath, frontendServers, coveredDomains) {
  letsencryptService = new AcmeService(letsencryptPath, coveredDomains, frontendServers);
  await letsencryptService.init();
  // this will ensure that the https servers use the new certificate alongside and not instead of the existing certificate
  letsencryptService.serverUpdateFunction = letsencryptService.addNewContext;

  // Request a initial LE Certificate to use
  const certificateData = await letsencryptService.getCertificate();
  letsencryptService.addNewContext(certificateData, letsencryptService.getDomainsToCover());

  // make sure that the LE certificate stays up to date and that new domains are covered
  letsencryptService.setDomainsCallback();
  letsencryptService.keepUpToDate();
}

/**
 * Checks if a list of domains contains at least one that is not in a list of covered domains
 *
 * @param {String[]} domains the domain list to check
 * @param {String[]} coveredDomains the list of covered domains
 * @returns {Boolean} if there are uncovered domains
 */
function checkForUncoveredDomains(domains, coveredDomains) {
  return domains.some((domain) =>
    coveredDomains.every((coveredDomain) => domain !== coveredDomain)
  );
}

/**
 * Handles Let's Encrypt functionality, e.g. keeping certificates up to date and requesting a new certificate when the list of domains for the server changes
 *
 * @param {String} letsencryptPath the file path where the Let's Encrypt Challenge Files are served from
 * @param {Object[]} frontendServers the node https servers used for the frontend and the websockets
 */
export async function handleLetsEncrypt(letsencryptPath, frontendServers) {
  if (letsencryptService) {
    // there is an existing AcmeService => Let's Encrypt is either already used as the main cert or should overwrite the Dev Certificate
    // on the servers for the frontend
    letsencryptService.frontendServers = frontendServers;

    // keep certificate up to date or request new one when domains change
    letsencryptService.setDomainsCallback();
    letsencryptService.keepUpToDate();
  } else {
    try {
      // there is no AcmeService => there is a user provided certificate, LE certificate should only be used for uncovered domains
      // get covered domains from the existing certificate
      const { cert } = await getCertificate();
      const coveredDomains = getCertificateDomains(cert);

      // get the currently defined domains from the config
      const { domains } = getBackendConfig();

      if (checkForUncoveredDomains(domains, coveredDomains)) {
        initAdditionalLetsEnrypt(letsencryptPath, frontendServers, coveredDomains);
      } else {
        // do Acme Initialization only after there was some uncovered domains added to the config
        let domainCallback = eventHandler.on(
          'backendConfigChange.domains',
          ({ newValue: newDomains }) => {
            if (checkForUncoveredDomains(newDomains, coveredDomains)) {
              // unregister this callback so the initialization doesn't happen twice
              eventHandler.off('backendConfigChange.domains', domainCallback);

              // make sure the function is called after the config change is done
              setTimeout(() => {
                initAdditionalLetsEnrypt(letsencryptPath, frontendServers, coveredDomains);
              }, 0);
            }
          }
        );
      }
    } catch (err) {
      logger.error(
        `Failed to set up Let's Encrypt to handle domains that are not covered by the currently used certificate. Reason: ${err}`
      );
    }
  }
}
