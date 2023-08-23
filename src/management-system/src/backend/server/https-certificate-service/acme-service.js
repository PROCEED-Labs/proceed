import ACME from 'acme';
import Keypairs from '@root/keypairs';
import CSR from '@root/csr';
import PEM from '@root/pem/packer.js';
import url from 'url';
import http01 from 'acme-http-01-webroot';
import { getBackendConfig } from '../../shared-electron-server/data/config.js';
import eventHandler from '../../../frontend/backend-api/event-system/EventHandler.js';
import fse from 'fs-extra';
import path from 'path';
import __dirname from '../dirname-node.js';
import forge from 'node-forge';

import logger from '../../shared-electron-server/logging.js';

function notify(ev, msg) {
  if (ev === 'error' || ev === 'warning') {
    // Silence error, that occurs when the http challenge library tries to remove the challenge file, for now (only in production)
    // Not sure why it occurs
    logger.debug(msg);
    return;
  }

  logger.debug(msg);
}

class AcmeService {
  constructor(challengePath = '', coveredDomains = [], frontendServers = []) {
    // the current certificate renewal timeout
    this.certificateTimeout = null;
    // the acme library instance to use for certificate generation
    this.acme = null;
    // the jwk representation of the private server key
    this.privateKey = null;
    // the pem representation of the private server key
    this.privateKeyString = '';
    // object containing information about the certificate { expires, fullchain, domains }
    this.currentCertificate = null;
    // the directory where all the data regarding certificates is stored
    this.certDirectoryPath = path.join(__dirname, 'ssl');

    // the file path from where the Let's Encrypt challenge data shall be served
    this.challengeFilePath = challengePath;
    // the domains this instance is supposed to ignore (might be already covered by a user defined certificate)
    this.ignoredDomains = coveredDomains;
    // the servers that use the certificate
    this.frontendServers = frontendServers;
    // the function that shall be used when the certificate is updated
    // setContext to use the new certificate for all future requests
    // addNewContext to use the new certificate only for requests on a set of domains that are passed to the function
    this.serverUpdateFunction = this.setContext;
  }

  /**
   * Initializes ACME Library and sets some member variables for future use
   */
  async init() {
    // init acme client
    this.acme = ACME.create({
      packageAgent: 'proceed-management-system/0.1.0',
      maintainerEmail: 'proceed@snet.tu-berlin.de',
      notify,
    });

    await this.acme.init('https://acme-v02.api.letsencrypt.org/directory');

    // get private server key (will be created if none exists)
    const { privateKey, privateKeyString } = await this._getPrivateKey();
    this.privateKey = privateKey;
    this.privateKeyString = privateKeyString;

    // get acme account info (account will be created if none exists)
    const { account, accountKey } = await this._getAccountData();
    this.account = account;
    this.accountKey = accountKey;
  }

  /**
   * Returns either an existing private key if found in the file system or creates a new one if not
   *
   * @returns {Object} an object containing the servers private key as a string and as an object
   */
  async _getPrivateKey() {
    const privateKeyPath = path.join(this.certDirectoryPath, 'letsEncryptPrivateKey.key');

    let privateKeyString;
    let privateKey;

    // check if there is a locally stored key
    if (fse.existsSync(privateKeyPath)) {
      // load key from file system if yes
      logger.info('Found locally stored private key!');
      privateKeyString = await fse.readFile(privateKeyPath, 'ascii');
      privateKey = await Keypairs.import({ pem: privateKeyString });
    } else {
      // generate new key if not
      logger.info("Generating new private server key for Let's Encrypt!");
      const privateKeyPair = await Keypairs.generate({ kty: 'RSA', format: 'jwk' });
      privateKey = privateKeyPair.private;

      privateKeyString = await Keypairs.export({ jwk: privateKey });
      // write new key to file system for future use
      await fse.outputFile(privateKeyPath, privateKeyString, 'ascii');
    }
    return { privateKey, privateKeyString };
  }

  /**
   * Returns data for an Acme Account, this will either be an existing account from the file system or a newly created one
   *
   * @returns {Object} object containing account key and account data
   */
  async _getAccountData() {
    let accountKey;

    const accountKeyPath = path.join(this.certDirectoryPath, 'letsEncryptAccount.key');

    // Either reuse an existing key or generate a new one
    if (fse.existsSync(accountKeyPath)) {
      const fileContent = await fse.readFile(accountKeyPath, 'ascii');
      accountKey = await Keypairs.import({ pem: fileContent });
    } else {
      logger.info("Generating new ACME Account Key Pair for Let's Encrypt.");

      const accountKeypair = await Keypairs.generate({ kty: 'EC', format: 'jwk' });
      accountKey = accountKeypair.private;
      const fileContent = await Keypairs.export({ jwk: accountKey });
      await fse.outputFile(accountKeyPath, fileContent, 'ascii');
    }

    let account;

    const accountPath = path.join(this.certDirectoryPath, 'letsEncryptAccount.json');

    // either reuse an existing account or create a new one
    if (fse.existsSync(accountPath)) {
      account = await fse.readJSON(accountPath);
    } else {
      logger.info('Registering new ACME Account...');

      account = await this.acme.accounts.create({
        subscriberEmail: 'proceed@snet.tu-berlin.de',
        agreeToTerms: true,
        accountKey,
      });

      await fse.outputJson(accountPath, account);

      logger.info("Created ACME account for Let's Encrypt");
    }

    return { account, accountKey };
  }

  /**
   * Will return the list of domains that are supposed to be covered by a Let's Encrypt certificate
   * (some domains might already covered by some user defined certificate)
   *
   * @param {String[]} [domains] a list of domains to check which of them is supposed to be covered (defaults to the ones in the config if not provided)
   * @returns {String[]} all domains from the provided list that are not already covered by an existing certificate
   */
  getDomainsToCover(domains = getBackendConfig().domains) {
    // filter out domains that are already covered by the default certificate
    domains = domains.filter((domain) =>
      this.ignoredDomains.every((ignoreDomain) => ignoreDomain !== domain),
    );

    return domains;
  }

  /**
   * Checks for a locally stored certificate that contains the expected domains
   *
   * @param {String[]} expectedDomains the domains that should be covered by the certificate
   * @param {Boolean} [fullInfo] if the function should return additional information to the certificate
   * @returns {String|undefined} the certificate string if it exists and covers all provided domains
   */
  async getCurrentCertificate(expectedDomains, fullInfo = false) {
    const certPath = path.join(this.certDirectoryPath, 'letsEncryptCertificate.json');
    if (!fse.existsSync(certPath)) {
      logger.info("Could not find locally stored Let's Encrypt https certificate");
      return;
    }

    const { expires, fullchain, domains } = await fse.readJSON(certPath);

    // check if the certificate covers exactly the expected domains
    if (
      expectedDomains.length !== domains.length ||
      domains.some((domain, index) => domain !== expectedDomains[index])
    ) {
      logger.info("The stored Let's Encrypt certificate doesn't fit the given domains!");
      return;
    }

    this.currentCertificate = { expires, fullchain, domains };

    const { daysUntilRenewal, remainingDays } = this.getRenewalInfo(expires);

    logger.info(
      `Loaded an existing Let's Ecrypt certificate for the domains ${domains.join(
        ' ',
      )} from the file system. It is valid for another ${remainingDays} days and will be renewed in ${daysUntilRenewal} days!`,
    );

    if (!fullInfo) {
      return fullchain;
    } else {
      return { cert: fullchain, expires };
    }
  }

  /**
   * Requests a new Certificate from the ACME Server and returns it alongside the associated private key
   *
   * @param {String[]} domains the domains the certficite is supposed to cover
   * @returns {{ cert: String, key: String}} the key and certificate pair
   */
  async getNewCertificate(domains) {
    const encodedDomains = domains.map((domain) => url.domainToASCII(domain));

    // request certificate
    logger.info(`Requesting a new Let's Encrypt Certificate for ${domains.join(' ')}`);

    // create certificate signing request
    const csrDer = await CSR.csr({
      jwk: this.privateKey,
      domains: encodedDomains,
      encoding: 'der',
    });
    const csr = PEM.packBlock({ type: 'CERTIFICATE REQUEST', bytes: csrDer });

    // define which challenge to use for the certificate request and where the challenge files should be served from
    const challenges = {
      'http-01': http01.create({
        webroot: path.join(this.challengeFilePath, 'acme-challenge'),
      }),
    };

    const pems = await this.acme.certificates.create({
      account: this.account,
      accountKey: this.accountKey,
      csr,
      domains: encodedDomains,
      challenges,
    });

    const fullchain = pems.cert + '\n' + pems.chain + '\n';

    // read expiration date from certificate (should be 90 days after creation)
    let expires = forge.pki.certificateFromPem(fullchain).validity.notAfter;

    // store certificate for future reuse
    await fse.outputJSON(path.join(this.certDirectoryPath, 'letsEncryptCertificate.json'), {
      expires,
      fullchain,
      domains,
    });

    this.currentCertificate = { expires, fullchain, domains };

    const { daysUntilRenewal, remainingDays } = this.getRenewalInfo(expires);

    logger.info(
      `Received a new Let's Ecrypt certificate for domains ${domains.join(
        ' ',
      )}. It is valid for ${remainingDays} days and will be renewed in ${daysUntilRenewal} days!`,
    );

    return { key: this.privateKeyString, cert: fullchain };
  }

  /**
   * Return a certificate and private key pair, both will either already exist or be newly created
   *
   * @param {String[]} domains the domains the certificate should cover
   * @returns {{ cert: String, key: String}} the key and certificate pair
   */
  async getCertificate(domains = this.getDomainsToCover()) {
    logger.info("Trying to get a Let's Encrypt Certificate!");

    // we can only use a certificate if there are domains to certify
    if (domains && domains.length) {
      // check for existing key and certificate
      let certificateString = await this.getCurrentCertificate(domains);

      if (this.privateKeyString && certificateString) {
        logger.info("Found existing Let's Encrypt key and certificate to use for https.");
        return { key: this.privateKeyString, cert: certificateString };
      }

      return await this.getNewCertificate(domains);
    } else {
      logger.info(
        "Could not get a Let's Encrypt certificate since the domain of the server running the MS is unknown. Add the domains the server is accessible under that are not already covered by the default certificate to the config to get a certificate!",
      );
    }
  }

  /**
   * This function should be used when the AcmeService should handle Let's Encrypt certificates alongside an existing certificate
   * It will prevent the existing certificate from being overwritten
   *
   * @param {{ key: String, cert: String }} certData the certificate data that should be used if the specified domains are requested
   * @param {String[]} domains the domains the new certData should be used for
   */
  addNewContext(certData, domains) {
    // make sure that every server serves the specified domains using the specified certificate data
    this.frontendServers.forEach((server) => {
      domains.forEach((domain) => {
        server.addContext(domain, certData);
      });
    });
  }

  /**
   * This function should be used when there is no user defined certificate
   * It will always overwrite the currently existing certificate when the Let's Encrypt certificate data is updated
   *
   * @param {{ key: String, cert: String }} certData the certificate data that should be used if the specified domains are requested
   */
  setContext(certData) {
    // make sure that every server uses the new certificate on all new requests
    this.frontendServers.forEach((server) => {
      server.setSecureContext(certData);
    });
  }

  /**
   * Registers callback with the event system that is triggered when the domains in the config change
   *
   * This is used to adapt the Let's Encrypt certificate to allow a user/admin to specify which domains point to the server and should be in the certificate
   */
  async setDomainsCallback() {
    eventHandler.on(
      'backendConfigChange.domains',
      async ({ newValue: newDomains, oldValue: oldDomains }) => {
        // make sure that the list of domains to cover(!) changed and only take action if it did
        const oldFilteredDomains = this.getDomainsToCover(oldDomains);
        const newFilteredDomains = this.getDomainsToCover(newDomains);
        if (
          (newFilteredDomains &&
            newFilteredDomains.length &&
            newFilteredDomains.length !== oldFilteredDomains.length) ||
          newFilteredDomains.some((newDomain, index) => newDomain !== oldFilteredDomains[index])
        ) {
          logger.info('Changed domain config. Requesting Certificate for new domains');

          try {
            // request new certificate and make sure it is used
            const certData = await this.getNewCertificate(newFilteredDomains);
            this.serverUpdateFunction(certData, newFilteredDomains);

            // reset the update function to use the expiration date of the new certificate
            this.keepUpToDate();
          } catch (err) {
            // Catch and log errors that might occur when getting a certificate for the domains defined by the user is not possible
            logger.error(`Failed to get a certificate for the newly defined domains: ${newFilteredDomains.join(
              ' ',
            )}.
            Reason: ${err}`);
          }
        }
      },
    );
  }

  // need special timeout function since waiting for 60 days exceeds the maximum value allowed for setTimeouts input
  // adapted from: https://stackoverflow.com/a/18182660
  renewAt(date, domains) {
    const time = Date.now();
    const renewTime = date.getTime();
    const diff = Math.max(renewTime - time, 0);

    const maxTimeout = 0x7fffffff;
    if (diff > maxTimeout) {
      // call the function recursively with smaller timeout if time exceeds max value usable for timeouts
      this.certificateTimeout = setTimeout(() => {
        this.renewAt(date, domains);
      }, maxTimeout);
    } else {
      // setup callback that will trigger renewal of certificate if timeout is below maximum timemout value
      this.certificateTimeout = setTimeout(async () => {
        logger.info(`Certificate expires in under 30 days. Needs renewal!`);

        try {
          // request new certificate and use it
          const certData = await this.getNewCertificate(domains);
          this.serverUpdateFunction(certData, domains);

          // refresh renewal callback for new certificate
          this.keepUpToDate();
        } catch (err) {
          logger.error(`Failed to renew certificate. Reason: ${err}`);
        }
      }, diff);
    }
  }

  /**
   * Calculates information about when the certificate expires and when should be renewed
   *
   * @param {String} expires the expiry date of the certificate
   * @returns {{ renewalDate: Date, daysUntilRenewal: Number, remainingDays: Number }} information about the renewal of a certificate
   */
  getRenewalInfo(expires) {
    const expiryTime = new Date(expires).getTime();
    const currentTime = Date.now();
    const remainingTime = expiryTime - currentTime;
    const dayInMS = 1000 * 60 * 60 * 24;

    // certificates are valid for 90 days and should be renewed every 60 days
    // see: https://letsencrypt.org/docs/faq/#what-is-the-lifetime-for-let-s-encrypt-certificates-for-how-long-are-they-valid
    const timeBeforeRenewal = remainingTime - 30 * dayInMS;

    const remainingDays = remainingTime / dayInMS;
    const daysUntilRenewal = timeBeforeRenewal / dayInMS;

    const renewalDate = new Date(currentTime + timeBeforeRenewal);

    return { renewalDate, daysUntilRenewal, remainingDays };
  }

  /**
   * This function will setup a timemout that will renew the certificate before it becomes outdated
   */
  async keepUpToDate() {
    // clear existing timeout
    if (this.certificateTimeout) {
      clearTimeout(this.certificateTimeout);
      this.certificateTimeout = null;
    }

    // create timeout only if there a domains to cover
    const domains = this.getDomainsToCover();
    if (domains && domains.length) {
      // calulate the date at which the certificate should be renewed
      const { expires } = this.currentCertificate;

      const { renewalDate } = this.getRenewalInfo(expires);

      // trigger timeout that will renew the certificate
      this.renewAt(renewalDate, domains);
    }
  }
}

export default AcmeService;

/**
 * Returns the domains specified inside a certificate
 *
 * @param {String} pem the certificate string
 * @returns {String[]} list of domains
 */
export function getCertificateDomains(pem) {
  try {
    // parse the certificate
    const cert = forge.pki.certificateFromPem(pem);

    // check if there is an extension element that might contain the list of certificates
    if (!cert.extensions) {
      logger.debug(
        'Could not find extensions in certificate and thus no domains that are covered by it!',
      );
      return [];
    }

    const altNameEl = cert.extensions.find((el) => el.name === 'subjectAltName');

    // check if the list of domains is present in the extensions element
    if (!altNameEl) {
      logger.debug('Could not find domains that the used certificate covers!');
      return [];
    }

    const altnames = altNameEl.altNames.map((alt) => alt.value);

    return altnames;
  } catch (err) {
    logger.debug(err);
  }
}
