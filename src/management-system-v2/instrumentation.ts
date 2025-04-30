export async function register() {
  // Register default admin user if IAM is not activated
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureDefaultMSConfig } = await import('./lib/ms-config/ms-config');

    ensureDefaultMSConfig();
  }
}
