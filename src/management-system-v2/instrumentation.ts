export async function register() {
  const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

  // Register default admin user if IAM is not activated
  if (process.env.NEXT_RUNTIME === 'nodejs' && !isBuild) {
    const { userId, createUserArgs } = await import('./lib/no-iam-user');
    const { addUser, getUserById } = await import('./lib/data/db/iam/users');

    if (!process.env.IAM_ACTIVATE && !(await getUserById(userId))) await addUser(createUserArgs);
  }
}
