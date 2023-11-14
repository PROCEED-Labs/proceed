# PROCEED dBPMS

[![CI/CD](https://github.com/PROCEED-Labs/proceed/actions/workflows/build_test_deploy.yml/badge.svg)](https://github.com/PROCEED-Labs/proceed/actions/workflows/build_test_deploy.yml)

PROCEED is a decentralized Business Process Management System (dBPMS) specialized on the creation, execution and monitoring of individual IoT processes.
The execution is done decentralized without a controlling instance.
Instead there are multiple machines that cooperate with each other to achieve the designed process goal.
Thereby, all machines communicate their capabilities to the vicinity and the process is taking the best fitting one for its next execution step.

There are two main components in PROCEED:

1. the _Management System_ (MS): here you can create IoT processes and monitor the execution. This is a desktop application available for Linux, Windows and Mac.
2. the _Distributed Process Engine_ (DPE, or just Engine): this components accepts process steps and executes them. Moreover, it manages the underlying Machine, interacts with other Engines and communicates the Machine's capabilities. The DPE is available for many platforms and can easily be ported to missing architectures with our platform-independent framework.

For more information, have a look at the documentation: https://docs.proceed-labs.org/ .
There, you can also [download nightly builds](https://docs.proceed-labs.org/downloads/).

# Progress, Contributions and Organization

We started with a small developer team based on a research project.
The requirements are still driven by research projects, but we are also very open for community feedback and contributions.

Currently, we mainly organize our development tasks with [Trello](https://trello.com/b/9FsPcQhv).
If you have ideas or find bugs, please create a an [Issue](https://github.com/PROCEED-Labs/proceed/issues).
We are very open for help and project contributions.
Regularly there are on-boarding development workshops and, if you are interested, we have weekly video calls on Thursday with all developers.

We've created [many Wiki pages](https://github.com/PROCEED-Labs/proceed/wiki) for a better understanding of the internals.
For development you should start with looking at the [Hints for Installation and Configuration with our preferred tools](https://github.com/PROCEED-Labs/proceed/wiki/Installation-and-Configuration-for-Development) and afterwards read the [Contribution information](https://github.com/PROCEED-Labs/proceed/wiki/Contribution)

For further information, just contact us: proceed@snet.tu-berlin.de

# Coding

This project is organized as a Mono-Repo and contains multiple software project developed by PROCEED:

- the PROCEED Engine (DPE) for Win, Linux, Mac, Android, iOS, Browser, MCUs
- the Management System (MS) as a Desktop and Server version
- Machine Capabilities
- supporting libraries/modules

## Install Development Software

To develop for PROCEED you need to [install yarn](https://yarnpkg.com/en/docs/install), and also install Node > v12.18.

For further information about installation and configuration of our favorite development environment, [see the Wiki page](https://github.com/PROCEED-Labs/proceed/wiki/Installation-and-Configuration-for-Development) and [the debugging configuration](https://github.com/PROCEED-Labs/proceed/wiki/Debugging).

## Install PROCEED Dependencies

After cloning the repository, you need to install the PROCEED project dependencies and all third-party libraries. Run the following command in the root directory of the repo:

```
yarn install
```

This will install all modules and their dependencies inside `node_modules/`

> Note: On macOS catalina there might be an error message popping up during the install step involving node-gyp. If it says "no xcode or clt version detected" then follow the steps from [this page of the node-gyp repo](https://github.com/nodejs/node-gyp/blob/master/macOS_Catalina.md) to resolve this problem.

For the Engine and the Management System there are _development_ and _build_ commands configured in the `package.json` file.

## Development

> Please note that you need access to the private Environment Configurations repository, if you want to develop with Authentication & Authorization!

You can start the development modes by running the following commands

**Engine:**

```
// Node.js
yarn dev

// Browser version
yarn dev-engine-web
```

**Management System:**

```
// NextJS frontend
yarn dev-ms

// API
yarn dev-ms-api

// NextJS frontend without Authentication & Authorization
yarn dev-ms-no-iam

// API frontend without Authentication & Authorization
yarn dev-ms-api-no-iam
```

**Old Vue Management System:**

```
// Old Vue Management System
yarn dev-ms-old-iam

// Old Vue Management System without Authentication & Authorization
yarn dev-ms-old
```

_Server version:_ If successful, this automatically starts a Chrome/Chromium browser, and afterwards the MS frontend inside the Browser (hot-reloading) on the URL: https://localhost:33083/ For more information, see [the architecture description in the Wiki](https://github.com/PROCEED-Labs/proceed/wiki/Architecture-Server-and-Desktop-App#ms-server-architecture).

> Beware: We are using HTTPS with a self-signed certificate for development. This will most likely lead to your browser warning you upon the first start of the frontend. You have to accept that warning and create an exception to continue to the site. The self-signed certificate will also lead to errors when the frontend [tries to connect to the other HTTPS endpoints (WebSocket and Puppeteer)](https://github.com/PROCEED-Labs/proceed/wiki/Architecture-Server-and-Desktop-App). The easiest way to solve this, is to open all endpoints directly inside the browser and add an exception for every enpoint-certificate combination. For the development this is https://localhost:33080 and https://localhost:33081.
> This should allow the frontend to connect to the other endpoints in subsequent tries.

**Authentication & Authorization**

Wether you start the API with `yarn dev-ms-api` or `yarn dev-ms-api-auth0` you can log in with two default users just by typing their name in the 'Sign in with Development Users' section:

- Admin: With the username `admin`.
- John Doe: With the username `johndoe`.

If you start the API with `yarn dev-ms-api-auth0`, two users are created on the development Auth0 environment:

- Admin: With the username `admin` and the password `ProceedAdm1n!`.
- John Doe: With the username `johndoe` and the password `JohnDoe1!`.

> :warning: To use `yarn dev-ms-api-auth0` you need access to the private environments repository.

## Testing

Before committing a new version, a linting check is automatically done.  
Before pushing a new version into the repository, the Engine and MS tests are automatically executed.

**Engine:**

```
yarn test

// E2E test with a started Engine
yarn test-e2e
```

**Management System:**

```
yarn test-ms
```

## Building

To build the bundled and minified JavaScript files run the following commands

**Engine:**

```
// Node.js
yarn build

// Browser version
yarn build-engine-web
```

The results will be generated inside the `/build/engine/` folder.

**Management System:**

```
// Desktop Linux and Windows
yarn build-ms

// Desktop MacOS (on a Mac)
yarn build-ms-mac

// Server
yarn build-ms-server
```

The results will be generated inside the `/build/management-system/*` folder.

## Generate JSDoc API

To generate the JSDoc API, use `yarn jsdoc`. Afterwards the generated HTML files can be found in `./jsdoc/output_html`. You can open the `index.html` to see the JSDoc documentation.

To configure JSDoc change the `jsdoc.config.json` file and see here: [JSDoc README](./jsdoc/README.md).

## Docker

The Engine can also be started from a Docker image.
To run a Docker container, execute the following (automatically fetched from Docker Hub):

**Engine (only on Linux useful because of the possible `--network host` parameter in Docker):**

```
yarn docker:run
```

To stop a running Docker container, execute the following:

```
yarn docker:stop
```

To create a new Docker images from source, execute the following:

**MS Server:**

```
yarn docker:run-server
```

And to stop the server again:

```
yarn docker:stop-server
```

For the exact docker commands look into the Dockerfiles for the Engine and the Server.
There are multiple options and possibilities explained to start and configure the Docker container.

## Linux Systemd Service

If you want to have the engine automatically started at OS start, you can use a systemd service on most current Linux systems.

You find a template service file inside the build folder (e.g. /build/engine) called `proceed-engine.service`. Copy the file to `/etc/systemd/system/`.

Next, replace the keywords `<user>`, `<dir-where-proceed-engine-is-installed>` and `<path-to-node-binary>` with the respective values (without '<' and '>').

Now, advertise the new file to the system with `sudo systemctl daemon-reload`.
Afterwards, you can control the PROCEED engine with:

```
sudo systemctl start|stop|restart proceed-engine.service
```

Use

```
systemctl status proceed-engine.service
```

and

```
journalctl -ef --unit proceed-engine.service
```

to see the status and log entries.

If you want to (not) load the PROCEED Engine at startup, just type

```
sudo systemctl enable|disable proceed-engine.service
```
