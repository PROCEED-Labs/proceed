import { v4 } from 'uuid';
import store from '../store.js';
import Ability from '@/lib/ability/abilityHelper';
import { z } from 'zod';

// @ts-ignore
let firstInit = !global.environmentMetaObject;

const OrganizationEnvironmentSchema = z.object({
  ownerId: z.string().readonly(),
  name: z.string(),
  description: z.string(),
  logoUrl: z.string(),
  organization: z.literal(true).readonly(),
});

const PersonalEnvironmentSchema = z.object({
  ownerId: z.string().readonly(),
  organization: z.literal(false).readonly(),
});

export const environmentSchema = z.union([
  OrganizationEnvironmentSchema,
  PersonalEnvironmentSchema,
]);

export type EnvironmentInput = z.infer<typeof environmentSchema>;
export type Environment = EnvironmentInput & { id: string };

export let environmentsMetaObject: { [Id: string]: Environment } =
  // @ts-ignore
  global.environmentsMetaObject || (global.environmentsMetaObject = {});

export function getEnvironments(ability: Ability) {
  const environments = Object.values(environmentsMetaObject);

  //TODO: filter environments by ability
  return environments;
}

export function getEnvironmentById(
  id: string,
  ability?: Ability,
  opts?: { throwOnNotFound?: boolean },
) {
  // TODO: check ability
  const environment = environmentsMetaObject[id];

  if (!environment && opts && opts.throwOnNotFound) throw new Error('Environment not found');

  return environment;
}

export function addEnvironment(environmentInput: EnvironmentInput, ability?: Ability) {
  const environment = environmentSchema.parse(environmentInput);

  const id = environment.organization ? v4() : environment.ownerId;

  if (environmentsMetaObject[id]) throw new Error('Role id already exists');

  const newEnvironment = { ...environment, id };
  environmentsMetaObject[id] = newEnvironment;
  store.add('environments', newEnvironment);

  return newEnvironment;
}

/**
 * initializes the environments meta information objects
 */
export function init() {
  if (!firstInit) return;

  const storedEnvironemnts = store.get('environments') as any[];

  // set roles store cache for quick access
  storedEnvironemnts.forEach(
    (environments) => (environmentsMetaObject[environments.id] = environments),
  );
}
init();
