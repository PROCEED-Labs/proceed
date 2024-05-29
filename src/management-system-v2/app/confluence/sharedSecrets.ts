let sharedSecrets: { [key: string]: { sharedSecret: any; baseUrl: any } }; // Variable zum Speichern der sharedSecrets

export const setSharedSecret = (clientKey: string, sharedSecret: any, baseUrl: any) => {
  sharedSecrets[clientKey] = { sharedSecret, baseUrl };
};

export const getSharedSecret = (clientKey: string) => {
  return sharedSecrets[clientKey];
};
