export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { env } = await import('./lib/ms-config/env-vars');

    const { getMSConfigDBValuesAndEnsureDefaults } = await import('./lib/ms-config/ms-config');
    getMSConfigDBValuesAndEnsureDefaults();

    // Register default admin user if IAM is not activated
    const { userId, createUserArgs } = await import('./lib/no-iam-user');
    const { addUser, getUserById } = await import('./lib/data/db/iam/users');
    if (!env.PROCEED_PUBLIC_IAM_ACTIVE && !(await getUserById(userId)))
      await addUser(createUserArgs);

    // Create personal spaces for users that don't have one
    // (As a result of them being created when PROCEED_PUBLIC_IAM_PERSONAL_SPACES_ACTIVE=false)
    const db = await import('./lib/data/db');
    const { addEnvironment } = await import('./lib/data/db/iam/environments');
    if (env.PROCEED_PUBLIC_IAM_PERSONAL_SPACES_ACTIVE) {
      const usersWithoutPersonalSpace = await db.default.$queryRaw<{ id: string }[]>`
        SELECT u.id
        FROM "user" u LEFT JOIN "space" s ON u.id = s.id
        WHERE s.id IS NULL
      `;

      const promises = usersWithoutPersonalSpace.map(({ id }) =>
        addEnvironment({ ownerId: id, isOrganization: false }),
      );

      await Promise.all(promises);
    }

    // Import db seed
    const { importSeed } = await import('./lib/db-seed');
    await importSeed();
  }
}
