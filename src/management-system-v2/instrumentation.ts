export async function register() {
  // Register default admin user if IAM is not activated
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { env } = await import('./lib/ms-config/env-vars');

    const { getMSConfigDBValuesAndEnsureDefaults } = await import('./lib/ms-config/ms-config');
    getMSConfigDBValuesAndEnsureDefaults();

    const { userId, createUserArgs } = await import('./lib/no-iam-user');
    const { addUser, getUserById } = await import('./lib/data/db/iam/users');
    if (!env.PROCEED_PUBLIC_IAM_ACTIVE && !(await getUserById(userId)))
      await addUser(createUserArgs);

    const { importSeed } = await import('./lib/db-seed');
    await importSeed();
  }
}
