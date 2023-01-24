const mockSetPort = jest.fn();
const mockUnsetPort = jest.fn();
const mockGet = jest.fn();
const mockPut = jest.fn();
const mockPost = jest.fn();
const mockDelete = jest.fn();
const mockRequest = jest.fn();

// use doMock to avoid hoisting
jest.doMock('../http', () =>
  jest.fn().mockImplementation(() => ({
    setPort: mockSetPort,
    unsetPort: mockUnsetPort,
    get: mockGet,
    put: mockPut,
    post: mockPost,
    delete: mockDelete,
    request: mockRequest,
  }))
);
jest.doMock('../console', () => ({
  _getLoggingModule: () => ({
    getLogger: () => ({
      debug: jest.fn(),
      trace: jest.fn(),
    }),
  }),
}));

const HTTP = require('../http');
const Network = require('../network');

let network;
describe('test functionality in network.js', () => {
  beforeEach(() => {
    HTTP.mockClear();
    mockSetPort.mockClear();
    mockUnsetPort.mockClear();
    mockGet.mockClear();
    mockPut.mockClear();
    mockPost.mockClear();
    mockDelete.mockClear();
    mockRequest.mockClear();

    network = new Network();
  });

  test('test if a simple http (get) request is passed to the http request method', async () => {
    mockRequest.mockResolvedValue({ response: { statusCode: 200 }, body: '' });

    const expected = { response: { statusCode: 200 }, body: '' };

    const result = await network.sendRequest('192.168.1.2', 8000, '/test');

    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockRequest).toHaveBeenCalledWith('http://192.168.1.2:8000/test', {}, undefined);
    expect(result).toStrictEqual(expected);
  });

  test('test if sendRequest function rejects on http error', async () => {
    mockRequest.mockRejectedValue({ response: { statusCode: 404 }, body: '' });

    await expect(network.sendRequest('192.168.1.2', 8000, '/test')).rejects.toEqual({
      response: { statusCode: 404 },
      body: '',
    });
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockRequest).toHaveBeenCalledWith('http://192.168.1.2:8000/test', {}, undefined);
  });

  test('test if sendData calls sendRequest with correct arguments', async () => {
    const mockSendRequest = jest
      .spyOn(network, 'sendRequest')
      .mockImplementationOnce(async () => {});

    const method = 'PUT';
    const data = 'test123';
    const dataFormat = 'text/plain';

    await network.sendData('192.168.1.2', 8000, '/test', method, dataFormat, data);

    expect(mockSendRequest).toHaveBeenCalledTimes(1);
    expect(mockSendRequest).toHaveBeenCalledWith('192.168.1.2', 8000, '/test', {
      method,
      body: data,
      headers: {
        'Content-Type': dataFormat,
      },
    });
  });
});
