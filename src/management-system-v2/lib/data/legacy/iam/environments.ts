import { v4 } from 'uuid';
import store from '../store.js';
import { roleMigrations } from './migrations/role-migrations.js';
import { mergeIntoObject } from '../../../helpers/javascriptHelpers';
import { roleMappingsMetaObjects } from './role-mappings.js';
import { ApiData, ApiRequestBody } from '@/lib/fetch-data';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { z } from 'zod';
import { env } from 'process';

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

const environmentSchema = z.union([OrganizationEnvironmentSchema, PersonalEnvironmentSchema]);

type EnvironmentInput = z.infer<typeof environmentSchema>;
type Environment = EnvironmentInput & { id: string };

export let environmentsMetaObject: { [Id: string]: Environment } =
  // @ts-ignore
  global.environmentsMetaObject || (global.environmentsMetaObject = {});

export function getEnvironments(ability: Ability) {
  const environments = Object.values(environmentsMetaObject);

  //TODO: filter environments by ability
  return environments;
}

export function getEnvironmentById(id: string, ability: Ability) {
  // TODO: check ability
  return environmentsMetaObject[id];
}

export function addEnvironment(environmentInput: EnvironmentInput, ability?: Ability) {
  const environment = environmentSchema.parse(environmentInput);

  const id = environment.organization ? v4() : environment.ownerId;

  if (environmentsMetaObject[id]) throw new Error('Role id already exists');

  environmentsMetaObject[id] = { ...environment, id };
  store.add('environments', environment);

  return environment;
}

/**
 * initializes the environments meta information objects
 */
export function init() {
  if (!firstInit) return;

  const storedEnvironemnts = store.get('environments');

  // set roles store cache for quick access
  storedEnvironemnts.forEach(
    (environments) => (environmentsMetaObject[environments.id] = environments),
  );
}
init();
