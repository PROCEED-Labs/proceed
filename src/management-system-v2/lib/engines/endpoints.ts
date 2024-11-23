import { Machine } from './machines';

export function generateRequestUrl(machine: Machine, endpoint: string) {
  const url = `http://${machine.ip}:${machine.port}`;
  return new URL(endpoint, url).toString();
}

export function getDeploymentFromMachine(machine: Machine, entries?: string) {
  return fetch(generateRequestUrl(machine, `/process`), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });
}

export function deployProcess(machine: Machine, bpmn: string) {
  return fetch(generateRequestUrl(machine, '/process'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bpmn }),
  });
}

export function removeDeploymentFromMachines(machine: Machine, definitionId: string) {
  return fetch(generateRequestUrl(machine, `/process/${definitionId}/`), {
    method: 'DELETE',
  });
}

export function sendUserTaskHTML(
  machine: Machine,
  definitionId: string,
  userTaskId: string,
  html: string,
) {
  return fetch(generateRequestUrl(machine, `/process/${definitionId}/user-tasks/${userTaskId}`), {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ html }),
  });
}

export function sendImage(machine: Machine, definitionId: string, fileName: string, image: Blob) {
  return fetch(
    generateRequestUrl(machine, `/resources/process/${definitionId}/images/${fileName}`),
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/png image/svg+xml image/jpeg',
      },
      body: image,
    },
  );
}
