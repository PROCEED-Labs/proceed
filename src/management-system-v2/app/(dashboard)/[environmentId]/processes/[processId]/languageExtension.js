export default `
declare class Variable {
  /**
   * Allows setting values for instance variables
   **/
  set(varName: string, value: any): void
  /**
   * Returns value of an instance variable
   **/
  get(varName: string): any
  /**
   * Returns all instance variables and their values
   **/
  getAll(): object
}
declare var variable: Variable

declare class Log {
  trace(message?: any): void
  debug(message?: any): void
  info(message?: any): void
  warn(message?: any): void
  error(message?: any): void
}
declare var log: Log


declare class Console {
  log(message?: any): void
  trace(message?: any): void
  debug(message?: any): void
  info(message?: any): void
  warn(message?: any): void
  error(message?: any): void
  time(label): void
  timeEnd(label):void
}
declare var console: Console


/**
 * Set the progress of the script task, expected to be between 1 and 100
 **/
declare function setProgress(progress: number): void


/**
 * Set timeout for callback function with given timeout in milliseconds
 **/
declare function setTimeoutAsync(callback: function, timeout: number): Promise


/**
 * Set interval for callback function with given timeout in milliseconds
 **/
declare function setIntervalAsync(callback: function, timeout: number): Promise



declare class CapabilityService {
  /**
   * Calls the capability function
   **/
  startCapability(capabilityName: string, parameters: object): Promise
  /**
   * Calls the capability function
   **/
  startCapability(capabilityName: string, parameters: object, callback: function): void
}

declare class NetworkService{
  /**
   * Send GET-Request to given address
   **/
  get(address: {ip: string, port: number, endpoint: string}): Promise
  /**
   * Send POST-Request to given address
   **/
  post(address: {ip: string, port: number, endpoint: string}, type, data): Promise
  /**
   * Send PUT-Request to given address
   **/
  put(address: {ip: string, port: number, endpoint: string}, type, data): Promise
  /**
   * Send DELETE-Request to given address
   **/
  delete(address: {ip: string, port: number, endpoint: string}): Promise
  /**
   * Send HEAD-Request to given address
   **/
  head(address: {ip: string, port: number, endpoint: string}): Promise
}

type service = "capabilities" | "network"

declare function getService(serviceName: "network") : NetworkService
declare function getService(serviceName: "capabilities"): CapabilityService
declare function getService(serviceName: string): NetworkService | CapabilityService

declare class BpmnError extends Error {
  constructor(reference: string, explanation: string);
}

declare class BpmnEscalation {
  constructor(reference: string, explanation: string);
}
`;
