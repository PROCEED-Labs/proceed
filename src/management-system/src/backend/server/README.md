# PROCEED Management System Server

This is the server version of the PROCEED Management System.

## Installing the required dependencies

Before you can use the Management System Server Version, you have to install the dependencies with `npm install` or `yarn`.

This also installs Puppeteer, which requires some other libraries to be installed on the system: https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#chrome-headless-doesnt-launch-on-unix

## Starting the server

After installing the dependencies, start the server with the following command:

`yarn start` OR `npm start` OR `node server.js`

Afterwards open the Browser at: https://localhost:33080/

## Configuring SSL

By default, the server uses an insecure, untrusted developer certificate for HTTPS. So, you should absolutely use your own certificate and private key for encryption. Copy you certificate to `./ssl/certificate.pem` and the private key to `'./ssl/private-key.key`.
