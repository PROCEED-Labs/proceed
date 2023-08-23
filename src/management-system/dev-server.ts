import { spawn, execSync, spawnSync } from 'child_process';
const axios = require('axios');
const fs = require('fs');

const startManagementSystem = () => {
  const frontendDevServerProcess = spawn('yarn', ['web:dev-serve-frontend'], {
    cwd: __dirname,
    shell: true,
  });

  frontendDevServerProcess.stdout.on('data', (data) => {
    const dataString = data.toString();
    console.log('Webpack-Dev-Server-Frontend: ', dataString);
  });
  frontendDevServerProcess.stderr.on('data', (data) => {
    const dataString = data.toString();
    console.error('Webpack-Dev-Server-Frontend: ', dataString);
  });

  const serverProcess = spawn('yarn', ['web:dev-start-backend'], { cwd: __dirname, shell: true });

  const backendPuppeteerDevServerProcess = spawn('yarn', ['web:dev-serve-backend-puppeteer'], {
    cwd: __dirname,
    shell: true,
  });

  backendPuppeteerDevServerProcess.stdout.on('data', (data) => {
    const dataString = data.toString();
    console.log('Webpack-Dev-Server-Backend-Puppeteer: ', dataString);
  });
  backendPuppeteerDevServerProcess.stderr.on('data', (data) => {
    const dataString = data.toString();
    console.error('Webpack-Dev-Server-Backend-Puppeteer: ', dataString);
  });

  serverProcess.stdout.on('data', (data) => {
    const dataString = data.toString();
    console.log('Server: ', dataString);
  });
  serverProcess.stderr.on('data', (data) => {
    const dataString = data.toString();
    console.error('Server: ', dataString);
  });
};

// check if start with or without IAM
if (process.env.MODE === 'iam') {
  const path = './src/backend/server/environment-configurations/development/config_iam.json';

  // if submodule doesn't exist, add environment submodule
  if (!fs.existsSync(path)) {
    console.log('Cloning dev environment: https://github.com/PROCEED-Labs/environments');
    console.log(
      "If you're in a terminal, you're going to need a personal-access-token (https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) because passwords are no longer allowed (https://docs.github.com/en/get-started/getting-started-with-git/about-remote-repositories#cloning-with-https-urls).",
    );
    console.log(
      'You can also run the server in VS Code and let VS Code handle the authentication flow.',
    );

    execSync(
      'cd ./src/backend/server/ && git submodule add --force https://github.com/PROCEED-Labs/environments environment-configurations',
    );
  }

  // start docker container in separate subprocess
  const opaProcess = spawn('docker compose', ['-f', 'docker-compose-dev-iam.yml', 'up'], {
    cwd: __dirname,
    shell: true,
  });

  opaProcess.stdout.on('data', (data) => {
    const dataString = data.toString();
    console.log('Open-Policy-Agent: ', dataString);
  });
  opaProcess.stderr.on('data', (data) => {
    const dataString = data.toString();
    console.error('Open-Policy-Agent: ', dataString);
  });

  // when ctrl + c detected stop docker container
  process.on('SIGINT', () => {
    execSync('docker compose -f docker-compose-dev-iam.yml down');
    process.exit(1);
  });

  // check health endpoint for OPA container to know, when to start the Management System
  const checkOpaHealth = async () => {
    setTimeout(async function () {
      try {
        const health = await axios.get(`http://localhost:8181/health`);
        if (health.status === 200) {
          startManagementSystem();
        } else {
          checkOpaHealth();
        }
      } catch (e) {
        checkOpaHealth();
      }
    }, 1000);
  };

  checkOpaHealth();
} else {
  startManagementSystem();
}
