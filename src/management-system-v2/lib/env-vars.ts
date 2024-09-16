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
    NEXT_PUBLIC_ENABLE_EXECUTION: z.string().optional(),
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
  },
  development: {
    SHARING_ENCRYPTION_SECRET: z.string().default('T8VB/r1dw0kJAXjanUvGXpDb+VRr4dV5y59BT9TBqiQ='),
    INVITATION_ENCRYPTION_SECRET: z
      .string()
      .default('T8VB/r1dw0kJAXjanUvGXpDb+VRr4dV5y59BT9TBqiQ='),
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

// Remove server-only environment variables on client
if (!isServer) {
  for (const key of Object.keys(schemaOptions))
    if (!key.startsWith('NEXT_PUBLIC_')) delete schemaOptions[key];
}

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

const data = parsingResult.success ? parsingResult.data : {};

export const env = new Proxy(data as Extract<typeof parsingResult, { success: true }>['data'], {
  get(target, prop) {
    if (typeof prop !== 'string') return undefined;
    if (!isServer && !(prop in schemaOptions) && !prop.startsWith('NEXT_PUBLIC_'))
      throw new Error('Attempted to access a server-side environment variable on the client');

    return Reflect.get(target, prop);
  },
});
