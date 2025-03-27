export async function register() {
  // Register default admin user if IAM is not activated
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { userId, createUserArgs } = await import('./lib/no-iam-user');
    const { addUser, getUserById } = await import('./lib/data/db/iam/users');

    if (!process.env.IAM_ACTIVATE && !(await getUserById(userId))) await addUser(createUserArgs);
  }
}
