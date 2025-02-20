import { execSync } from 'child_process';
import fs from 'fs/promises';
// https://github.com/sindresorhus/execa/issues/1159
const { execaSync } = await import('execa');

interface CommandOptions {
  init?: boolean;
  new?: boolean;
  delete?: boolean;
  deleteAll?: boolean;
  deleteBranch?: string;
  changeDb?: boolean;
  changeOption?: 'branch' | 'default';
  branchName?: string;
}

const config = {
  containerName: 'postgres_database_proceed',
  postgresUser: 'proceed',
  postgresPassword: 'proceed',
  defaultDb: 'proceed_db',
  envFile: './.env',
  dbHost: 'localhost',
  // Use non default port to avoid conflicts with local Postgres installations.
  dbPort: '5433',
  defaultSchema: 'public',
};

async function getCurrentBranch(): Promise<string> {
  try {
    const result = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
    });
    return result.trim();
  } catch (error) {
    console.error('Failed to get current git branch:', error);
    process.exit(1);
  }
}

function sanitizeBranchName(branchName: string): string {
  return branchName.replace(/[-/]/g, '_').toLowerCase();
}

async function updateEnvFile(dbName: string, envFile: string): Promise<void> {
  const databaseUrl = `postgresql://${config.postgresUser}:${config.postgresPassword}@${config.dbHost}:${config.dbPort}/${dbName}?schema=${config.defaultSchema}`;

  try {
    let envContent = '';
    try {
      envContent = await fs.readFile(envFile, 'utf-8');
    } catch (error) {
      // File doesn't exist, will create new one
    }

    const newEnvContent = envContent.includes('DATABASE_URL=')
      ? envContent.replace(/^DATABASE_URL=.*/m, `DATABASE_URL=${databaseUrl}`)
      : `${envContent}\nDATABASE_URL=${databaseUrl}`;

    await fs.writeFile(envFile, newEnvContent.trim());
    console.log(`DATABASE_URL successfully updated in ${envFile}`);
  } catch (error) {
    console.error(`Failed to update DATABASE_URL in ${envFile}:`, error);
    process.exit(1);
  }
}

async function executePostgresCommand(command: string): Promise<string> {
  try {
    const { stdout } = execaSync('docker', [
      'exec',
      '-e',
      `PGPASSWORD=${config.postgresPassword}`,
      '-i',
      config.containerName,
      'psql',
      '-U',
      config.postgresUser,
      '-d',
      config.defaultDb,
      '-tAc',
      command,
    ]);
    return stdout.trim();
  } catch (error) {
    console.error('Failed to execute Postgres command:', error);
    process.exit(1);
  }
}

async function checkDatabaseExists(dbName: string): Promise<boolean> {
  const result = await executePostgresCommand(
    `SELECT 1 FROM pg_database WHERE datname='${dbName}';`,
  );
  return result === '1';
}

async function createDatabase(dbName: string): Promise<void> {
  try {
    await executePostgresCommand(`CREATE DATABASE ${dbName};`);
    console.log(`Database ${dbName} created successfully.`);
  } catch (error) {
    console.error(`Failed to create database ${dbName}:`, error);
    process.exit(1);
  }
}

async function dropDatabase(dbName: string): Promise<void> {
  try {
    await executePostgresCommand(`DROP DATABASE ${dbName};`);
    console.log(`Database ${dbName} dropped successfully.`);
  } catch (error) {
    console.error(`Failed to drop database ${dbName}:`, error);
    process.exit(1);
  }
}

async function ensureDockerContainerRunning(): Promise<void> {
  try {
    const { stdout } = execaSync('docker', ['ps']);
    if (!stdout.includes(config.containerName)) {
      console.log(`Starting Docker container: ${config.containerName}`);
      execaSync('docker', ['start', config.containerName]);
    }
  } catch (error) {
    console.error('Failed to start Docker container:', error);
    process.exit(1);
  }
}

async function applyPrismaSchema(): Promise<void> {
  try {
    execaSync('yarn', ['prisma', 'migrate', 'deploy']);
    console.log('Schema applied successfully.');
  } catch (error) {
    console.error('Failed to apply Prisma schema:', error);
    process.exit(1);
  }
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options: CommandOptions = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--init':
        options.init = true;
        break;
      case '--new':
        options.new = true;
        break;
      case '--delete':
        options.delete = true;
        break;
      case '--all':
        options.deleteAll = true;
        break;
      case '--branch':
        options.deleteBranch = args[++i];
        break;
      case '--use':
        options.changeDb = true;
        break;
      case 'branch':
      case 'default':
        options.changeOption = args[i] as 'branch' | 'default';
        break;
      default:
        if (!args[i].startsWith('--')) {
          options.branchName = args[i];
        }
    }
  }

  // Get branch name if not provided
  const branchName = options.branchName || (await getCurrentBranch());
  const safeBranchName = sanitizeBranchName(branchName);
  const branchDbName = `proceed_db_${safeBranchName}`;

  await ensureDockerContainerRunning();

  if (options.delete) {
    if (options.deleteAll) {
      const databases = await executePostgresCommand(
        "SELECT datname FROM pg_database WHERE datname LIKE 'proceed_db_%';",
      );

      for (const db of databases.split('\n')) {
        if (db && db !== config.defaultDb) {
          await dropDatabase(db);
        }
      }
      process.exit(0);
    }

    if (options.deleteBranch) {
      const dbToDelete = `proceed_db_${sanitizeBranchName(options.deleteBranch)}`;
      if (await checkDatabaseExists(dbToDelete)) {
        await dropDatabase(dbToDelete);
      } else {
        console.log(
          `Database ${dbToDelete} does not exist. Nothing to delete.`,
        );
      }
      process.exit(0);
    }

    if (!options.init && (await checkDatabaseExists(branchDbName))) {
      await dropDatabase(branchDbName);
    } else {
      console.log('Cannot delete the default database.');
    }
    process.exit(0);
  }

  let dbName = options.init ? config.defaultDb : branchDbName;

  if (options.new && !options.init) {
    if (await checkDatabaseExists(branchDbName)) {
      console.log(`Database ${branchDbName} already exists. Reusing it.`);
    } else {
      await createDatabase(branchDbName);
    }
    dbName = branchDbName;
  }

  if (options.changeDb) {
    dbName =
      options.changeOption === 'default' ? config.defaultDb : branchDbName;
    console.log(`Switching to ${options.changeOption} database: ${dbName}`);
  }

  await updateEnvFile(dbName, config.envFile);

  async function checkIfDefaultDBHasSchema() {
    const result = await executePostgresCommand(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '_prisma_migrations');`,
    );
    return result === 't';
  }

  if (options.init) {
    const isMainBranch = (await getCurrentBranch()) === 'main';
    const defaultDbHasSchema = await checkIfDefaultDBHasSchema();
    if (isMainBranch || (!isMainBranch && !defaultDbHasSchema)) {
      await applyPrismaSchema();
    } else {
      console.log(
        'Skipping Prisma schema update for default db from non-main branch.',
      );
    }
  }
}

main().catch((error) => {
  console.error('An error occurred:', error);
  process.exit(1);
});
