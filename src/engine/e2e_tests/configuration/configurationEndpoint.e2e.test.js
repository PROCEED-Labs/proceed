const { spawn } = require('child_process');

const request = require('supertest')('localhost:33019');

jest.setTimeout(15000);

describe('Testing GETTing /configuration endpoint values', () => {
  let response;

  beforeAll(async () => {
    response = await request.get('/configuration');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
  });

  test('/configuration "name" is available', () => {
    expect(response.body).toHaveProperty('name');
    expect(response.body.name).toBeDefined();
  });

  test('/configuration "description" is available', () => {
    expect(response.body).toHaveProperty('description');
    expect(response.body.description).toBeDefined();
  });

  test('/configuration "logs" is available', () => {
    expect(response.body).toHaveProperty('logs');
    expect(response.body.logs).toBeDefined();
  });

  test('/configuration "processes" is available', () => {
    expect(response.body).toHaveProperty('processes');
    expect(response.body.processes).toBeDefined();
  });

  test('/configuration "machine" is available', () => {
    expect(response.body).toHaveProperty('machine');
    expect(response.body.machine).toBeDefined();
  });
});

describe('Setting /configuration endpoint values', () => {
  afterAll(async () => {
    const response = await request.delete('/configuration');
    expect(response.status).toBe(200);
  });

  test('PUT /configuration "name" to a value', async () => {
    await request.put('/configuration').send({ name: 'TestMachineName' });
    const response = await request.get('/configuration');
    expect(response.body).toHaveProperty('name');
    expect(response.body.name).toBe('TestMachineName');
    expect(response.body.name).not.toBe('OtherName');
  });

  test('DELETE /configuration "name" after setting it', async () => {
    await request.put('/configuration').send({ name: 'TestMachineName' });
    let response = await request.get('/configuration');
    expect(response.body).toHaveProperty('name');
    expect(response.body.name).toBe('TestMachineName');
    expect(response.body.name).not.toBe('OtherName');

    await request.delete('/configuration');
    response = await request.get('/configuration');
    expect(response.body).toHaveProperty('name');
    expect(response.body.name).not.toBe('TestMachineName');
    expect(response.body.name.length).toBe(0);
  });
});
