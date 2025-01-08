const { execSync } = require('child_process');
const fs = require('fs');

// Configurable parameters
const CONFIG = {
  containerName: 'postgres_database_proceed',
  postgresUser: 'proceed',
  postgresPassword: 'proceed',
  defaultDb: 'proceed_db',
  dbHost: 'localhost',
  dbPort: '5433',
  defaultSchema: 'public',
  envFile: './.env',
  checkInterval: 2000,
};

// Parse command-line arguments
const args = process.argv.slice(2);
const options = parseArguments(args);

(async function main() {
  validateEnvironment();

  // Wait for the container to be healthy (if initializing)
  if (options.init) {
    await waitForContainerHealth();
  }

  // Determine database name
  const branchName = getBranchName(options.branch);
  const dbName = options.init ? determineDatabase(branchName) : getBranchDatabaseName(branchName);

  // Handle options
  if (options.delete) {
    handleDatabaseDeletion(dbName, options);
    return;
  }

  if (options.createNew) {
    handleNewDatabaseCreation(dbName);
  }

  if (options.changeDb) {
    handleDatabaseSwitch(dbName, options.changeOption);
  }

  // Apply the schema (if initializing or creating a new database)
  if (options.init || options.createNew) {
    applyDatabaseSchema(dbName);
  }
})();

// ---------------- Helper Functions ----------------

function parseArguments(args) {
  const options = {
    init: false,
    createNew: false,
    delete: false,
    deleteAll: false,
    deleteBranch: '',
    changeDb: false,
    changeOption: '',
    branch: '',
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--init':
        options.init = true; // creates the default db
        break;
      case '--new':
        options.createNew = true; // creates new branch specific db
        break;
      case '--delete':
        options.delete = true; // delete db
        break;
      case '--all':
        options.deleteAll = true; // deletes all branch specific dbs except default one
        break;
      case '--branch':
        options.deleteBranch = args[++i]; // delete only a branch db : --branch <branch-name>
        break;
      case '--use':
        options.changeDb = true; // switch between dbs, also creates new branch db if not present
        options.changeOption = args[++i];
        break;
      default:
        options.branch = args[i];
    }
  }

  return options;
}

function validateEnvironment() {
  try {
    execSync('docker --version');
    execSync(`docker exec ${CONFIG.containerName} psql --version`);
  } catch (error) {
    console.error('Docker or PostgreSQL is not configured correctly.');
    process.exit(1);
  }
}

async function waitForContainerHealth() {
  console.log(`Waiting for container "${CONFIG.containerName}" to be healthy...`);
  while (!isContainerHealthy()) {
    console.log('Still waiting...');
    await delay(CONFIG.checkInterval);
  }
  console.log(`Container "${CONFIG.containerName}" is healthy!`);
}

function isContainerHealthy() {
  try {
    const status = execSync(
      `docker inspect -f "{{.State.Health.Status}}" ${CONFIG.containerName}`,
      {
        encoding: 'utf-8',
      },
    ).trim();
    return status === 'healthy';
  } catch (error) {
    console.error(`Error checking container health: ${error.message}`);
    return false;
  }
}

function determineDatabase(branchName) {
  const branchDbName = getBranchDatabaseName(branchName);

  if (checkDatabaseExists(branchDbName)) {
    console.log(`Using existing branch-specific database: ${branchDbName}`);
    updateEnvFile(branchDbName);
    return branchDbName;
  }

  if (checkDatabaseExists(CONFIG.defaultDb)) {
    console.log(`Using existing default database: ${CONFIG.defaultDb}`);
    updateEnvFile(CONFIG.defaultDb);
    return CONFIG.defaultDb;
  }

  console.log(`No databases found. Creating default database: ${CONFIG.defaultDb}`);
  createDatabase(CONFIG.defaultDb);
  updateEnvFile(CONFIG.defaultDb);
  return CONFIG.defaultDb;
}

function handleDatabaseDeletion(dbName, options) {
  if (options.deleteAll) {
    deleteAllBranchDatabases();
  } else if (options.deleteBranch) {
    deleteDatabase(getBranchDatabaseName(options.deleteBranch));
  } else {
    deleteDatabase(dbName);
  }
}

async function deleteAllBranchDatabases() {
  console.log('Deleting all branch-specific databases...');
  const databases = listDatabases().filter(
    (db) => db.startsWith('proceed_db_') && db !== CONFIG.defaultDb,
  );
  await Promise.all(databases.map(deleteDatabase));
}

function handleNewDatabaseCreation(dbName) {
  if (checkDatabaseExists(dbName)) {
    console.log(`Database ${dbName} already exists.`);
  } else {
    console.log(`Creating new database: ${dbName}`);
    createDatabase(dbName);
    updateEnvFile(dbName);
  }
}

function handleDatabaseSwitch(dbName, option) {
  const targetDb = option === 'default' ? CONFIG.defaultDb : dbName;
  if (!checkDatabaseExists(targetDb)) {
    console.log(`Database ${targetDb} does not exist. Creating it...`);
    createDatabase(targetDb);
    options.createNew = true;
  }
  console.log(`Switching to database: ${targetDb}`);
  updateEnvFile(targetDb);
}

function applyDatabaseSchema(dbName) {
  console.log(`Applying schema to database: ${dbName}`);
  const schemaPath = './prisma/migrations';
  if (!fs.existsSync(schemaPath) || !fs.readdirSync(schemaPath).length) {
    console.error('No migration files found. Skipping schema application.');
    return;
  }
  try {
    execSync('yarn prisma migrate deploy', { stdio: 'inherit' });
    console.log('Schema applied successfully.');
  } catch (error) {
    console.error(`Failed to apply schema: ${error.message}`);
    process.exit(1);
  }
}

// Utility Functions
function getBranchName(branch) {
  if (branch) return sanitizeBranchName(branch);

  try {
    return sanitizeBranchName(execSync('git rev-parse --abbrev-ref HEAD').toString().trim());
  } catch (error) {
    console.error('Failed to determine current branch name.');
    process.exit(1);
  }
}

function sanitizeBranchName(name) {
  return name.replace(/[-\/]/g, '_');
}

function getBranchDatabaseName(branchName) {
  return `proceed_db_${sanitizeBranchName(branchName)}`;
}

function checkDatabaseExists(dbName) {
  try {
    const result = execSync(
      `docker exec -e PGPASSWORD="${CONFIG.postgresPassword}" -i "${CONFIG.containerName}" psql -U "${CONFIG.postgresUser}" -d "${CONFIG.defaultDb}" -tAc "SELECT 1 FROM pg_database WHERE datname='${dbName}';"`,
    )
      .toString()
      .trim();
    return result === '1';
  } catch {
    return false;
  }
}

function createDatabase(dbName) {
  try {
    execSync(
      `docker exec -e PGPASSWORD="${CONFIG.postgresPassword}" -i "${CONFIG.containerName}" psql -U "${CONFIG.postgresUser}" -d "postgres" -c "CREATE DATABASE ${dbName};"`,
    );
    console.log(`Database ${dbName} created successfully.`);
  } catch (error) {
    console.error(`Failed to create database: ${error.message}`);
    process.exit(1);
  }
}

function deleteDatabase(dbName) {
  try {
    execSync(
      `docker exec -e PGPASSWORD="${CONFIG.postgresPassword}" -i "${CONFIG.containerName}" psql -U "${CONFIG.postgresUser}" -d "${CONFIG.defaultDb}" -c "DROP DATABASE ${dbName};"`,
    );
    console.log(`Database ${dbName} deleted successfully.`);
  } catch (error) {
    console.error(`Failed to delete database: ${error.message}`);
  }
}

function listDatabases() {
  try {
    const result = execSync(
      `docker exec -e PGPASSWORD="${CONFIG.postgresPassword}" -i "${CONFIG.containerName}" psql -U "${CONFIG.postgresUser}" -d "${CONFIG.defaultDb}" -tAc "SELECT datname FROM pg_database;"`,
    )
      .toString()
      .trim();
    return result.split('\n').filter((db) => db);
  } catch {
    return [];
  }
}

function updateEnvFile(dbName) {
  const databaseUrl = `postgresql://${CONFIG.postgresUser}:${CONFIG.postgresPassword}@${CONFIG.dbHost}:${CONFIG.dbPort}/${dbName}?schema=${CONFIG.defaultSchema}`;
  if (fs.existsSync(CONFIG.envFile)) {
    let content = fs.readFileSync(CONFIG.envFile, 'utf-8');
    const regex = /^DATABASE_URL=.*$/m;
    content = regex.test(content)
      ? content.replace(regex, `DATABASE_URL=${databaseUrl}`)
      : `${content}\nDATABASE_URL=${databaseUrl}`;
    fs.writeFileSync(CONFIG.envFile, content);
  } else {
    fs.writeFileSync(CONFIG.envFile, `DATABASE_URL=${databaseUrl}\n`);
  }
  console.log(`Updated DATABASE_URL in ${CONFIG.envFile}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
