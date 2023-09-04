const { wrapInFilterResponseMiddleware } = require('../middleware.js');

describe('testing the helper functions used for the distribution routes', () => {
  describe('wrapInFilterResponseMiddleware', () => {
    let mockEndpointHandler;
    let wrappedEndpointHandler;

    function stringify(value) {
      return JSON.stringify(value);
    }

    beforeEach(() => {
      mockEndpointHandler = jest.fn().mockResolvedValue({});
      wrappedEndpointHandler = wrapInFilterResponseMiddleware(mockEndpointHandler);
    });

    it('will return an object that only contains the requested entries of the endpoint handlers response', async () => {
      mockEndpointHandler.mockResolvedValueOnce(
        stringify({
          definitionId: 'process1',
          versions: [
            { bpmn: 'BPMN1', deploymentDate: 50, version: 1 },
            { bpmn: 'BPMN2', deploymentDate: 60, version: 2 },
          ],
          instances: [
            {
              processId: 'process1',
              instanceState: ['ENDED'],
              tokens: [
                { tokenId: 'token1', state: 'RUNNING' },
                { tokenId: 'token2', state: 'ENDED' },
              ],
            },
          ],
        }),
      );

      const result = await wrappedEndpointHandler({ query: { entries: 'definitionId,versions' } });
      expect(mockEndpointHandler).toHaveBeenCalled();

      expect(result).toStrictEqual(
        stringify({
          definitionId: 'process1',
          versions: [
            { bpmn: 'BPMN1', deploymentDate: 50, version: 1 },
            { bpmn: 'BPMN2', deploymentDate: 60, version: 2 },
          ],
        }),
      );
    });

    it('will filter child entries when the request object contains nested objects', async () => {
      mockEndpointHandler.mockResolvedValueOnce(
        stringify({
          definitionId: 'process1',
          b: {
            attr1: { child1: 'a', child2: 5 },
            attr2: { child1: 10, child2: 'abc' },
            attr3: 'something',
          },
          versions: [
            { bpmn: 'BPMN1', deploymentDate: 50, version: 1 },
            { bpmn: 'BPMN2', deploymentDate: 60, version: 2 },
          ],
          instances: [
            {
              processId: 'process1',
              instanceState: ['ENDED'],
              tokens: [
                { tokenId: 'token1', state: 'RUNNING' },
                { tokenId: 'token2', state: 'ENDED' },
              ],
            },
          ],
        }),
      );

      await expect(
        wrappedEndpointHandler({
          query: { entries: 'definitionId,b(attr1,attr2(child1)),versions' },
        }),
      ).resolves.toStrictEqual(
        stringify({
          definitionId: 'process1',
          b: { attr1: { child1: 'a', child2: 5 }, attr2: { child1: 10 } },
          versions: [
            { bpmn: 'BPMN1', deploymentDate: 50, version: 1 },
            { bpmn: 'BPMN2', deploymentDate: 60, version: 2 },
          ],
        }),
      );
    });

    it('will filter every entry in an array when requested', async () => {
      mockEndpointHandler.mockResolvedValueOnce(
        stringify([
          {
            definitionId: 'process1',
            versions: [
              { bpmn: 'BPMN1', deploymentDate: 50, version: 1 },
              { bpmn: 'BPMN2', deploymentDate: 60, version: 2 },
            ],
            instances: [
              {
                processId: 'process1',
                instanceState: ['ENDED'],
                tokens: [
                  { tokenId: 'token1', state: 'RUNNING' },
                  { tokenId: 'token2', state: 'ENDED' },
                ],
              },
            ],
          },
          {
            definitionId: 'process2',
            versions: [{ bpmn: 'BPMN3', deploymentDate: 50, version: 1 }],
            instances: [],
          },
        ]),
      );

      await expect(
        wrappedEndpointHandler({
          query: { entries: 'definitionId,versions' },
        }),
      ).resolves.toStrictEqual(
        stringify([
          {
            definitionId: 'process1',
            versions: [
              { bpmn: 'BPMN1', deploymentDate: 50, version: 1 },
              { bpmn: 'BPMN2', deploymentDate: 60, version: 2 },
            ],
          },
          {
            definitionId: 'process2',
            versions: [{ bpmn: 'BPMN3', deploymentDate: 50, version: 1 }],
          },
        ]),
      );
    });

    it('will filter every entry in a nested array when requested', async () => {
      mockEndpointHandler.mockResolvedValueOnce(
        stringify({
          definitionId: 'process1',
          versions: [
            { bpmn: 'BPMN1', deploymentDate: 50, version: 1 },
            { bpmn: 'BPMN2', deploymentDate: 60, version: 2 },
          ],
          instances: [
            {
              processId: 'process1',
              instanceState: ['ENDED'],
              tokens: [
                { tokenId: 'token1', state: 'RUNNING' },
                { tokenId: 'token2', state: 'ENDED' },
              ],
            },
          ],
        }),
      );

      await expect(
        wrappedEndpointHandler({
          query: { entries: 'definitionId,instances(processId,tokens(tokenId))' },
        }),
      ).resolves.toStrictEqual(
        stringify({
          definitionId: 'process1',
          instances: [
            {
              processId: 'process1',
              tokens: [{ tokenId: 'token1' }, { tokenId: 'token2' }],
            },
          ],
        }),
      );
    });

    it('will not filter if the returned value is not an array or object', async () => {
      mockEndpointHandler.mockResolvedValueOnce('Test');

      const result = await wrappedEndpointHandler({ query: { entries: 'definitionId,versions' } });
      expect(mockEndpointHandler).toHaveBeenCalled();

      expect(result).toStrictEqual('Test');
    });

    it('can handle the response inside an object returned by the endpoint handler', async () => {
      mockEndpointHandler.mockResolvedValueOnce({
        statusCode: 201,
        mimeType: 'application/json',
        response: stringify({
          definitionId: 'process1',
          versions: [
            { bpmn: 'BPMN1', deploymentDate: 50, version: 1 },
            { bpmn: 'BPMN2', deploymentDate: 60, version: 2 },
          ],
          instances: [
            {
              processId: 'process1',
              instanceState: ['ENDED'],
              tokens: [
                { tokenId: 'token1', state: 'RUNNING' },
                { tokenId: 'token2', state: 'ENDED' },
              ],
            },
          ],
        }),
      });

      const result = await wrappedEndpointHandler({ query: { entries: 'definitionId,versions' } });
      expect(mockEndpointHandler).toHaveBeenCalled();

      expect(result).toStrictEqual({
        statusCode: 201,
        mimeType: 'application/json',
        response: stringify({
          definitionId: 'process1',
          versions: [
            { bpmn: 'BPMN1', deploymentDate: 50, version: 1 },
            { bpmn: 'BPMN2', deploymentDate: 60, version: 2 },
          ],
        }),
      });
    });
  });
});
