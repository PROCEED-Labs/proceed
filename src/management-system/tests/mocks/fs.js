export default (jest) => {
  const readdir = jest.fn();
  const readFileSync = jest.fn();
  jest.doMock('fs', () => ({
    readdir,
    readFileSync,
  }));

  return { readdir, readFileSync };
};
