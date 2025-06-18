export async function register() {
  // Register default admin user if IAM is not activated
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getMSConfigDBValuesAndEnsureDefaults } = await import('./lib/ms-config/ms-config');
    getMSConfigDBValuesAndEnsureDefaults();

    const { userId, createUserArgs } = await import('./lib/no-iam-user');
    const { addUser, getUserById } = await import('./lib/data/db/iam/users');
    if (!process.env.PROCEED_PUBLIC_IAM_ACTIVATE && !(await getUserById(userId)))
      await addUser(createUserArgs);

    const { importSeed } = await import('./lib/db-seed');
    await importSeed();
  }
}
