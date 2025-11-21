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
  auth: string | null;
  headers: Record<string, string>;
  body: any;
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

declare function getService(serviceName: 'network-requests'): NetworkService;
declare function getService(serviceName: 'capabilities'): CapabilityService;
declare function getService(serviceName: 'network-server'): NetworkServer;

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
