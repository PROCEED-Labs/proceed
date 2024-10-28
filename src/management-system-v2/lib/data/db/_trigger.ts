import { PrismaClient, Prisma } from '@prisma/client';
import db from '.';

// Define a type for the global namespace
declare global {
  var __dbTriggerSetup: boolean | undefined;
}

interface TriggerSetup {
  name: string;
  type: 'function' | 'trigger';
  checkQuery: Prisma.Sql;
  createQuery: Prisma.Sql;
}

interface ExistsResult {
  exists: boolean;
}

export async function setupRefCounterDBTrigger(db: PrismaClient) {
  // If triggers are already set up, skip
  if (global.__dbTriggerSetup) {
    console.log('Database triggers already initialized, skipping setup.');
    return;
  }

  const setups: TriggerSetup[] = [
    {
      name: 'set_deletable_and_deletedon_based_on_refcounter',
      type: 'function',
      checkQuery: Prisma.sql`
        SELECT EXISTS (
          SELECT 1 FROM pg_proc 
          WHERE proname = 'set_deletable_and_deletedon_based_on_refcounter'
        )
      `,
      createQuery: Prisma.sql`
        CREATE OR REPLACE FUNCTION set_deletable_and_deletedon_based_on_refcounter()
        RETURNS TRIGGER AS $$
        BEGIN
          IF NEW."refCounter" = 0 THEN
              NEW."deletable" := TRUE;
              NEW."deletedOn" := CURRENT_TIMESTAMP;
          ELSE
              NEW."deletable" := FALSE;
              NEW."deletedOn" := NULL;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `,
    },
    {
      name: 'update_deletable_and_deletedon_on_refcounter_change',
      type: 'trigger',
      checkQuery: Prisma.sql`
        SELECT EXISTS (
          SELECT 1 FROM pg_trigger
          WHERE tgname = 'update_deletable_and_deletedon_on_refcounter_change'
        )
      `,
      createQuery: Prisma.sql`
        CREATE TRIGGER update_deletable_and_deletedon_on_refcounter_change
        BEFORE INSERT OR UPDATE OF "refCounter"
        ON artifact
        FOR EACH ROW
        EXECUTE FUNCTION set_deletable_and_deletedon_based_on_refcounter();
      `,
    },
    {
      name: 'update_artifact_refcounter',
      type: 'function',
      checkQuery: Prisma.sql`
        SELECT EXISTS (
          SELECT 1 FROM pg_proc
          WHERE proname = 'update_artifact_refcounter'
        )
      `,
      createQuery: Prisma.sql`
        CREATE OR REPLACE FUNCTION update_artifact_refcounter()
        RETURNS TRIGGER AS $$
        BEGIN
          IF TG_OP = 'INSERT' THEN
              UPDATE artifact
              SET "refCounter" = "refCounter" + 1
              WHERE id = NEW."artifactId";
          ELSIF TG_OP = 'DELETE' THEN
              UPDATE artifact
              SET "refCounter" = GREATEST("refCounter" - 1, 0)
              WHERE id = OLD."artifactId";
          END IF;
          RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
      `,
    },
    {
      name: 'update_refcounter_on_artifact_reference_change',
      type: 'trigger',
      checkQuery: Prisma.sql`
        SELECT EXISTS (
          SELECT 1 FROM pg_trigger
          WHERE tgname = 'update_refcounter_on_artifact_reference_change'
        )
      `,
      createQuery: Prisma.sql`
        CREATE TRIGGER update_refcounter_on_artifact_reference_change
        AFTER INSERT OR DELETE ON artifact_reference
        FOR EACH ROW
        EXECUTE FUNCTION update_artifact_refcounter();
      `,
    },
  ];

  try {
    console.info('Initializing database triggers...');

    for (const setup of setups) {
      const [result] = await db.$queryRaw<[ExistsResult]>(setup.checkQuery);

      if (!result.exists) {
        await db.$executeRaw(setup.createQuery);
        console.log(`${setup.type} '${setup.name}' created successfully.`);
      } else {
        console.log(`${setup.type} '${setup.name}' already exists, skipping creation.`);
      }
    }

    // Mark triggers as set up
    global.__dbTriggerSetup = true;
    console.log('Database triggers initialized successfully.');
  } catch (error) {
    console.error('Failed to set up database triggers:', error);
    throw error;
  }
}
