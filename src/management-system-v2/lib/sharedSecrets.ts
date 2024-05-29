let sharedSecrets: { [key: string]: { sharedSecret: any; baseUrl: any } } = {}; // Variable zum Speichern der sharedSecrets

export const setSharedSecret = (clientKey: any, sharedSecret: any, baseUrl: any) => {
  sharedSecrets[`${clientKey}`] = { sharedSecret, baseUrl };
};

export const getSharedSecret = (clientKey: string) => {
  return sharedSecrets[clientKey];
};

export const getAllSharedSecrets = () => {
  return { ...sharedSecrets };
};
