import { getCurrentEnvironment } from '@/components/auth';
import { getDbEngines } from '../data/db/engines';
import { savedEnginesToEngines } from './saved-engines-helpers';
import { asyncFilter } from '../helpers/javascriptHelpers';

type Discriminator = { spaceEngine?: undefined } | { spaceEngine: true };

export type MqttEngine = { type: 'mqtt'; id: string; brokerAddress: string } & Discriminator;
export type HttpEngine = { type: 'http'; id: string; address: string } & Discriminator;
export type Engine = MqttEngine | HttpEngine;

export type SpaceEngine = Extract<Engine, { spaceEngine: true }>;
export type ProceedEngine = Extract<Engine, { spaceEngine?: undefined }>;

export async function getCorrectTargetEngines(
  spaceId: string,
  onlyProceedEngines = false,
  validatorFunc?: (engine: Engine) => Promise<boolean>,
) {
  const { ability } = await getCurrentEnvironment(spaceId);

  let engines: Engine[] = [];
  if (onlyProceedEngines) {
    // force that only proceed engines are supposed to be used
    const proceedSavedEngines = await getDbEngines(null, undefined, 'dont-check');
    engines = await savedEnginesToEngines(proceedSavedEngines);
  } else {
    // use all available engines
    const [proceedEngines, spaceEngines] = await Promise.allSettled([
      getDbEngines(null, undefined, 'dont-check').then(savedEnginesToEngines),
      getDbEngines(spaceId, ability).then(savedEnginesToEngines),
    ]);

    if (proceedEngines.status === 'fulfilled') engines = proceedEngines.value;
    if (spaceEngines.status === 'fulfilled') engines = engines.concat(spaceEngines.value);
  }

  if (validatorFunc) engines = await asyncFilter(engines, validatorFunc);

  return engines;
}
