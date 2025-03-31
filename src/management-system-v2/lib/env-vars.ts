import type { ZodType } from 'zod';
import z from 'zod';
import { resources } from './ability/caslAbility';

// --------------------------------------------
// Add environment variables here
// --------------------------------------------

const environmentVariables = {
  all: {
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    ENABLE_MACHINE_CONFIG: z.string().optional(), // NOTE: Not sure if it should be optional
    PROCEED_PUBLIC_ENABLE_EXECUTION: z.string().optional(),
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
  },
  production: {
    NEXTAUTH_SECRET: z.string(),
    USE_AUTH0: z.coerce.boolean(),

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
  },
  development: {
    SHARING_ENCRYPTION_SECRET: z.string().default('T8VB/r1dw0kJAXjanUvGXpDb+VRr4dV5y59BT9TBqiQ='),
    INVITATION_ENCRYPTION_SECRET: z
      .string()
      .default('T8VB/r1dw0kJAXjanUvGXpDb+VRr4dV5y59BT9TBqiQ='),
    GUEST_REFERENCE_SECRET: z.string().default('T8VB/r1dw0kJAXjanUvGXpDb+VRr4dV5y59BT9TBqiQ='),
  },
  test: {},
} satisfies EnvironmentVariables;

// --------------------------------------------
// You shouldn't need to modify anything below
// --------------------------------------------

type EnvironmentVariables = {
  [key in 'development' | 'production' | 'test' | 'all']?: Record<string, ZodType>;
};

type Env = typeof environmentVariables;

// Get all environment variables needed
const isServer = typeof window === 'undefined';
const mode = (process.env.NODE_ENV ?? 'development') as 'development' | 'production' | 'test';
const schemaOptions = {
  ...environmentVariables.all,
  ...((environmentVariables as EnvironmentVariables)[mode] ?? {}),
} as Partial<Record<string, ZodType>>;

// Get values from env
const runtimeEnvVariables: Record<string, any> = {};
for (const variable of Object.keys(schemaOptions))
  runtimeEnvVariables[variable] = process.env[variable];

// Parse environment variables
type MergedValues = Env['all'] & Env['production'] & Env['test'] & Env['development'];

const parsingResult = z.object(schemaOptions as MergedValues).safeParse(runtimeEnvVariables);
const onBuild = process.env.NEXT_PHASE === 'phase-production-build';

if (!parsingResult.success && !onBuild) {
  let msg = '';
  for (const [variable, error] of Object.entries(parsingResult.error.flatten().fieldErrors))
    msg += `${variable}: ${JSON.stringify(error)}\n`;

  console.error(`❌ Error parsing environment variables\n${msg}`);
  process.exit(1);
}

export const env: Extract<typeof parsingResult, { success: true }>['data'] = parsingResult.success
  ? parsingResult.data
  : ({} as any);

export const publicEnv: PublicEnv = Object.fromEntries(
  Object.entries(env).filter(([key]) => key.startsWith('PROCEED_PUBLIC_')),
);

export type PrivateEnv = typeof env;

export type PublicEnv = {
  [K in keyof PrivateEnv as K extends `PROCEED_PUBLIC_${string}` ? K : never]: PrivateEnv[K];
};
