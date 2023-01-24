/* eslint-disable max-classes-per-file */
/* eslint-disable global-require */
/* eslint-disable class-methods-use-this */
jest.mock('@proceed/system', () => {
  const network = {
    get: jest.fn(),
    post: jest.fn(),
  };
  return {
    network,
  };
});

let network;
let ui;
let DisplayItem;

describe('UI', () => {
  beforeEach(() => {
    jest.resetModules();
    ({ network } = require('@proceed/system'));
    ui = require('../ui.js');
    DisplayItem = require('../display-item.js');
  });

  it('adds a display item to the SPA (HTTP)', async () => {
    const item = new DisplayItem();
    ui.addDisplayItem(item);
    ui.init();
    const responseFn = network.get.mock.calls[0][1];
    const response = await responseFn();
    expect(response).toMatchSnapshot();
  });

  it('adds a display item to the SPA (WebView)', () => {
    // TODO: test WebView enviroment
  });

  it('calls the GET endpoint method (HTTP)', () => {
    const endpointPath = '/endpoint';
    const endpoint = jest.fn().mockResolvedValue('');
    const key = 'testitem';

    class CustomItem extends DisplayItem {
      getEndpoints() {
        return {
          [endpointPath]: endpoint,
        };
      }
    }

    // TODO: check this in browser test, we technically don't assume this is
    // done in this way over HTTP.
    const item = new CustomItem('', key);
    ui.addDisplayItem(item);
    ui.init();

    expect(network.get.mock.calls[0][0]).toBe(`/${key + endpointPath}`);
    const req = { query: {} };
    network.get.mock.calls[0][2](req);
    expect(endpoint).toHaveBeenCalledWith(req.query);
  });

  it('calls the GET and POST endpoint methods (HTTP)', () => {
    const endpointPath = '/endpoint';
    const GETendpoint = jest.fn().mockResolvedValue('');
    const POSTendpoint = jest.fn().mockResolvedValue('');
    const key = 'testitem';

    class CustomItem extends DisplayItem {
      getEndpoints() {
        return {
          [endpointPath]: { get: GETendpoint, post: POSTendpoint },
        };
      }
    }

    // TODO: check this in browser test, we technically don't assume this is
    // done in this way over HTTP.
    const item = new CustomItem('', key);
    ui.addDisplayItem(item);
    ui.init();

    expect(network.get.mock.calls[0][0]).toBe(`/${key + endpointPath}`);
    let req = { query: {} };
    network.get.mock.calls[0][2](req);
    expect(GETendpoint).toHaveBeenLastCalledWith(req.query);

    expect(network.post.mock.calls[0][0]).toBe(`/${key + endpointPath}`);
    req = { query: {}, body: {} };
    network.post.mock.calls[0][2](req);
    expect(POSTendpoint).toHaveBeenLastCalledWith(req.body, req.query);
  });

  it('throws when trying to add a display item after the init() call', () => {
    const item = new DisplayItem();
    ui.init();
    expect(() => ui.addDisplayItem(item)).toThrow();
  });

  it('throws when no display item as argument given', () => {
    expect(ui.addDisplayItem).toThrow();
  });

  it('throws when the argument is not an instance of the DisplayItem class', () => {
    expect(() => ui.addDisplayItem(true)).toThrow();
  });

  it('throws when trying to add a duplicate display item key', () => {
    const item = new DisplayItem('Test Item', 'testitem');
    ui.addDisplayItem(item);
    const item2 = new DisplayItem('Test Item 2', 'testitem');
    expect(() => ui.addDisplayItem(item2)).toThrow();
  });

  it('throws when no endpoints returned', () => {
    class CustomItem extends DisplayItem {
      getEndpoints() {
        return false;
      }
    }
    const item = new CustomItem();
    expect(() => ui.addDisplayItem(item)).toThrow();
  });
});
