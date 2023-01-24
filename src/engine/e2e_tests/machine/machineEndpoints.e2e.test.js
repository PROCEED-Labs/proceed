const { spawn } = require('child_process');

const request = require('supertest')('localhost:33019');

jest.setTimeout(60000);

describe('Test GET /machine endpoint', () => {
  let response;

  beforeAll(async () => {
    response = await request.get('/machine');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
  });

  test('Test if it is allowed to request multiple keys at once: /machine/cpu,mem,disk', async () => {
    const responseMultiple = await request.get('/machine/cpu,mem,disk');
    expect(responseMultiple.body).toHaveProperty('cpu');
    expect(responseMultiple.body).toHaveProperty('mem');
    expect(responseMultiple.body).toHaveProperty('disk');
  });

  describe('Test CPU loads', () => {
    let responseCPU;

    beforeAll(async () => {
      responseCPU = await request.get('/machine/cpu');
      expect(responseCPU.status).toBe(200);
      expect(responseCPU.headers['content-type']).toMatch(/json/);
    });

    test('/machine/cpu "currentLoad" is available', () => {
      expect(responseCPU.body.cpu).toHaveProperty('currentLoad');
      expect(responseCPU.body.cpu.currentLoad).toBeDefined();
      expect(responseCPU.body.cpu.currentLoad).toBeGreaterThan(0);
      expect(responseCPU.body.cpu.currentLoad).toBeLessThanOrEqual(100);
    });
    test('/machine/cpu "loadLastMinute" is calculated', () => {
      expect(responseCPU.body.cpu).toHaveProperty('loadLastMinute');
      expect(responseCPU.body.cpu.loadLastMinute).toBeDefined();
      expect(responseCPU.body.cpu.loadLastMinute).toBeGreaterThan(0);
      expect(responseCPU.body.cpu.loadLastMinute).toBeLessThanOrEqual(100);
    });
    test('/machine/cpu "loadLastTenMinutes" is calculated', () => {
      expect(responseCPU.body.cpu).toHaveProperty('loadLastTenMinutes');
      expect(responseCPU.body.cpu.loadLastTenMinutes).toBeDefined();
      expect(responseCPU.body.cpu.loadLastTenMinutes).toBeGreaterThan(0);
      expect(responseCPU.body.cpu.loadLastTenMinutes).toBeLessThanOrEqual(100);
    });
    test('/machine/cpu "loadLastHalfHour" is calculated', () => {
      expect(responseCPU.body.cpu).toHaveProperty('loadLastHalfHour');
      expect(responseCPU.body.cpu.loadLastHalfHour).toBeDefined();
      expect(responseCPU.body.cpu.loadLastHalfHour).toBeGreaterThan(0);
      expect(responseCPU.body.cpu.loadLastHalfHour).toBeLessThanOrEqual(100);
    });
    test('/machine/cpu "loadLastHour" is calculated', () => {
      expect(responseCPU.body.cpu).toHaveProperty('loadLastHour');
      expect(responseCPU.body.cpu.loadLastHour).toBeDefined();
      expect(responseCPU.body.cpu.loadLastHour).toBeGreaterThan(0);
      expect(responseCPU.body.cpu.loadLastHour).toBeLessThanOrEqual(100);
    });
    test('/machine/cpu "loadLastHalfDay" is calculated', () => {
      expect(responseCPU.body.cpu).toHaveProperty('loadLastHalfDay');
      expect(responseCPU.body.cpu.loadLastHalfDay).toBeDefined();
      expect(responseCPU.body.cpu.loadLastHalfDay).toBeGreaterThan(0);
      expect(responseCPU.body.cpu.loadLastHalfDay).toBeLessThanOrEqual(100);
    });
    test('/machine/cpu "loadLastDay" is calculated', () => {
      expect(responseCPU.body.cpu).toHaveProperty('loadLastDay');
      expect(responseCPU.body.cpu.loadLastDay).toBeDefined();
      expect(responseCPU.body.cpu.loadLastDay).toBeGreaterThan(0);
      expect(responseCPU.body.cpu.loadLastDay).toBeLessThanOrEqual(100);
    });
  });

  describe('Test General Machine Values', () => {
    test('/machine "hostname" is given', () => {
      expect(response.body).toHaveProperty('hostname');
      expect(response.body.hostname).toBeDefined();
      expect(response.body.hostname.length).toBeGreaterThan(0);
    });

    test('/machine "id" is given', () => {
      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBeDefined();
      expect(response.body.id.length).toBeGreaterThan(0);
    });

    test('/machine "port" is given', () => {
      expect(response.body).toHaveProperty('port');
      expect(response.body.port).toBeDefined();
      expect(response.body.port).toBeGreaterThan(0);
      expect(response.body.port).toBeLessThanOrEqual(65000);
    });

    test('/machine "online" is given', () => {
      expect(response.body).toHaveProperty('online');
      expect(response.body.online).toBeDefined();
    });

    test('/machine "os.platform" is given', () => {
      expect(response.body).toHaveProperty('os.platform');
      expect(response.body.os.platform).toBeDefined();
      expect(response.body.os.platform.length).toBeGreaterThan(0);
    });

    test('/machine "outputs" is given', () => {
      expect(response.body).toHaveProperty('outputs');
      expect(response.body.outputs).toBeDefined();
    });

    test('/machine "inputs" is given', () => {
      expect(response.body).toHaveProperty('inputs');
      expect(response.body.inputs).toBeDefined();
    });
  });
});
