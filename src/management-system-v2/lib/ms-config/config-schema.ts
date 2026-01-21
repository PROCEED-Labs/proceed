import z, { type ZodType } from 'zod';

// --------------------------------------------
// Add MS Configs here
// --------------------------------------------

export const mSConfigEnvironmentOnlyKeys = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'IAM_ORG_USER_INVITATION_ENCRYPTION_SECRET',
  'IAM_GUEST_CONVERSION_REFERENCE_SECRET',
  'SHARING_ENCRYPTION_SECRET',

  'DATABASE_URL',
  'NODE_ENV',
  'IAM_MS_ADMIN_INITIAL_PASSWORD',

  'PROCEED_PUBLIC_MAILSERVER_ACTIVE',

  'PROCEED_PUBLIC_IAM_ACTIVE',
  'PROCEED_PUBLIC_IAM_LOGIN_MAIL_ACTIVE',
  'PROCEED_PUBLIC_IAM_LOGIN_USER_PASSWORD_ACTIVE',
  'PROCEED_PUBLIC_IAM_PERSONAL_SPACES_ACTIVE',
  'PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE',

  'PROCEED_PUBLIC_IAM_LOGIN_OAUTH_GOOGLE_ACTIVE',
  'PROCEED_PUBLIC_IAM_LOGIN_OAUTH_X_ACTIVE',
  'PROCEED_PUBLIC_IAM_LOGIN_OAUTH_DISCORD_ACTIVE',

  'IAM_LOGIN_OAUTH_GOOGLE_CLIENT_ID',
  'IAM_LOGIN_OAUTH_GOOGLE_CLIENT_SECRET',

  'IAM_LOGIN_OAUTH_X_CLIENT_ID',
  'IAM_LOGIN_OAUTH_X_CLIENT_SECRET',

  'IAM_LOGIN_OAUTH_DISCORD_CLIENT_ID',
  'IAM_LOGIN_OAUTH_DISCORD_CLIENT_SECRET',

  'PROCEED_PUBLIC_STORAGE_DEPLOYMENT_ENV',
  'STORAGE_CLOUD_BUCKET_NAME',

  // Variables that aren't implemented yet
  // 'PRISMA_???',
] satisfies (keyof MergedSchemas)[];

// NOTE: order of default and optional matter, it's best not to mix them
// default.optional -> input: undefined = output: undefined
// optional.default -> input: undefined = output: default value
export const msConfigSchema = {
  all: {
    PROCEED_PUBLIC_GENERAL_MS_LOGO: z.string().default(''),

    PROCEED_PUBLIC_PROCESS_DOCUMENTATION_ACTIVE: z.string().default('TRUE').transform(boolParser),
    PROCEED_PUBLIC_GANTT_ACTIVE: z
      .string()
      .default('FALSE')
      .transform(boolParser)
      .refine((val) => !val || process.env.PROCEED_PUBLIC_PROCESS_DOCUMENTATION_ACTIVE, {
        message:
          'PROCEED_PUBLIC_PROCESS_DOCUMENTATION_ACTIVE needs to be set to true to use PROCEED_PUBLIC_GANTT_ACTIVE',
      }),
    PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE: z.string().default('FALSE').transform(boolParser),
    PROCEED_PUBLIC_PROCESS_AUTOMATION_TASK_EDITOR_ACTIVE: z
      .string()
      .default('FALSE')
      .transform(boolParser)
      .refine((val) => !val || process.env.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE, {
        message:
          'PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE needs to be set to true to use PROCEED_PUBLIC_PROCESS_AUTOMATION_TASK_EDITOR_ACTIVE',
      }),
    PROCEED_PUBLIC_CONFIG_SERVER_ACTIVE: z.string().default('FALSE').transform(boolParser),

    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    NEXTAUTH_URL: z
      .string()
      .default('')
      .refine((url) => {
        if (url !== '') {
          return true;
        }
        if (boolParser(process.env.PROCEED_PUBLIC_IAM_ACTIVE)) {
          return false;
        }
      }),
    NEXTAUTH_URL_INTERNAL: z.string().default(''),
    NEXTAUTH_SECRET: z.string().default(''),

    IAM_ORG_USER_INVITATION_ENCRYPTION_SECRET: z.string().default(''),
    SHARING_ENCRYPTION_SECRET: z.string().default(''),
    IAM_GUEST_CONVERSION_REFERENCE_SECRET: z.string().default(''),

    PROCEED_PUBLIC_STORAGE_DEPLOYMENT_ENV: z
      .enum(['cloud', 'local'])
      .default('local')
      .refine((value) => {
        if (value === 'local') return true;
        return !!process.env.STORAGE_CLOUD_BUCKET_NAME;
      }, 'To use PROCEED_PUBLIC_STORAGE_DEPLOYMENT_ENV, you need to set STORAGE_CLOUD_BUCKET_NAME'),
    STORAGE_CLOUD_BUCKET_NAME: z.string().default(''),
    STORAGE_CLOUD_BUCKET_CREDENTIALS_FILE_PATH: z.string().default(''),

    MAILSERVER_URL: z.string().default(''),
    MAILSERVER_PORT: z.coerce.number().default(465),
    MAILSERVER_MS_DEFAULT_MAIL_ADDRESS: z.string().default(''),
    MAILSERVER_MS_DEFAULT_MAIL_PASSWORD: z.string().default(''),

    PROCEED_PUBLIC_IAM_ACTIVE: z
      .string()
      .default('FALSE')
      .transform(boolParser)
      .refine((value) => {
        if (!value) return true;
        return (
          boolParser(process.env.PROCEED_PUBLIC_IAM_LOGIN_MAIL_ACTIVE) ||
          boolParser(process.env.PROCEED_PUBLIC_IAM_LOGIN_USER_PASSWORD_ACTIVE)
        );
      }, 'You enabled IAM without enabling a login method, please enable at least one of the following two: PROCEED_PUBLIC_IAM_LOGIN_MAIL_ACTIVE or PROCEED_PUBLIC_IAM_LOGIN_USER_PASSWORD_ACTIVE'),
    IAM_MS_ADMIN_INITIAL_PASSWORD: z.string().default('proceed'),
    PROCEED_PUBLIC_IAM_LOGIN_MAIL_ACTIVE: z.string().default('FALSE').transform(boolParser),
    PROCEED_PUBLIC_IAM_LOGIN_USER_PASSWORD_ACTIVE: z.string().default('TRUE').transform(boolParser),
    PROCEED_PUBLIC_IAM_PERSONAL_SPACES_ACTIVE: z.string().default('TRUE').transform(boolParser),
    PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE: z
      .string()
      .default('FALSE')
      .transform(boolParser),

    PROCEED_PUBLIC_IAM_LOGIN_OAUTH_GOOGLE_ACTIVE: z
      .string()
      .default('FALSE')
      .transform(boolParser)
      .refine(
        (value) => !value || boolParser(process.env.PROCEED_PUBLIC_IAM_ACTIVE),
        'To use PROCEED_PUBLIC_IAM_LOGIN_OAUTH_GOOGLE_ACTIVE you need to set PROCEED_PUBLIC_IAM_ACTIVE to true',
      ),
    IAM_LOGIN_OAUTH_GOOGLE_CLIENT_ID: z.string().default(''),
    IAM_LOGIN_OAUTH_GOOGLE_CLIENT_SECRET: z.string().default(''),

    PROCEED_PUBLIC_IAM_LOGIN_OAUTH_X_ACTIVE: z
      .string()
      .default('FALSE')
      .transform(boolParser)
      .refine(
        (value) => !value || boolParser(process.env.PROCEED_PUBLIC_IAM_ACTIVE),
        'To use PROCEED_PUBLIC_IAM_LOGIN_OAUTH_X_ACTIVE you need to set PROCEED_PUBLIC_IAM_ACTIVE to true',
      ),
    IAM_LOGIN_OAUTH_X_CLIENT_ID: z.string().default(''),
    IAM_LOGIN_OAUTH_X_CLIENT_SECRET: z.string().default(''),

    PROCEED_PUBLIC_IAM_LOGIN_OAUTH_DISCORD_ACTIVE: z
      .string()
      .default('FALSE')
      .transform(boolParser)
      .refine(
        (value) => !value || boolParser(process.env.PROCEED_PUBLIC_IAM_ACTIVE),
        'To use PROCEED_PUBLIC_IAM_LOGIN_OAUTH_DISCORD_ACTIVE you need to set PROCEED_PUBLIC_IAM_ACTIVE to true',
      ),
    IAM_LOGIN_OAUTH_DISCORD_CLIENT_ID: z.string().default(''),
    IAM_LOGIN_OAUTH_DISCORD_CLIENT_SECRET: z.string().default(''),

    SCHEDULER_INTERVAL: z.string().default('0 3 * * *'),
    SCHEDULER_TOKEN: z.string().optional(),
    SCHEDULER_JOB_DELETE_INACTIVE_GUESTS: z.coerce.number().default(0),
    SCHEDULER_JOB_DELETE_OLD_ARTIFACTS: z.coerce.number().default(7),
  },
  production: {
    DATABASE_URL: z.string(),
    // NOTE: not quite sure if this should be required
    SCHEDULER_TOKEN: z.string().optional(),

    PROCEED_PUBLIC_MAILSERVER_ACTIVE: z
      .string()
      .default('FALSE')
      .transform(boolParser)
      .refine(
        (value) =>
          !value ||
          (process.env.MAILSERVER_MS_DEFAULT_MAIL_ADDRESS &&
            process.env.MAILSERVER_MS_DEFAULT_MAIL_PASSWORD),
        'To use PROCEED_PUBLIC_MAILSERVER_ACTIVE you also need to at least set MAILSERVER_MS_DEFAULT_MAIL_ADDRESS and MAILSERVER_MS_DEFAULT_MAIL_PASSWORD',
      ),
  },
  development: {
    NEXTAUTH_URL: z.string().default('http://localhost:3000'),
    NEXTAUTH_SECRET: z.string().default('T8VB/r1dw0kJAXjanUvGXpDb+VRr4dV5y59BT9TBqiQ='),
    SHARING_ENCRYPTION_SECRET: z.string().default('T8VB/r1dw0kJAXjanUvGXpDb+VRr4dV5y59BT9TBqiQ='),
    IAM_ORG_USER_INVITATION_ENCRYPTION_SECRET: z
      .string()
      .default('T8VB/r1dw0kJAXjanUvGXpDb+VRr4dV5y59BT9TBqiQ='),
    IAM_GUEST_CONVERSION_REFERENCE_SECRET: z
      .string()
      .default('T8VB/r1dw0kJAXjanUvGXpDb+VRr4dV5y59BT9TBqiQ='),
    SCHEDULER_TOKEN: z.string().default('T8VB/r1dw0kJAXjanUvGXpDb+VRr4dV5y59BT9TBqiQ='),
    DATABASE_URL: z.string({
      required_error: 'DATABASE_URL not in environment variables, try running `yarn dev-ms-db`',
    }),

    // In development it's not necessary to setup a mailserver, because we just print out emails to
    // the console
    PROCEED_PUBLIC_MAILSERVER_ACTIVE: z.string().default('FALSE').transform(boolParser),
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
