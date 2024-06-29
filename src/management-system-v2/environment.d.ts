namespace NodeJS {
  interface ProcessEnv {
    NEXTAUTH_SECRET: string;
    NEXT_PUBLIC_USE_AUTH: string;

    USE_AUTH0?: string;
    JWT_SHARE_SECRET: string;
    AUTH0_CLIENT_ID?: string;
    AUTH0_CLIENT_SECRET?: string;
    AUTH0_clientCredentialScope?: string;
    AUTH0_ISSUER?: string;
    AUTH0_SCOPE?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;

    ENABLE_MACHINE_CONFIG?: string;
    ENABLE_EXECUTION?: string;
  }
}
