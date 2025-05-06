import z, { type ZodType } from 'zod';
import { resources } from '@/lib/ability/caslAbility';

// --------------------------------------------
// Add MS Configs here
// --------------------------------------------

// NOTE: order of default and optional matter, it's best not to mix them
// default.optional -> input: undefined = output: undefined
// optional.default -> input: undefined = output: default value

export const mSConfigEnvironmentOnlyKeys = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'SHARING_ENCRYPTION_SECRET',
  'DATABASE_URL',
  'NODE_ENV',
  'MS_ENABLED_RESOURCES',
  'MQTT_SERVER_ADDRESS',
  'MQTT_USERNAME',
  'MQTT_PASSWORD',
  'MQTT_BASETOPIC',
  'NODE_ENV',

  'AUTH0_CLIENT_ID',
  'AUTH0_CLIENT_SECRET',
  'AUTH0_ISSUER',
  'AUTH0_SCOPE',

  // TODO: remove this from environment only list
  'GOOGLE_CLOUD_BUCKET_NAME',

  // Variables that aren't implemented yet
  // 'PROCEED_PUBLIC_IAM_PERSONAL_SPACES_ACTIVE',
  // 'PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE',
  // 'PROCEED_PUBLIC_IAM_LOGIN_OAUTH_GOOGLE_ACTIVE',
  // 'PROCEED_PUBLIC_IAM_LOGIN_OAUTH_X_ACTIVE',
  // 'PROCEED_PUBLIC_IAM_LOGIN_OAUTH_DISCORD_ACTIVE',
  // 'PRISMA_???',

  // Variables that still need to be renamed
  // 'PROCEED_PUBLIC_IAM_ACTIVE',
  'PROCEED_PUBLIC_IAM_ACTIVATE',

  // 'IAM_ORG_USER_INVITATION_ENCRYPTION_SECRET',
  'INVITATION_ENCRYPTION_SECRET',

  // 'IAM_GUEST_CONVERSION_REFERENCE_SECRET',
  'GUEST_REFERENCE_SECRET',

  // 'IAM_LOGIN_OAUTH_GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_ID',

  // 'IAM_LOGIN_OAUTH_GOOGLE_CLIENT_SECRET',
  'GOOGLE_CLIENT_SECRET',

  // 'IAM_LOGIN_OAUTH_X_CLIENT_ID',
  'TWITTER_CLIENT_ID',

  // 'IAM_LOGIN_OAUTH_X_CLIENT_SECRET',
  'TWITTER_CLIENT_SECRET',

  // 'IAM_LOGIN_OAUTH_DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_ID',

  // 'IAM_LOGIN_OAUTH_DISCORD_CLIENT_SECRET',
  'DISCORD_CLIENT_SECRET',

  // 'PROCEED_PUBLIC_STORAGE_DEPLOYMENT_ENV',
  'PROCEED_PUBLIC_DEPLOYMENT_ENV',
] satisfies (keyof MergedSchemas)[];

export const msConfigSchema = {
  all: {
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    PROCEED_PUBLIC_ENABLE_EXECUTION: z.string().optional().transform(boolParser),
    PROCEED_PUBLIC_DEPLOYMENT_ENV: z.enum(['cloud', 'local']).optional(),
    NEXTAUTH_URL: z.string().default('http://localhost:3000'),
    SHARING_ENCRYPTION_SECRET: z.string(),
    INVITATION_ENCRYPTION_SECRET: z.string(),
    MS_ENABLED_RESOURCES: z
      .string()
      .transform((str, ctx) => {
        try {
          const json = JSON.parse(str);
          z.array(z.enum(resources)).parse(json);
          return str;
        } catch (e) {
          ctx.addIssue({ code: 'custom', message: 'Invalid JSON' });
          return z.NEVER;
        }
      })
      .optional(),

    MQTT_SERVER_ADDRESS: z.string().url().optional(),
    MQTT_USERNAME: z.string().optional(),
    MQTT_PASSWORD: z.string().optional(),
    MQTT_BASETOPIC: z.string().optional(),

    PROCEED_PUBLIC_IAM_ACTIVATE: z.string().transform(boolParser).optional(),
  },
  production: {
    NEXTAUTH_SECRET: z.string(),
    USE_AUTH0: z.string().transform(boolParser),

    SMTP_MAIL_USER: z.string(),
    SMTP_MAIL_PORT: z.coerce.number(),
    SMTP_MAIL_HOST: z.string(),
    SMTP_MAIL_PASSWORD: z.string(),

    AUTH0_CLIENT_ID: z.string(),
    AUTH0_CLIENT_SECRET: z.string(),
    AUTH0_ISSUER: z.string(),
    AUTH0_SCOPE: z.string(),

    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),

    DISCORD_CLIENT_ID: z.string(),
    DISCORD_CLIENT_SECRET: z.string(),

    TWITTER_CLIENT_ID: z.string(),
    TWITTER_CLIENT_SECRET: z.string(),

    SHARING_ENCRYPTION_SECRET: z.string(),

    GUEST_REFERENCE_SECRET: z.string(),

    //Note: needed for cloud deployment with gcp bucket
    GOOGLE_CLOUD_BUCKET_NAME: z.string().optional(),
    PROCEED_GCP_BUCKET_KEY_PATH: z.string().optional(),

    DATABASE_URL: z.string(),
  },
  development: {
    SHARING_ENCRYPTION_SECRET: z.string().default('T8VB/r1dw0kJAXjanUvGXpDb+VRr4dV5y59BT9TBqiQ='),
    INVITATION_ENCRYPTION_SECRET: z
      .string()
      .default('T8VB/r1dw0kJAXjanUvGXpDb+VRr4dV5y59BT9TBqiQ='),
    GUEST_REFERENCE_SECRET: z.string().default('T8VB/r1dw0kJAXjanUvGXpDb+VRr4dV5y59BT9TBqiQ='),
    DATABASE_URL: z.string({
      required_error: 'DATABASE_URL not in environment variables, try running `yarn dev-ms-db`',
    }),
  },
  test: {},
} satisfies {
  [key in 'development' | 'production' | 'test' | 'all']?: Record<string, ZodType>;
};

// --------------------------------------------
// You shouldn't need to modify anything below
// --------------------------------------------

type _Schema = typeof msConfigSchema;
type MergedSchemas = _Schema['all'] &
  _Schema['production'] &
  _Schema['test'] &
  _Schema['development'];

// Get all environment variables needed
const mode = (process.env.NODE_ENV ?? 'development') as 'development' | 'production' | 'test';
export const mergedMSConfigSchemaKeys = {
  ...msConfigSchema.all,
  ...(msConfigSchema[mode] ?? {}),
} as MergedSchemas;
export const environmentSpecificMSConfigSchema = z.object(mergedMSConfigSchemaKeys);

export const msConfigConfigurableKeys = Object.keys(mergedMSConfigSchemaKeys).filter(
  (key) => !mSConfigEnvironmentOnlyKeys.includes(key as any),
) as (keyof ConfigurableMSConfig)[];

export type PrivateMSConfig = z.infer<typeof environmentSpecificMSConfigSchema>;
export type PublicMSConfig = {
  [K in keyof PrivateMSConfig as K extends `PROCEED_PUBLIC_${string}`
    ? K
    : never]: PrivateMSConfig[K];
};

export type EnvironmentOnlyMSConfig = Pick<
  PrivateMSConfig,
  (typeof mSConfigEnvironmentOnlyKeys)[number]
>;
export const environmentOnlyMSConfigSchemaKeys: Record<string, ZodType> = {};
for (const _key of Object.keys(mergedMSConfigSchemaKeys)) {
  const key = _key as keyof typeof mergedMSConfigSchemaKeys;
  if (mSConfigEnvironmentOnlyKeys.includes(key as any)) {
    environmentOnlyMSConfigSchemaKeys[key] = mergedMSConfigSchemaKeys[key];
  } else {
    environmentOnlyMSConfigSchemaKeys[key] = mergedMSConfigSchemaKeys[key].optional();
  }
}

export type ConfigurableMSConfig = Omit<
  PrivateMSConfig,
  (typeof mSConfigEnvironmentOnlyKeys)[number]
>;
export const configurableMSConfigSchemaKeys: Record<string, ZodType> = {};
for (const _key of Object.keys(mergedMSConfigSchemaKeys)) {
  const key = _key as keyof typeof mergedMSConfigSchemaKeys;
  if (!mSConfigEnvironmentOnlyKeys.includes(key as any))
    configurableMSConfigSchemaKeys[key] = mergedMSConfigSchemaKeys[key];
}

// Utils

function boolParser(value?: string, ctx?: z.RefinementCtx) {
  const lowerValue = value?.toLowerCase();
  if (lowerValue === 'true' || value === '1') return true;
  if (lowerValue === 'false' || value === '0') return false;

  if (value === undefined) return undefined;

  ctx?.addIssue({ code: 'custom', message: 'Value has to be either "FALSE" or "TRUE"' });
  return z.NEVER;
}

function getDefaults<Schema extends Partial<Record<string, z.ZodType<any>>>>(schema: Schema) {
  return Object.fromEntries(
    Object.entries(schema).map(([key, value]) => {
      if (value instanceof z.ZodDefault) return [key, value._def.defaultValue()];
      return [key, undefined];
    }),
  );
}

export function getDefaultMSConfigValues<Env extends keyof typeof msConfigSchema>(env: Env) {
  const defaults = getDefaults({
    ...msConfigSchema.all,
    ...msConfigSchema[env],
  });
  return defaults;
}
