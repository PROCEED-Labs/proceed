import type { ZodType } from 'zod';
import z from 'zod';

// --------------------------------------------
// Add environment variables here
// --------------------------------------------

const environmentVariables = {
  all: {
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    ENABLE_MACHINE_CONFIG: z.string().optional(), // NOTE: Not sure if it should be optional
    NEXTAUTH_URL: z.string().default('http://localhost:3000'),
  },
  production: {
    NEXTAUTH_SECRET: z.string(),

    USE_AUTH0: z.boolean(),

    SMTP_MAIL_USER: z.string(),
    SMTP_MAIL_PORT: z.number(),
    SMTP_MAIL_HOST: z.string(),
    SMTP_MAIL_PASSWORD: z.string(),

    AUTH0_CLIENT_ID: z.string(),
    AUTH0_CLIENT_SECRET: z.string(),
    AUTH0_ISSUER: z.string(),
    AUTH0_SCOPE: z.string(),

    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),

    JWT_SHARE_SECRET: z.string(),
  },
  development: {},
  test: {},
} satisfies EnvironmentVariables;

// --------------------------------------------
// You shouldn't need to modify anything below
// --------------------------------------------

type EnvironmentVariables = {
  [key in 'development' | 'production' | 'test' | 'all']?: Record<string, ZodType>;
};

type Env = typeof environmentVariables;

type MergedEnvironmentVariables = Env['all'] & Env['production'] & Env['test'] & Env['development'];

const isServer = typeof window === 'undefined';
const mode = (process.env.NODE_ENV ?? 'development') as 'development' | 'production' | 'test';
const schemaOptions = {
  ...environmentVariables.all,
  ...((environmentVariables as EnvironmentVariables)[mode] ?? {}),
} as Partial<Record<string, ZodType>>;

for (const key of Object.keys(environmentVariables)) {
  if (!isServer && !key.startsWith('NEXT_PUBLIC_')) delete schemaOptions[key];
}

const runtimeEnvVariables: Record<string, any> = {};
for (const variable in Object.keys(environmentVariables))
  runtimeEnvVariables[variable] = process.env[variable];

export const env = new Proxy(
  z.object(schemaOptions as MergedEnvironmentVariables).parse(runtimeEnvVariables),
  {
    get(target, prop) {
      if (typeof prop !== 'string') return undefined;
      if (!isServer && !(prop in schemaOptions) && prop.startsWith('NEXT_PUBLIC_'))
        throw new Error('Attempted to access a server-side environment variable on the client');

      return Reflect.get(target, prop);
    },
  },
);
