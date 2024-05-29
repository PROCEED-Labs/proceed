let sharedSecrets: { [key: string]: { sharedSecret: string; baseUrl: string } }; // Variable zum Speichern der sharedSecrets

export const setSharedSecret = (clientKey: string, sharedSecret: string, baseUrl: string) => {
  sharedSecrets[clientKey] = { sharedSecret, baseUrl };
};

export const getSharedSecret = (clientKey: string) => {
  return sharedSecrets[clientKey];
};
