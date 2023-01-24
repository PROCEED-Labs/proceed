export const ipcRenderer = {
  on: jest.fn(),
};

export const remote = {
  app: {
    getPath: () => 'test/path',
  },
};
