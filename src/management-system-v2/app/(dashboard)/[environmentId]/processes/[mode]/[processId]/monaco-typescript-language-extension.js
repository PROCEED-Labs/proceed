export default `
class Variable {
  /**
   * Allows setting values for instance variables
   **/
  set(varName: string, value: any): void;

  /**
   * Returns value of an instance variable
   **/
  get(varName: string): any;

  /**
   * Returns all instance variables and their values
   **/
  getAll(): object;

  // TODO: jsdoc for these
  getWithLogs(): any;

  getGlobal(name: string): any;

  getAllGlobal(): any;

  getWithLogsGlobal(): any;

  setGlobal(name: string, value: any);
}
declare var variable: Variable;

declare class Log {
  trace(message?: any): void;
  debug(message?: any): void;
  info(message?: any): void;
  warn(message?: any): void;
  error(message?: any): void;
}
declare var log: Log;

declare class Console {
  log(message?: any): void;
  trace(message?: any): void;
  debug(message?: any): void;
  info(message?: any): void;
  warn(message?: any): void;
  error(message?: any): void;
  time(label: any): void;
  timeEnd(label: any): void;
}
declare var console: Console;

/**
 * Set the progress of the script task, expected to be between 1 and 100
 **/
// declare function setProgress(progress: number): void;

/**
 * Set timeout for callback function with given timeout in milliseconds
 **/
declare function setTimeout(callback: () => any, timeout: number): number;

/**
 * Cancel a timeout
 **/
declare function clearTimeout(timeoutId: number): boolean;

/**
 * Set interval for callback function with given timeout in milliseconds
 **/
declare function setInterval(callback: () => any, timeout: number): number;

/**
 * Cancel an interval
 **/
declare function clearInterval(intervalId): boolean;

declare class CapabilityService {
  /**
   * Calls the capability function
   **/
  startCapability(capabilityName: string, parameters: object): Promise<any>;
  /**
   * Calls the capability function
   **/
  startCapability(capabilityName: string, parameters: object, callback: () => any): void;
}

// On the engine side the http|https module is being used
type RequestOptions = Partial<{
  /**
   * An object of strings containing additional request headers.
   **/
  headers: Record<string, string>;
  /**
   * Specifies whether or not to automatically add the Host header. Defaults to true.
   **/
  setHost: boolean;
  /**
   * If true, tls.TLSSocket.enableTrace() will be called on new connections. Tracing can be enabled after the secure connection is established, but this option must be used to trace the secure connection setup. Default: false.
   **/
  enableTrace: boolean;
  /**
   *  Optionally override the trusted CA certificates. If not specified, the CA certificates trusted by default are the same as the ones returned by tls.getCACertificates() using the default type. If specified, the default list would be completely replaced (instead of being concatenated) by the certificates in the ca option. Users need to concatenate manually if they wish to add additional certificates instead of completely overriding the default. The value can be a string or Buffer, or an Array of strings and/or Buffers. Any string or Buffer can contain multiple PEM CAs concatenated together. The peer's certificate must be chainable to a CA trusted by the server for the connection to be authenticated. When using certificates that are not chainable to a well-known CA, the certificate's CA must be explicitly specified as a trusted or the connection will fail to authenticate. If the peer uses a certificate that doesn't match or chain to one of the default CAs, use the ca option to provide a CA certificate that the peer's certificate can match or chain to. For self-signed certificates, the certificate is its own CA, and must be provided. For PEM encoded certificates, supported types are "TRUSTED CERTIFICATE", "X509 CERTIFICATE", and "CERTIFICATE".
   **/
  ca: string | Buffer | Array<string | Buffer>;
  /**
   * Cert chains in PEM format. One cert chain should be provided per private key. Each cert chain should consist of the PEM formatted certificate for a provided private key, followed by the PEM formatted intermediate certificates (if any), in order, and not including the root CA (the root CA must be pre-known to the peer, see ca). When providing multiple cert chains, they do not have to be in the same order as their private keys in key. If the intermediate certificates are not provided, the peer will not be able to validate the certificate, and the handshake will fail.
   **/
  cert: string | Buffer | Array<string | Buffer>;
  /**
   *  Cipher suite specification, replacing the default. For more information, see Node.js: https://nodejs.org/api/tls.html#modifying-the-default-tls-cipher-suite. Permitted ciphers can be obtained via tls.getCiphers(). Cipher names must be uppercased in order for OpenSSL to accept them.
   **/
  ciphers: string;
  /**
   *  PEM formatted CRLs (Certificate Revocation Lists).
   **/
  crl: string | Buffer | Array<string | Buffer>;
  /**
   *  'auto' or custom Diffie-Hellman parameters, required for non-ECDHE perfect forward secrecy. If omitted or invalid, the parameters are silently discarded and DHE ciphers will not be available. ECDHE-based perfect forward secrecy will still be available.
   **/
  dhparam: string | Buffer;
  /**
   * A string describing a named curve or a colon separated list of curve NIDs or names, for example P-521:P-384:P-256, to use for ECDH key agreement. Set to auto to select the curve automatically. Use crypto.getCurves() to obtain a list of available curve names. On recent releases, openssl ecparam -list_curves will also display the name and description of each available elliptic curve. Default: tls.DEFAULT_ECDH_CURVE.
   **/
  ecdhCurve: string;
  /**
   *  Attempt to use the server's cipher suite preferences instead of the client's. When true, causes SSL_OP_CIPHER_SERVER_PREFERENCE to be set in secureOptions, see OpenSSL Options for more information.
   **/
  honorCipherOrder: boolean;
  /**
   * Private keys in PEM format. PEM allows the option of private keys being encrypted. Encrypted keys will be decrypted with options.passphrase. Multiple keys using different algorithms can be provided either as an array of unencrypted key strings or buffers, or an array of objects in the form {pem: <string|buffer>[, passphrase: <string>]}. The object form can only occur in an array. object.passphrase is optional. Encrypted keys will be decrypted with object.passphrase if provided, or options.passphrase if it is not.
   **/
  key: string | Buffer | Array<string | Buffer | object>;
  /**
   * Shared passphrase used for a single private key and/or a PFX.
   **/
  passphrase: string;
  /**
   * PFX or PKCS12 encoded private key and certificate chain. pfx is an alternative to providing key and cert individually. PFX is usually encrypted, if it is, passphrase will be used to decrypt it. Multiple PFX can be provided either as an array of unencrypted PFX buffers, or an array of objects in the form {buf: <string|buffer>[, passphrase: <string>]}. The object form can only occur in an array. object.passphrase is optional. Encrypted PFX will be decrypted with object.passphrase if provided, or options.passphrase if it is not.
   **/
  pfx: string | Buffer | Array<string | Buffer | object>;
  /**
   * If not false, the server certificate is verified against the list of supplied CAs. An 'error' event is emitted if verification fails; err.code contains the OpenSSL error code. Default: true.
   **/
  rejectUnauthorized: boolean;
  /**
   *  Optionally affect the OpenSSL protocol behavior, which is not usually necessary. This should be used carefully if at all! Value is a numeric bitmask of the SSL_OP_* options from OpenSSL Options.
   **/
  secureOptions: number;
  /**
   * Legacy mechanism to select the TLS protocol version to use, it does not support independent control of the minimum and maximum version, and does not support limiting the protocol to TLSv1.3. Use minVersion and maxVersion instead. The possible values are listed as SSL_METHODS, use the function names as strings. For example, use 'TLSv1_1_method' to force TLS version 1.1, or 'TLS_method' to allow any TLS protocol version up to TLSv1.3. It is not recommended to use TLS versions less than 1.2, but it may be required for interoperability. Default: none, see minVersion.
   **/
  secureProtocol: string;
  /**
   *  Server name for the SNI (Server Name Indication) TLS extension. It is the name of the host being connected to, and must be a host name, and not an IP address. It can be used by a multi-homed server to choose the correct certificate to present to the client, see the SNICallback option to tls.createServer().
   **/
  servername: string;
  /**
   * Opaque identifier used by servers to ensure session state is not shared between applications. Unused by clients.
   **/
  sessionIdContext: string;
  /**
   * Consistent with the readable stream highWaterMark parameter. Default: 16 * 1024.
   **/
  highWaterMark: number;
}>;

declare class NetworkService {
  /**
   * Send GET-Request to given address
   **/
  get(url: string, options?: RequestOptions): any;
  /**
   * Send POST-Request to given address
   **/
  post(url: string, body: any, contentType?: string, options?: Omit<RequestOptions, 'body'>): any;
  /**
   * Send PUT-Request to given address
   **/
  put(url: string, body: any, contentType?: string, options?: Omit<RequestOptions, 'body'>): any;
  /**
   * Send DELETE-Request to given address
   **/
  delete(url: string, options?: RequestOptions): any;
  /**
   * Send HEAD-Request to given address
   **/
  head(url: string, options?: RequestOptions): any;
  /**
   * Send GET-Request to given address
   **/
  getAsync(url: string, options?: RequestOptions): Promise<any>;
  /**
   * Send POST-Request to given address
   **/
  postAsync(
    url: string,
    body: any,
    contentType?: string,
    options?: Omit<RequestOptions, 'body'>,
  ): Promise<any>;
  /**
   * Send PUT-Request to given address
   **/
  putAsync(
    url: string,
    body: any,
    contentType?: string,
    options?: Omit<RequestOptions, 'body'>,
  ): Promise<any>;
  /**
   * Send DELETE-Request to given address
   **/
  deleteAsync(url: string, options?: RequestOptions): Promise<any>;
  /**
   * Send HEAD-Request to given address
   **/
  headAsync(url: string, options?: RequestOptions): Promise<any>;
}

type _Request = {
  hostname: string;
  ip: string;
  method: string;
  params: Record<string, string>;
  query: Record<string, string>;
  path: string;
  body?: any;
  headers: Record<string, string>;
  // files?: { name: string; data: any };
};

class _Response {
  status(code: number): _Response;
  send(body: any): void;
}

declare class NetworkServer {
  /** Open a one-off POST route listener */
  post(path: string): { req: _Request; res: _Response };

  /** Open a one-off PUT route listener */
  put(path: string): { req: _Request; res: _Response };

  /** Open a one-off DELETE route listener */
  delete(path: string): { req: _Request; res: _Response };

  /** Open a one-off GET route listener */
  get(path: string): { req: _Request; res: _Response };

  /** Open a one-off POST route listener */
  postAsync(path: string): Promise<{ req: _Request; res: _Response }>;

  /** Open a one-off PUT route listener */
  putAsync(path: string): Promise<{ req: _Request; res: _Response }>;

  /** Open a one-off DELETE route listener */
  deleteAsync(path: string): Promise<{ req: _Request; res: _Response }>;

  /** Open a one-off GET route listener */
  getAsync(path: string): Promise<{ req: _Request; res: _Response }>;

  /** Open a POST route listener */
  post(path: string, callback: ({ req: _Request, res: _Response }) => void): void;

  /** Open a PUT route listener */
  put(path: string, callback: ({ req: _Request, res: _Response }) => void): void;

  /** Open a DELETE route listener */
  delete(path: string, callback: ({ req: _Request, res: _Response }) => void): void;

  /** Open a GET route listener */
  get(path: string, callback: ({ req: _Request, res: _Response }) => void): void;

  /**
   * Close the network server. This is necessary for the task script to stop, after a route handler
   * with callback was registered.
   *
   * @warning This function can only be called, when there are no pending one-off routes.
   */
  close(): void;
}

declare var networkRequest: NetworkService;
declare var networkServer: NetworkServer;

declare function getService(serviceName: 'capabilities'): CapabilityService;

declare class BpmnError extends Error {
  constructor(reference: string, explanation: string);
}

declare class BpmnEscalation {
  constructor(reference: string, explanation: string);
}

/** Stops the program execution for the given amount of milliseconds */
declare function wait(ms: number): void;

/** Returns a promise that is resolved after the given amount of milliseconds */
declare function waitAsync(ms: number): Promise<void>;
`;
