// This server app makes use of the "type": "module" field in the package.json
// of the MS in order to enable import statements. If moved elsewhere this needs
// to be copied over.
import https from 'https';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import fse from 'fs-extra';
import __dirname from './dirname-node.js';
import { startWebsocketServer } from './socket.js';
import logger from '../shared-electron-server/logging.js';
import ports from '../../../ports.js';
import crypto from 'crypto';
import { createSessionStore } from './iam/session/store.js';
import createApiRouter from './rest-api/index.js';
import authRouter from './iam/authentication/auth.js';
import { getCertificate, handleLetsEncrypt } from './https-certificate-service/certificate.js';
import createConfig from './iam/utils/config.js';
import getClient from './iam/authentication/client.js';
import { getStorePath } from '../shared-electron-server/data/store.js';
import { abilityMiddleware } from './iam/middleware/authorization';

const configPath =
  process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '/environment-configurations/development/config_iam.json')
    : path.join(getStorePath('config'), 'config_iam.json');

/**
 * For explanation for the general server architecture, see:
 * https://github.com/PROCEED-Labs/proceed/wiki/Architecture-Server-and-Desktop-App#ms-server-architecture
 */

async function init() {
  const backendServer = express();

  const origin = [`https://localhost:${ports.puppeteer}`];

  if (process.env.NODE_ENV === 'development') {
    origin.push(
      `https://localhost:${ports['dev-server'].frontend}`,
      `https://localhost:${ports['dev-server'].puppeteer}`,
      `http://localhost:${ports['dev-server'].nextjs}`,
    );
  }

  let config;
  let client;
  let loginSession;
  let store;

  try {
    const file = await fse.readFile(configPath);
    if (file) {
      config = await createConfig(JSON.parse(file));
      store = await createSessionStore(config);
    }
  } catch (e) {
    config = await createConfig();
    logger.error(e.toString());
    logger.info('Started MS without Authentication and Authorization.');
  }

  backendServer.use(cookieParser());
  backendServer.use(
    process.env.NODE_ENV === 'development'
      ? cors()
      : cors({
          origin,
          credentials: true,
        }),
  );

  backendServer.use(helmet.hsts());

  const backendPuppeteerApp = express();

  // frontend is served by webpack-dev-server in development
  if (process.env.NODE_ENV === 'production') {
    // serve bundled frontend files
    backendServer.use(express.static(path.join(__dirname, './frontend')));

    // server puppeteer via different port => 1. only one client allowed, and 2. most secure way (not reachable from outside world)
    backendPuppeteerApp.use(express.static(path.join(__dirname, './puppeteerPages')));
  } else {
    // disables the server certificate verification -> ONLY USE IN DEV MODE!
    // makes TLS connections and HTTPS requests insecure by disabling server certificate verification, but necessary in DEV MODE because of self signed certificate, otherwise doesn't work with keycloak
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
  }

  backendServer.use(express.text({ type: ['text/plain', 'text/html'] }));
  backendServer.use(express.json());

  if (config.useAuthorization) {
    try {
      client = await getClient(config);
    } catch (e) {
      if (process.env.NODE_ENV === 'production') {
        logger.error(e.toString());
        throw new Error(e.toString());
      }
      logger.error(e.toString());
      logger.info('Started MS without Authentication and Authorization.');
    }
    const msUrl = new URL(config.msURL);
    const hostName = msUrl.hostname;
    const domainName = hostName.replace(/^[^.]+\./g, '');

    // express-session middleware currently saves keycloak data and cookie data in memorystore DB
    // ATTENTION: secret possibly has to be set to a fixed secure and unguessable value if the PROCEED MS runs in multiple containers, to prevent that each container uses a different secret > if a loadbalancer would redirect a user to a container with a mismatched secret, the session would be invalidated, maybe this is also resolvable with an external session DB like Redis
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies
    loginSession = session({
      resave: false,
      secret: crypto.randomBytes(64).toString('hex'), // random secret
      saveUninitialized: false, // doesn't save uninitialized sessions to the store
      store,
      cookie: {
        secure: process.env.NODE_ENV === 'development' ? 'auto' : true,
        sameSite: process.env.NODE_ENV === 'development' ? 'none' : 'strict',
        httpOnly: true,
        expires: 1000 * 60 * 60 * 10,
        path: '/',
        domain: process.env.NODE_ENV === 'development' ? 'localhost' : domainName,
      },
      name: 'id', // name of the cookie in the browser
    });
    backendServer.use(loginSession);
  }
  backendServer.use(authRouter(config, client)); // separate authentication routes
  backendServer.use(abilityMiddleware);

  // allow requests for Let's Encrypt
  const letsencryptPath = path.join(__dirname, 'lets-encrypt');
  if (process.env.NODE_ENV === 'production') {
    await fse.ensureDir(letsencryptPath);

    // create a server that will be used to serve the Let's Encrypt Challenge and then reused to forward to https for http requests
    const httpApp = express();

    httpApp.use(`/.well-known`, express.static(letsencryptPath, { dotfiles: 'allow' }));
    // reuse for redirect on other requests
    httpApp.get('*', (req, res) => {
      res.redirect('https://' + req.headers.host + req.url);
    });

    await httpApp.listen(80);
  }

  // get the best certificate available (user provided > automatic Lets' Encrypt Cert > Self Signed Dev Cert)
  const options = await getCertificate(letsencryptPath);

  const apiRouter = createApiRouter(config, client);
  backendServer.use(['/api', '/resources'], apiRouter);

  // Frontend + REST API
  const frontendServer = https.createServer(options, backendServer).listen(ports.frontend, () => {
    logger.info(
      `MS HTTPS server started on port ${ports.frontend}. Open: https://<IP>:${ports.frontend}/`,
    );
  });

  // Puppeteer Endpoint
  https.createServer(options, backendPuppeteerApp).listen(ports.puppeteer, 'localhost', () => {
    logger.debug(
      `HTTPS Server for Puppeteer started on port ${ports.puppeteer}. Open: https://localhost:${ports.frontend}/bpmn-modeller.html`,
    );
  });

  // WebSocket Endpoint for Collaborative Editing
  // Only here for API_ONLY because we need the const in the call below.
  const websocketServer = https.createServer(options);

  if (process.env.NODE_ENV === 'production') {
    handleLetsEncrypt(letsencryptPath, [frontendServer, websocketServer]);
  }

  if (process.env.API_ONLY) {
    return;
  }

  startWebsocketServer(websocketServer, loginSession, config);

  // Load BPMN Modeller for Server after Websocket Endpoint is started
  (await import('./puppeteerStartWebviewWithBpmnModeller.js')).default();
}

init();
