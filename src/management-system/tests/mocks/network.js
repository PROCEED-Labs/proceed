export default (jest) => {
  const sendRequest = jest.fn();

  const sendData = jest.fn();

  jest.doMock('@proceed/system', () => ({
    network: {
      sendRequest,
      sendData,
    },
  }));

  return { sendRequest, sendData };
};
