// db.ts
import { DatabaseSync } from 'node:sqlite';
import * as path from 'node:path';
import * as sqliteVec from 'sqlite-vec';
import { v4 as uuid } from 'uuid';
import { CompetenceDBOutput, VectorDBOptions } from '../utils/types';

class VectorDataBase {
  private db: DatabaseSync;
  private embeddingDim: number;
  private transactionInProgress = false;

  /**
   * Opens (or creates) the SQLite DB, enables FKs, loads sqlite-vec, and sets up schema.
   */
  constructor(opts: VectorDBOptions) {
    this.embeddingDim = opts.embeddingDim;
    const dbPath =
      !opts.filePath || opts.filePath === ':memory:'
        ? ':memory:'
        : path.isAbsolute(opts.filePath)
          ? opts.filePath
          : path.join(process.cwd(), opts.filePath);

    this.db = new DatabaseSync(dbPath, { allowExtension: true });
    this.db.exec(`PRAGMA foreign_keys = ON;`);
    sqliteVec.load(this.db);
    this.initSchema();
  }

  /** Close the database connection */
  public close(): void {
    this.db.close();
  }

  /** Run a set of operations atomically (in a transaction) */
  public atomicStep(cb: () => void): void {
    if (this.transactionInProgress) throw new Error('Transaction already in progress');
    this.transactionInProgress = true;
    this.db.exec('BEGIN');
    try {
      cb();
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    } finally {
      this.transactionInProgress = false;
    }
  }

  /** Set up all tables, indexes and virtual tables */
  private initSchema() {
    // jobs
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id           TEXT PRIMARY KEY,
        status       TEXT NOT NULL DEFAULT 'pending',
        reference_id TEXT
      );
    `);

    // matches
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS match_results (
        id            TEXT   PRIMARY KEY,      -- UUID for this match record
        job_id        TEXT   NOT NULL          REFERENCES jobs(id) ON DELETE CASCADE,
        task_id       TEXT   NOT NULL,         -- task ID this match belongs to,
        task_text     TEXT   NOT NULL,         -- task text that was used for matching
        competence_id TEXT   NOT NULL,         -- matched competence
        resource_id   TEXT   NOT NULL,         -- resource ID the competence belongs to
        distance      REAL   NOT NULL,         -- similarity score
        text          TEXT   NOT NULL,         -- the matched snippet
        type          TEXT   NOT NULL,         -- 'name' | 'description' | 'proficiencyLevel'
        reason        TEXT                     -- llm based reason for the match
      );
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS ix_match_results_job
      ON match_results(job_id);
    `);

    // resource_list
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS resource_list (
        id TEXT PRIMARY KEY
      );
    `);

    // resources (internal PK + user‐facing ID)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS resource (
        _rid        INTEGER PRIMARY KEY AUTOINCREMENT,
        resource_id TEXT    NOT NULL,
        list_id     TEXT    NOT NULL REFERENCES resource_list(id) ON DELETE CASCADE
      );
    `);
    this.db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_resource_list_resid
        ON resource(list_id, resource_id);
    `);

    // competences (internal PK + user‐facing ID)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS competence (
        _cid            INTEGER PRIMARY KEY AUTOINCREMENT,
        competence_id   TEXT    NOT NULL,
        resource_rid    INTEGER NOT NULL REFERENCES resource(_rid) ON DELETE CASCADE,
        competence_name TEXT,
        competence_description TEXT,
        external_qualification_needed BOOLEAN DEFAULT FALSE,
        renew_time      INTEGER,
        proficiency_level      TEXT,
        qualification_dates    TEXT,
        last_usages            TEXT
      );
    `);
    this.db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_competence_rescid
        ON competence(resource_rid, competence_id);
    `);

    // embeddings (virtual vec0 table; explicit deletes required)
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS competence_embedding
      USING vec0(
        cid       INTEGER NOT NULL REFERENCES competence(_cid) ON DELETE CASCADE,
        text      TEXT,
        type      TEXT,
        embedding FLOAT32[${this.embeddingDim}]
      );
    `);
  }

  /*--------------------------------------------------------------------
   * Helper Lookups
   *------------------------------------------------------------------*/

  /** Get the internal `_rid` for a given user‐facing resourceId + listId */
  private getResourceRid(resourceId: string, listId: string): number {
    const row = this.db
      .prepare(`SELECT _rid FROM resource WHERE resource_id = ? AND list_id = ?`)
      .get(resourceId, listId);
    if (!row) throw new Error(`Resource '${resourceId}' not found in list '${listId}'`);
    return row._rid as number;
  }

  /** Get the internal `_cid` for a given user‐facing competenceId */
  private getCompetenceCidByCompetenceId(
    listId: string,
    resourceId: string,
    competenceId: string,
  ): number {
    const _rid = this.getResourceRid(resourceId, listId);
    const row = this.db
      .prepare(
        `
          SELECT _cid 
          FROM competence 
          WHERE competence_id = ?
          AND resource_rid = ?
        `,
      )
      .get(competenceId, _rid);
    if (!row)
      throw new Error(
        `Competence '${competenceId}' in List ${listId} in Resource ${resourceId} not found`,
      );
    return row._cid as number;
  }

  /*--------------------------------------------------------------------
   * Job Methods
   *------------------------------------------------------------------*/

  /**
   * Create a new background‐job record.
   * @param referenceId Optionally point back to a resource-list, resource, or competence ID.
   * @returns the new job’s UUID.
   */
  public createJob(referenceId?: string): string {
    const jobId = uuid();
    this.db
      .prepare(`INSERT INTO jobs(id, reference_id) VALUES (?, ?)`)
      .run(jobId, referenceId ?? null);
    return jobId;
  }

  /**
   * Change a job’s status.
   * @throws if no such job exists.
   */
  public updateJobStatus(
    jobId: string,
    status: 'pending' | 'preprocessing' | 'running' | 'completed' | 'failed',
  ): void {
    const result = this.db.prepare(`UPDATE jobs SET status = ? WHERE id = ?`).run(status, jobId);
    if (result.changes === 0) throw new Error(`Job with id ${jobId} not found`);
  }

  /**
   * Look up a job’s current status and its referenceId.
   * @throws if no such job exists.
   */
  public getJob(jobId: string): { jobId: string; status: string; referenceId?: string } {
    const row = this.db
      .prepare(`SELECT id, status, reference_id FROM jobs WHERE id = ?`)
      .get(jobId) as { id: string; status: string; reference_id: string } | undefined;
    if (!row) throw new Error(`Job with id ${jobId} not found`);
    return { jobId: row.id, status: row.status, referenceId: row.reference_id ?? undefined };
  }

  /*--------------------------------------------------------------------
   * Match Methods
   *------------------------------------------------------------------*/

  /**
   * Add a match result for a job, task, and competence.
   *
   * @param opts Options for adding a match result.
   * @throws if the jobId, taskId, or competenceId do not exist.
   */
  public addMatchResult(opts: {
    jobId: string;
    taskId: string;
    taskText: string;
    competenceId: string;
    resourceId: string;
    distance: number;
    text: string;
    type: 'name' | 'description' | 'proficiencyLevel';
    reason?: string; // optional reason for the match
  }): void {
    const id = uuid();
    this.db
      .prepare(
        `
          INSERT INTO match_results
            (id, job_id, task_id, task_text, competence_id, resource_id, distance, text, type, reason)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        id,
        opts.jobId,
        opts.taskId,
        opts.taskText,
        opts.competenceId,
        opts.resourceId,
        opts.distance,
        opts.text,
        opts.type,
        opts.reason ?? null,
      );
  }

  /**
   * Fetch all match results for a given jobId.
   * @returns an array of match results, sorted by taskId and distance.
   */
  public getMatchResults(jobId: string): Array<{
    taskId: string;
    taskText: string;
    competenceId: string;
    resourceId: string;
    distance: number;
    text: string;
    type: string;
    reason?: string;
  }> {
    return this.db
      .prepare(
        `
    SELECT task_id, task_text, competence_id, resource_id, distance, text, type, reason
      FROM match_results
     WHERE job_id = ?
     ORDER BY task_id, distance
  `,
      )
      .all(jobId)
      .map((r: any) => ({
        taskId: r.task_id,
        taskText: r.task_text,
        competenceId: r.competence_id,
        resourceId: r.resource_id,
        distance: r.distance,
        text: r.text,
        type: r.type,
        reason: r.reason ?? undefined,
      }));
  }

  /*--------------------------------------------------------------------
   * ResourceList Methods
   *------------------------------------------------------------------*/

  /** Create a fresh, empty resource‐list and return its UUID */
  public createResourceList(): string {
    const listId = uuid();
    this.db.prepare(`INSERT INTO resource_list(id) VALUES (?)`).run(listId);
    return listId;
  }

  /**
   * Delete an entire list—this cascades down to resources, competences,
   * explicitly wipes embeddings.
   */
  public deleteResourceList(listId: string): void {
    this.atomicStep(() => {
      this.db
        .prepare(
          `
          DELETE FROM competence_embedding
          WHERE cid IN (
            SELECT c._cid
            FROM competence c
            JOIN resource r ON c.resource_rid = r._rid
            WHERE r.list_id = ?
          )
        `,
        )
        .run(listId);
      this.db.prepare(`DELETE FROM resource_list WHERE id = ?`).run(listId);
    });
  }

  /** Enumerate all list IDs */
  public getAvailableResourceLists(): string[] {
    return this.db
      .prepare(`SELECT id FROM resource_list`)
      .all()
      .map((r) => (r as any).id);
  }

  /**
   * Fetch a list plus all its resources and each resource’s competences.
   * @throws if listId doesn’t exist.
   */
  public getResourceList(listId: string): {
    competenceListId: string;
    resources: Array<{
      resourceId: string;
      competencies: Array<{
        competenceId: string;
        name?: string;
        description?: string;
        externalQualificationNeeded: boolean;
        renewTime?: number;
        proficiencyLevel?: string;
        qualificationDates: string[];
        lastUsages: string[];
      }>;
    }>;
  } {
    const exists = this.db.prepare(`SELECT 1 FROM resource_list WHERE id = ?`).get(listId);
    if (!exists) throw new Error(`Resource list '${listId}' not found`);

    const resources = this.db
      .prepare(`SELECT _rid, resource_id FROM resource WHERE list_id = ?`)
      .all(listId) as Array<{ _rid: number; resource_id: string }>;

    return {
      competenceListId: listId,
      resources: resources.map(({ _rid, resource_id }) => {
        const comps = this.db
          .prepare(
            `
            SELECT competence_id, competence_name, competence_description,
                   external_qualification_needed, renew_time,
                   proficiency_level, qualification_dates, last_usages
            FROM competence
            WHERE resource_rid = ?
          `,
          )
          .all(_rid) as CompetenceDBOutput[];
        return {
          resourceId: resource_id,
          competencies: comps.map((c) => ({
            competenceId: c.competence_id,
            name: c.competence_name ?? undefined,
            description: c.competence_description ?? undefined,
            externalQualificationNeeded: Boolean(c.external_qualification_needed),
            renewTime: c.renew_time ?? undefined,
            proficiencyLevel: c.proficiency_level ?? undefined,
            qualificationDates: c.qualification_dates ? JSON.parse(c.qualification_dates) : [],
            lastUsages: c.last_usages ? JSON.parse(c.last_usages) : [],
          })),
        };
      }),
    };
  }

  /*--------------------------------------------------------------------
   * Resource Methods
   *------------------------------------------------------------------*/

  /**
   * Add a resource (user‐facing ID) into a list.
   * Returns the user‐facing resourceId.
   */
  public addResource(listId: string, resourceId?: string): string {
    const rid = resourceId ?? uuid();
    this.db.prepare(`INSERT INTO resource(resource_id, list_id) VALUES (?, ?)`).run(rid, listId);
    return rid;
  }

  /**
   * Move a resource from one list to another.
   * @param oldListId current list
   * @param resourceId user‐facing ID
   * @param newListId target list
   */
  public updateResource(oldListId: string, resourceId: string, newListId: string): void {
    const _rid = this.getResourceRid(resourceId, oldListId);
    this.db.prepare(`UPDATE resource SET list_id = ? WHERE _rid = ?`).run(newListId, _rid);
  }

  /**
   * Delete a single resource (and its subtree) by user‐facing ID + list.
   */
  public deleteResource(listId: string, resourceId: string): void {
    this.atomicStep(() => {
      const _rid = this.getResourceRid(resourceId, listId);
      this.db
        .prepare(
          `
          DELETE FROM competence_embedding
          WHERE cid IN (SELECT _cid FROM competence WHERE resource_rid = ?)
        `,
        )
        .run(_rid);
      this.db.prepare(`DELETE FROM resource WHERE _rid = ?`).run(_rid);
    });
  }

  /**
   * Fetch one resource
   * @param listId user‐facing ID of the resource list
   * @param resourceId user‐facing ID of the resource
   * @returns an object with the resource’s metadata.
   * @throws if not found.
   */
  public getResource(
    listId: string,
    resourceId: string,
  ): {
    listId: string;
    resourceId: string;
    competencies: Array<{
      competenceId: string;
      name?: string;
      description?: string;
      externalQualificationNeeded: boolean;
      renewTime?: number;
      proficiencyLevel?: string;
      qualificationDates: string[];
      lastUsages: string[];
    }>;
  } {
    const row = this.db
      .prepare(
        `
          SELECT _rid, resource_id, list_id 
          FROM resource 
          WHERE resource_id = ?
          AND list_id = ?
          `,
      )
      .get(resourceId, listId) as
      | { _rid: number; resource_id: string; list_id: string }
      | undefined;
    if (!row) throw new Error(`Resource '${resourceId}' in List '${listId}' not found`);

    const comps = this.db
      .prepare(
        `
        SELECT competence_id, competence_name, competence_description,
               external_qualification_needed, renew_time,
               proficiency_level, qualification_dates, last_usages
        FROM competence
        WHERE resource_rid = ?
      `,
      )
      .all(row._rid) as CompetenceDBOutput[];

    return {
      listId: row.list_id,
      resourceId,
      competencies: comps.map((c) => ({
        competenceId: c.competence_id,
        name: c.competence_name ?? undefined,
        description: c.competence_description ?? undefined,
        externalQualificationNeeded: Boolean(c.external_qualification_needed),
        renewTime: c.renew_time ?? undefined,
        proficiencyLevel: c.proficiency_level ?? undefined,
        qualificationDates: c.qualification_dates ? JSON.parse(c.qualification_dates) : [],
        lastUsages: c.last_usages ? JSON.parse(c.last_usages) : [],
      })),
    };
  }

  /*--------------------------------------------------------------------
   * Competence Methods
   *------------------------------------------------------------------*/

  /**
   * Add a competence under a given resource.
   * @param listId user‐facing ID of the resource list
   * @param resourceId user‐facing
   * @param competence Input object (may supply its own competenceId)
   * @returns the user‐facing competenceId
   */
  public addCompetence(
    listId: string,
    resourceId: string,
    competence: {
      competenceId?: string;
      name?: string;
      description?: string;
      externalQualificationNeeded?: boolean;
      renewTime?: number;
      proficiencyLevel?: string;
      qualificationDates?: string[];
      lastUsages?: string[];
    },
  ): string {
    const cidUser = competence.competenceId ?? uuid();
    const _rid = this.getResourceRid(resourceId, listId);

    this.db
      .prepare(
        `
        INSERT INTO competence
          (competence_id, resource_rid,
           competence_name, competence_description,
           external_qualification_needed, renew_time,
           proficiency_level, qualification_dates, last_usages)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        cidUser,
        _rid,
        competence.name ?? null,
        competence.description ?? null,
        competence.externalQualificationNeeded ? 1 : 0,
        competence.renewTime ?? null,
        competence.proficiencyLevel ?? null,
        competence.qualificationDates ? JSON.stringify(competence.qualificationDates) : null,
        competence.lastUsages ? JSON.stringify(competence.lastUsages) : null,
      );

    return cidUser;
  }

  /**
   * Update a competence’s metadata.
   * @param listId user‐facing ID of the resource list
   * @param resourceId user‐facing ID of the resource
   * @param competenceId user‐facing ID of the competence to update
   * @param fields object with fields to update; only those provided will be changed
   * @returns nothing, but throws if the competence does not exist.
   * @throws if no such competence exists on the resource.
   */
  public updateCompetence(
    listId: string,
    resourceId: string,
    competenceId: string,
    fields: {
      name?: string;
      description?: string;
      externalQualificationNeeded?: boolean;
      renewTime?: number;
      proficiencyLevel?: string;
      qualificationDates?: string[];
      lastUsages?: string[];
    },
  ): void {
    const _rid = this.getResourceRid(resourceId, listId);
    const _cid = this.db
      .prepare(`SELECT _cid FROM competence WHERE competence_id = ? AND resource_rid = ?`)
      .get(competenceId, _rid)?.['_cid'];
    if (!_cid) throw new Error(`Competence '${competenceId}' not on resource '${resourceId}'`);

    const sets: string[] = [];
    const params: any[] = [];
    if (fields.name !== undefined) {
      sets.push(`competence_name = ?`);
      params.push(fields.name);
    }
    if (fields.description !== undefined) {
      sets.push(`competence_description = ?`);
      params.push(fields.description);
    }
    if (fields.externalQualificationNeeded !== undefined) {
      sets.push(`external_qualification_needed = ?`);
      params.push(fields.externalQualificationNeeded ? 1 : 0);
    }
    if (fields.renewTime !== undefined) {
      sets.push(`renew_time = ?`);
      params.push(fields.renewTime);
    }
    if (fields.proficiencyLevel !== undefined) {
      sets.push(`proficiency_level = ?`);
      params.push(fields.proficiencyLevel);
    }
    if (fields.qualificationDates !== undefined) {
      sets.push(`qualification_dates = ?`);
      params.push(JSON.stringify(fields.qualificationDates));
    }
    if (fields.lastUsages !== undefined) {
      sets.push(`last_usages = ?`);
      params.push(JSON.stringify(fields.lastUsages));
    }

    if (sets.length > 0) {
      params.push(_cid);
      this.db.prepare(`UPDATE competence SET ${sets.join(', ')} WHERE _cid = ?`).run(...params);
    }
  }

  /**
   * Delete a competence from a resource.
   * @param resourceId user‐facing ID
   * @param listId user‐facing ID of the resource list
   * @param competenceId user‐facing ID of the competence to delete
   * @throws if no such competence exists on the resource.
   */
  public deleteCompetence(listId: string, resourceId: string, competenceId: string): void {
    this.atomicStep(() => {
      const _rid = this.getResourceRid(resourceId, listId);
      const _cid = this.db
        .prepare(`SELECT _cid FROM competence WHERE competence_id = ? AND resource_rid = ?`)
        .get(competenceId, _rid)?._cid;
      if (!_cid) throw new Error(`Competence '${competenceId}' not on resource '${resourceId}'`);

      // explicitly delete embeddings
      this.db.prepare(`DELETE FROM competence_embedding WHERE cid = ?`).run(_cid);
      // then delete competence row
      this.db.prepare(`DELETE FROM competence WHERE _cid = ?`).run(_cid);
    });
  }

  /**
   * Fetch one competence’s metadata (including listId + resourceId).
   * @param listId user‐facing ID of the resource list
   * @param resourceId user‐facing ID of the resource
   * @param competenceId user‐facing ID of the competence to fetch
   * @returns an object with the competence’s metadata.
   * @throws if no such competence exists on the resource.
   * @throws if the competenceId is not found on the resource.
   */
  public getCompetence(
    listId: string,
    resourceId: string,
    competenceId: string,
  ): {
    listId: string;
    resourceId: string;
    competenceId: string;
    name?: string;
    description?: string;
    externalQualificationNeeded: boolean;
    renewTime?: number;
    proficiencyLevel?: string;
    qualificationDates: string[];
    lastUsages: string[];
  } {
    const _rid = this.getResourceRid(resourceId, listId);
    const row = this.db
      .prepare(
        `
        SELECT c.competence_id, c.competence_name, c.competence_description,
               c.external_qualification_needed, c.renew_time,
               c.proficiency_level, c.qualification_dates, c.last_usages
        FROM competence c
        WHERE c.competence_id = ? AND c.resource_rid = ?
      `,
      )
      .get(competenceId, _rid) as
      | {
          competence_id: string;
          competence_name: string | null;
          competence_description: string | null;
          external_qualification_needed: number;
          renew_time: number | null;
          proficiency_level: string | null;
          qualification_dates: string | null;
          last_usages: string | null;
        }
      | undefined;
    if (!row) throw new Error(`Competence '${competenceId}' not on resource '${resourceId}'`);

    return {
      listId,
      resourceId,
      competenceId: row.competence_id,
      name: row.competence_name ?? undefined,
      description: row.competence_description ?? undefined,
      externalQualificationNeeded: Boolean(row.external_qualification_needed),
      renewTime: row.renew_time ?? undefined,
      proficiencyLevel: row.proficiency_level ?? undefined,
      qualificationDates: row.qualification_dates ? JSON.parse(row.qualification_dates) : [],
      lastUsages: row.last_usages ? JSON.parse(row.last_usages) : [],
    };
  }

  /*--------------------------------------------------------------------
   * Embedding Methods
   *------------------------------------------------------------------*/

  /**
   * Insert or replace a text embedding for a competence.
   * This will overwrite any existing embedding for the same text and type.
   * @param embeddingInput object with competenceId, text, type, and embedding vector.
   * @throws if the embedding vector does not match the configured dimension.
   */
  public upsertEmbedding(embeddingInput: {
    listId: string;
    resourceId: string;
    competenceId: string;
    text: string;
    type: 'name' | 'description' | 'proficiencyLevel';
    embedding: number[];
  }): void {
    const { listId, resourceId, competenceId, text, type, embedding } = embeddingInput;
    if (embedding.length !== this.embeddingDim) {
      throw new Error(`Embedding must have length ${this.embeddingDim}`);
    }
    const cid = this.getCompetenceCidByCompetenceId(listId, resourceId, competenceId);

    const cidInt = `${Math.floor(cid)}`; // This + the cast is a workaround, sqlite-vec or sqlite read the cid as a float even though it is an integer. (Could be the lib or the fact that it is a virtual table, not sure)

    this.db
      .prepare(
        `
        INSERT OR REPLACE INTO competence_embedding
        (cid, text, type, embedding)
        VALUES (CAST(? AS INTEGER), ?, ?, vec_f32(?))
      `,
      )
      .run(cidInt, text, type, new Float32Array(embedding));
  }

  /** Delete all embeddings for one competence
   * @param listId user‐facing ID of the resource list
   * @param resourceId user‐facing ID of the resource
   * @param competenceId user‐facing ID of the competence
   */
  public deleteEmbeddingsForCompetence(
    listId: string,
    resourceId: string,
    competenceId: string,
  ): void {
    const cid = this.getCompetenceCidByCompetenceId(listId, resourceId, competenceId);
    this.db.prepare(`DELETE FROM competence_embedding WHERE cid = ?`).run(cid);
  }

  /**
   * kNN‐search over embeddings, returning user‐facing competenceIds + distances.
   *
   * @param embedding the query vector to search for
   * @param options optional parameters:
   *  - k: number of nearest neighbors to return (default: all)
   *  - filter: optional filter by resourceId and/or listId
   *  - similarityMetric: 'cosine', 'hamming', or 'euclidean' (default: 'cosine')
   * @returns an array of objects with competenceId, text, type, and distance.
   * @throws if the embedding length does not match the configured dimension.
   * @throws if the metric is unsupported or k is not a positive integer.
   */
  public searchEmbedding(
    embedding: number[],
    options?: {
      k?: number;
      filter?: { resourceId?: string; listId?: string };
      similarityMetric?: 'cosine' | 'hamming' | 'euclidean';
    },
  ): Array<{
    competenceId: string;
    resourceId: string;
    text: string;
    type: string;
    distance: number;
  }> {
    const { k, filter, similarityMetric } = options || {};
    const metrics = {
      cosine: 'vec_distance_cosine',
      hamming: 'vec_distance_hamming',
      euclidean: 'vec_distance_L2',
    };
    const metric = metrics[similarityMetric || 'cosine'];
    if (!metric) throw new Error(`Unsupported metric: ${similarityMetric}`);
    if (embedding.length !== this.embeddingDim) throw new Error(`Embedding length mismatch`);
    if (k !== undefined && k <= 0) throw new Error('k must be > 0');

    let sql = `
      SELECT c.competence_id, r.resource_id, ce.text, ce.type,
             ${metric}(ce.embedding, vec_f32(?)) AS distance
      FROM competence_embedding ce
      JOIN competence c    ON ce.cid = c._cid
      JOIN resource   r    ON c.resource_rid = r._rid
    `;
    const params: any[] = [new Float32Array(embedding)];

    const whereClauses: string[] = [];
    if (filter?.resourceId) {
      whereClauses.push(`r.resource_id = ?`);
      params.push(filter.resourceId);
    }
    if (filter?.listId) {
      whereClauses.push(`r.list_id = ?`);
      params.push(filter.listId);
    }
    if (whereClauses.length > 0) {
      sql += ` WHERE ` + whereClauses.join(' AND ');
    }
    // sql += ` GROUP BY c.competence_id, ce.type`;
    sql += ` ORDER BY distance ASC`;

    if (k) {
      sql += ` LIMIT ?`;
      params.push(k);
    }

    const rows = this.db.prepare(sql).all(...params) as Array<any>;

    let result = rows.map((r) => ({
      competenceId: r.competence_id,
      resourceId: r.resource_id,
      distance: r.distance,
      text: r.text,
      type: r.type,
    }));

    // Normalise distances to [0, 1], depending on the metric:
    if (similarityMetric === 'cosine') {
      // Cosine distance is in [0, 2]
      result = result.map((row) => ({
        ...row,
        distance: row.distance / 2,
      }));
    } else if (similarityMetric === 'hamming') {
      // Hamming distance is in [0, 1], so we leave it as is
    } else if (similarityMetric === 'euclidean') {
      // Euclidean distance is in [0, sqrt(embeddingDim)]
      const maxDistance = Math.sqrt(this.embeddingDim);
      result = result.map((row) => ({
        ...row,
        distance: row.distance / maxDistance,
      }));
    }

    // Since similariy is now normalised to [0, 1],
    // we need to adapt it, as it should be somewhat interpretable as a probability
    result = result.map((row) => ({
      ...row,
      distance: 1 - row.distance, // Convert distance to similarity
    }));
    return result;
  }
}

export default VectorDataBase;
