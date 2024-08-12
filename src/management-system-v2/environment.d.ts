namespace NodeJS {
  interface ProcessEnv {
    NEXTAUTH_SECRET: string;
    NEXT_PUBLIC_USE_AUTH: string;

    SHARING_ENCRYPTION_SECRET: string;

    USE_AUTH0?: string;
    AUTH0_CLIENT_ID?: string;
    AUTH0_CLIENT_SECRET?: string;
    AUTH0_clientCredentialScope?: string;
    AUTH0_ISSUER?: string;
    AUTH0_SCOPE?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    DISCORD_CLIENT_ID?: string;
    DISCORD_CLIENT_SECRET?: string;
    TWITTER_CLIENT_ID?: string;
    TWITTER_CLIENT_SECRET?: string;

    ENABLE_MACHINE_CONFIG?: string;
    NEXT_PUBLIC_ENABLE_EXECUTION?: string;
  }
}
