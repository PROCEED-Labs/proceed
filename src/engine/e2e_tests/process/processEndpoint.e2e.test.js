const fs = require('fs');
const path = require('path');
const request = require('supertest')('localhost:33019');

const bpmn = fs.readFileSync(
  path.resolve(__dirname, './data/processBPMN/basicUserTaskProcess.xml'),
  'utf8',
);

const bpmnWithImage = fs.readFileSync(
  path.resolve(__dirname, './data/processBPMN/withImage.xml'),
  'utf8',
);

const fileRefScriptTask = fs.readFileSync(
  path.resolve(__dirname, './data/processBPMN/fileRefScriptTask.xml'),
  'utf8',
);

jest.setTimeout(15000);

describe('Test process endpoints', () => {
  describe('/process', () => {
    it('is an accessible endpoint for GET requests', async () => {
      const response = await request.get('/process');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
    });
    it('allows to store new process versions on the engine using POST requests', async () => {
      const putResponse = await request.post('/process/').send({ bpmn });
      expect(putResponse.status).toBe(200);
      const response = await request.get('/process/');
      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual([
        {
          definitionId: 'definitionId',
          versions: [
            {
              bpmn,
              definitionName: 'basicStatic',
              deploymentMethod: 'dynamic',
              deploymentDate: expect.any(Number),
              needs: { html: ['userTaskFileName'], imports: [], images: [], scripts: [] },
              versionId: '123',
            },
          ],
          instances: [],
        },
      ]);
    });
    it('registers a script file as a dependency if it is referenced in the bpmn send in a POST request', async () => {
      const putResponse = await request.post('/process/').send({ bpmn: fileRefScriptTask });
      expect(putResponse.status).toBe(200);
      const response = await request.get('/process/fileRefScriptTaskDefinitionId');
      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({
        definitionId: 'fileRefScriptTaskDefinitionId',
        versions: [
          {
            bpmn: fileRefScriptTask,
            definitionName: 'scriptFileRef',
            deploymentMethod: 'dynamic',
            deploymentDate: expect.any(Number),
            needs: {
              html: [],
              imports: [],
              images: [],
              scripts: ['scriptTaskFileName'],
            },
            versionId: '123',
          },
        ],
        instances: [],
      });
    });
    it('registers an image as a dependency if it is referenced in the bpmn send in a POST request', async () => {
      const putResponse = await request.post('/process/').send({ bpmn: bpmnWithImage });
      expect(putResponse.status).toBe(200);
      const response = await request.get('/process/_64552049-90bf-4f5b-96dd-e00747261755');
      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({
        definitionId: '_64552049-90bf-4f5b-96dd-e00747261755',
        versions: [
          {
            bpmn: bpmnWithImage,
            definitionName: 'With Image',
            deploymentMethod: 'dynamic',
            deploymentDate: expect.any(Number),
            needs: {
              html: ['User_Task_1qjpbcl-1671026484009'],
              imports: [],
              images: ['Activity_08fwikp_image123e6803-63a8-4cf1-9596-2999fdd016a7.png'],
              scripts: [],
            },
            versionId: '1671026484009',
            versionName: 'Version 1',
            versionDescription: 'Initial Version',
            basedOnVersion: '1671024712832',
          },
        ],
        instances: [],
      });
    });
    describe('/process/{definitionId}', () => {
      it('returns process bpmn on GET on existing process', async () => {
        const response = await request.get('/process/definitionId');
        expect(response.status).toBe(200);
        expect(response.body).toStrictEqual({
          definitionId: 'definitionId',
          versions: [
            {
              bpmn,
              definitionName: 'basicStatic',
              deploymentMethod: 'dynamic',
              deploymentDate: expect.any(Number),
              needs: { html: ['userTaskFileName'], imports: [], images: [], scripts: [] },
              versionId: '123',
            },
          ],
          instances: [],
        });
      });

      describe('/process/{definitionId}/versions', () => {
        it('returns an array containing all the known versions of a process on a GET request', async () => {
          const getResponse = await request.get('/process/definitionId/versions');
          expect(getResponse.status).toBe(200);
          expect(getResponse.body).toStrictEqual(['123']);
        });

        describe('/process/{definitionId}/versions/{version}', () => {
          it('returns the information about a specific version of a process on a GET request', async () => {
            const getResponse = await request.get('/process/definitionId/versions/123');
            expect(getResponse.status).toBe(200);
            expect(getResponse.body).toStrictEqual({
              bpmn,
              definitionName: 'basicStatic',
              deploymentMethod: 'dynamic',
              deploymentDate: expect.any(Number),
              needs: { html: ['userTaskFileName'], imports: [], images: [], scripts: [] },
              versionId: '123',
            });
          });
        });
      });

      describe('/process/{definitionId}/user-tasks/{userTaskFileName}', () => {
        it('saves the user task html on PUT request', async () => {
          // check that the user task is currently missing
          const response = await request.get('/process/definitionId/user-tasks/userTaskFileName');
          expect(response.status).toBe(404);

          const html = '<html><head></head><body><form></form></body></html>';
          const putResponse = await request
            .put('/process/definitionId/user-tasks/userTaskFileName')
            .send({ html });
          expect(putResponse.status).toBe(200);
          const getResponse = await request.get(
            '/process/definitionId/user-tasks/userTaskFileName',
          );
          expect(getResponse.status).toBe(200);
          expect(Buffer.from(JSON.parse(getResponse.text).data).toString()).toMatch(html);
        });
        it('adds an image that is referenced in the html to the dependencies of versions that use the user task', async () => {
          const putResponse = await request
            .put(
              '/process/_64552049-90bf-4f5b-96dd-e00747261755/user-tasks/User_Task_1qjpbcl-1671026484009',
            )
            .send({
              html: '<html><head></head><body><form><img src="/resources/process/_64552049-90bf-4f5b-96dd-e00747261755/images/User_Task_1qjpbcl_image72fe83de-2c44-4d1f-ae71-6b323bee7f1c.png"></img></form></body></html>',
            });
          expect(putResponse.status).toBe(200);
          const getResponse = await request.get(
            '/process/_64552049-90bf-4f5b-96dd-e00747261755/user-tasks/User_Task_1qjpbcl-1671026484009',
          );
          expect(getResponse.status).toBe(200);

          const response = await request.get('/process/_64552049-90bf-4f5b-96dd-e00747261755');
          expect(response.status).toBe(200);
          expect(response.body).toStrictEqual({
            definitionId: '_64552049-90bf-4f5b-96dd-e00747261755',
            versions: [
              {
                bpmn: bpmnWithImage,
                definitionName: 'With Image',
                deploymentMethod: 'dynamic',
                deploymentDate: expect.any(Number),
                needs: {
                  html: ['User_Task_1qjpbcl-1671026484009'],
                  imports: [],
                  images: [
                    'Activity_08fwikp_image123e6803-63a8-4cf1-9596-2999fdd016a7.png',
                    'User_Task_1qjpbcl_image72fe83de-2c44-4d1f-ae71-6b323bee7f1c.png',
                  ],
                  scripts: [],
                },
                versionId: '1671026484009',
                versionName: 'Version 1',
                versionDescription: 'Initial Version',
                basedOnVersion: '1671024712832',
              },
            ],
            instances: [],
          });
        });
      });

      describe('/process/{definitionId}/script-tasks/{userTaskFileName}', () => {
        it('saves the script task script on PUT request', async () => {
          // check that the script task is currently missing
          const response = await request.get(
            '/process/definitionId/script-tasks/scriptTaskFileName',
          );
          expect(response.status).toBe(404);

          const script = 'console.log("Hello Test");';
          const putResponse = await request
            .put('/process/definitionId/script-tasks/scriptTaskFileName')
            .send({ script });
          expect(putResponse.status).toBe(200);
          const getResponse = await request.get(
            '/process/definitionId/script-tasks/scriptTaskFileName',
          );
          expect(getResponse.status).toBe(200);
          expect(getResponse.text).toMatch(script);
        });
      });

      describe('/process/{definitionId}/instance', () => {
        let instanceId;
        beforeAll(async () => {
          const getResponse = await request.get('/process/definitionId/instance');
          expect(getResponse.status).toBe(200);
          expect(getResponse.body).toStrictEqual([]);
          const postResponse = await request.post('/process/definitionId/versions/123/instance');
          expect(postResponse.status).toBe(201);
          ({ instanceId } = postResponse.body);
          // allow everything to start correctly (the user task should have completely started)
          await new Promise((res) => setTimeout(res, 500));
        });
        it('responds with statuscode 404 on GET requests with nonexisting definitionId', async () => {
          const response = await request.get('/process/unknownDefinitionId/instance');
          expect(response.status).toBe(404);
        });
        it('returns array containing information about all instances of a process on GET requests', async () => {
          const getResponse = await request.get('/process/definitionId/instance');
          expect(getResponse.status).toBe(200);
          expect(getResponse.body).toStrictEqual([instanceId]);
        });
        describe('/process/{definitionId}/instance/{instanceId}', () => {
          it('responds with an information object for the instance with the requested id on GET requests', async () => {
            const response = await request.get(`/process/definitionId/instance/${instanceId}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('instanceState');
            expect(response.body).toHaveProperty('processId');
            expect(response.body).toHaveProperty('processInstanceId');
            expect(response.body).toHaveProperty('tokens');
            response.body.tokens.forEach((token) => {
              // TODO: expect(token).toHaveProperty('state');
              expect(token).toHaveProperty('tokenId');
              expect(token).toHaveProperty('state');
              expect(token).toHaveProperty('currentFlowElementId');
              //expect(token).toHaveProperty('localStartTime');
              //expect(token).toHaveProperty('localExecutionTime');
              //expect(token).toHaveProperty('machineHops');
              // TODO: expect(token).toHaveProperty('machineHops');
            });
          });
        });
        describe('/process/{definitionId}/instance/{instanceId}/instanceState', () => {
          it('allows remotely stopping an instance with a PUT request', async () => {
            const putResponse = await request
              .put(`/process/definitionId/instance/${instanceId}/instanceState`)
              .send({ instanceState: 'stopped' });
            expect(putResponse.status).toBe(200);
            const getResponse = await request.get(`/process/definitionId/instance/${instanceId}`);
            expect(getResponse.body.instanceState).toStrictEqual(['STOPPED']);
          });
        });
      });

      it('allows processes to be deleted using DELETE requests', async () => {
        const response = await request.delete('/process/definitionId');
        expect(response.status).toBe(200);
        const getResponse = await request.get('/process/definitionId');
        expect(getResponse.status).toBe(404);
        await request.delete('/process/_64552049-90bf-4f5b-96dd-e00747261755');
      });
    });
  });
});
