import React from 'react';

type Engine = {
  name: string;
  description: string;
  hostname: string;
  id: string;
  online: boolean;
  os: {
    platform: string;
    distro: string;
    release: string;
  };
  cpu: {
    cores: number;
    physicalCores: number;
    processors: number;
    speed: string;
    currentLoad: number;
    loadLastMinute: number;
    loadLastTenMinutes: number;
    loadLastHalfHour: number;
    loadLastHour: number;
    loadLastHalfDay: number;
    loadLastDay: number;
  };
  mem: {
    total: number;
    free: number;
    used: number;
    load: number;
  };
  disk: {
    type: string;
    total: number;
    free: number;
    used: number;
  }[];
  battery: {
    hasBattery: boolean;
    percent: number;
    maxCapacity: number;
  };
  display: {
    currentResX: number;
    currentResY: number;
  }[];
  network: {
    type: string;
    ip4: string;
    netmaskv4: string;
    netmaskv6: string;
    ip6: string;
    mac: string;
  }[];
  outputs: string[];
  port: number;
  classes: any[];
  domains: any[];
  inputs: any[];
  onlineCheckingAddresses: string[];
  currentlyConnectedEnvironments: any[];
  acceptUserTasks: boolean;
  deactivateProcessExecution: boolean;
};

export default function EngineOverview({ engine }: { engine: Engine }) {
  return <>{JSON.stringify(engine)}</>;
}
