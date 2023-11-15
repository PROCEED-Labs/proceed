import { spawn, execSync, spawnSync } from 'child_process';
const axios = require('axios');
const fs = require('fs');

const startManagementSystem = () => {
  if (!process.env.API_ONLY) {
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
  }

  const serverProcess = spawn('yarn', ['web:dev-start-backend'], { cwd: __dirname, shell: true });

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
  // start docker container in separate subprocess
  const opaProcess = spawn('docker compose', ['-f', 'docker-compose-dev-iam.yml', 'up'], {
    cwd: __dirname,
    shell: true,
  });

  opaProcess.stdout.on('data', (data) => {
    const dataString = data.toString();
    console.log('Redis', dataString);
  });
  opaProcess.stderr.on('data', (data) => {
    const dataString = data.toString();
    console.error('Redis', dataString);
  });

  opaProcess.on('exit', (code) => process.exit(code));

  // when ctrl + c detected stop docker container
  process.on('SIGINT', () => {
    execSync('docker compose -f docker-compose-dev-iam.yml down');
    process.exit(1);
  });

  startManagementSystem();
} else {
  startManagementSystem();
}
