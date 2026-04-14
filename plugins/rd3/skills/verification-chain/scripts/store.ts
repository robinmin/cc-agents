/**
 * verification-chain — SQLite-backed chain state store
 *
 * Provides durable persistence for ChainState using SQLite (bun:sqlite).
 * The store keeps both the aggregate chain JSON and normalized records for
 * chains, nodes, evidence, and pause/resume checkpoints.
 */

import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import type { ChainManifest, ChainState, NodeExecutionState } from "./types";
import { logger } from "../../../scripts/logger";

let _db: Database | null = null;
let _dbPath: string | null = null;
let _dbTable: string | null = null;

const DEFAULT_TABLE_NAME = "chain_state";

export interface ChainRecord {
  chain_id: string;
  task_wbs: string;
  chain_name: string;
  status: string;
  current_node: string;
  created_at: string;
  updated_at: string;
  paused_at: string | null;
  paused_node: string | null;
  paused_response: string | null;
  global_retry: string | null;
  state: string;
  manifest: string | null;
}

export interface NodeRecord {
  chain_id: string;
  task_wbs: string;
  node_name: string;
  ordinal: number;
  type: string;
  status: string;
  maker_status: string;
  checker_status: string;
  checker_result: string | null;
  maker_output: string | null;
  maker_error: string | null;
  started_at: string | null;
  completed_at: string | null;
  parallel_children: string | null;
  node_json: string;
}

export interface EvidenceRecord {
  chain_id: string;
  task_wbs: string;
  node_name: string;
  evidence_index: number;
  method: string;
  result: string;
  timestamp: string;
  evidence_json: string;
}

export interface CheckpointRecord {
  chain_id: string;
  task_wbs: string;
  status: string;
  current_node: string;
  paused_at: string | null;
  paused_node: string | null;
  paused_response: string | null;
  updated_at: string;
}

interface TableNames {
  chain: string;
  nodes: string;
  evidence: string;
  checkpoints: string;
}

function resolveStoreTableName(): string {
  const configuredName = process.env.COV_STORE_TABLE?.trim() ?? DEFAULT_TABLE_NAME;
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(configuredName)) {
    throw new Error(
      `Invalid COV_STORE_TABLE value "${configuredName}". Expected an SQL identifier matching [A-Za-z_][A-Za-z0-9_]*.`,
    );
  }
  return configuredName;
}

function q(identifier: string): string {
  return `"${identifier}"`;
}

function tableNames(): TableNames {
  const base = resolveStoreTableName();
  return {
    chain: base,
    nodes: `${base}_nodes`,
    evidence: `${base}_evidence`,
    checkpoints: `${base}_checkpoints`,
  };
}

function ddl(names: TableNames): string {
  return `
CREATE TABLE IF NOT EXISTS ${q(names.chain)} (
  chain_id TEXT NOT NULL,
  task_wbs TEXT NOT NULL,
  chain_name TEXT NOT NULL,
  status TEXT NOT NULL,
  current_node TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  paused_at TEXT,
  paused_node TEXT,
  paused_response TEXT,
  global_retry TEXT,
  state TEXT NOT NULL,
  manifest TEXT,
  PRIMARY KEY (chain_id, task_wbs)
);

CREATE TABLE IF NOT EXISTS ${q(names.nodes)} (
  chain_id TEXT NOT NULL,
  task_wbs TEXT NOT NULL,
  node_name TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  maker_status TEXT NOT NULL,
  checker_status TEXT NOT NULL,
  checker_result TEXT,
  maker_output TEXT,
  maker_error TEXT,
  started_at TEXT,
  completed_at TEXT,
  parallel_children TEXT,
  node_json TEXT NOT NULL,
  PRIMARY KEY (chain_id, task_wbs, node_name)
);

CREATE TABLE IF NOT EXISTS ${q(names.evidence)} (
  chain_id TEXT NOT NULL,
  task_wbs TEXT NOT NULL,
  node_name TEXT NOT NULL,
  evidence_index INTEGER NOT NULL,
  method TEXT NOT NULL,
  result TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  PRIMARY KEY (chain_id, task_wbs, node_name, evidence_index)
);

CREATE TABLE IF NOT EXISTS ${q(names.checkpoints)} (
  chain_id TEXT NOT NULL,
  task_wbs TEXT NOT NULL,
  status TEXT NOT NULL,
  current_node TEXT NOT NULL,
  paused_at TEXT,
  paused_node TEXT,
  paused_response TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (chain_id, task_wbs)
);
`;
}

export function resolveStorePath(stateDir: string): string {
  const configuredPath = process.env.COV_STORE_PATH?.trim();
  if (!configuredPath) {
    return join(stateDir, "cov", "cov-store.db");
  }
  // :memory:// is a valid in-memory SQLite path — pass it through directly
  if (configuredPath === ':memory:' || configuredPath === 'file::memory:') {
    return ':memory:';
  }

  return isAbsolute(configuredPath) ? configuredPath : join(stateDir, configuredPath);
}

function getDb(stateDir: string): Database {
  const resolvedPath = resolveStorePath(stateDir);
  const resolvedTable = resolveStoreTableName();
  if (_db && _dbPath === resolvedPath && _dbTable === resolvedTable) {
    return _db;
  }

  if (_db) {
    const previousDb = _db;
    try {
      _db = null;
      _dbPath = null;
      _dbTable = null;
      previousDb.close();
    } catch {
      // ignore close errors during handle rotation
    }
  }

  const names = tableNames();
  let db: Database;
  try {
    // Skip mkdir for in-memory databases
    if (resolvedPath !== ':memory:') {
      mkdirSync(dirname(resolvedPath), { recursive: true });
    }
    db = new Database(resolvedPath, { create: true });
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA busy_timeout = 5000");
    db.exec("PRAGMA foreign_keys = ON");
    db.exec(ddl(names));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to open chain store at ${resolvedPath}: ${message}`);
  }

  _db = db;
  _dbPath = resolvedPath;
  _dbTable = resolvedTable;
  return db;
}

export function openStore(stateDir: string): Database {
  return getDb(stateDir);
}

export function closeStore(): void {
  if (_db) {
    try {
      _db.close();
    } catch {
      // ignore
    }
    _db = null;
    _dbPath = null;
    _dbTable = null;
  }
}

function serializeNodeRecord(
  state: ChainState,
  node: NodeExecutionState,
  ordinal: number,
): NodeRecord {
  return {
    chain_id: state.chain_id,
    task_wbs: state.task_wbs,
    node_name: node.name,
    ordinal,
    type: node.type,
    status: node.status,
    maker_status: node.maker_status,
    checker_status: node.checker_status,
    checker_result: node.checker_result ?? null,
    maker_output: node.maker_output ?? null,
    maker_error: node.maker_error ?? null,
    started_at: node.started_at ?? null,
    completed_at: node.completed_at ?? null,
    parallel_children: node.parallel_children ? JSON.stringify(node.parallel_children) : null,
    node_json: JSON.stringify(node),
  };
}

function serializeEvidenceRecords(
  state: ChainState,
  node: NodeExecutionState,
): EvidenceRecord[] {
  return node.evidence.map((evidence, evidenceIndex) => ({
    chain_id: state.chain_id,
    task_wbs: state.task_wbs,
    node_name: node.name,
    evidence_index: evidenceIndex,
    method: evidence.method,
    result: evidence.result,
    timestamp: evidence.timestamp,
    evidence_json: JSON.stringify(evidence),
  }));
}

function serializeChainRecord(state: ChainState, manifestJson: string | null): ChainRecord {
  return {
    chain_id: state.chain_id,
    task_wbs: state.task_wbs,
    chain_name: state.chain_name,
    status: state.status,
    current_node: state.current_node,
    created_at: state.created_at,
    updated_at: state.updated_at,
    paused_at: state.paused_at ?? null,
    paused_node: state.paused_node ?? null,
    paused_response: state.paused_response ?? null,
    global_retry: state.global_retry ? JSON.stringify(state.global_retry) : null,
    state: JSON.stringify(state),
    manifest: manifestJson,
  };
}

function serializeCheckpointRecord(state: ChainState): CheckpointRecord {
  return {
    chain_id: state.chain_id,
    task_wbs: state.task_wbs,
    status: state.status,
    current_node: state.current_node,
    paused_at: state.paused_at ?? null,
    paused_node: state.paused_node ?? null,
    paused_response: state.paused_response ?? null,
    updated_at: state.updated_at,
  };
}

export function loadChainRecord(stateDir: string, chainId: string, taskWbs: string): ChainRecord | null {
  const db = getDb(stateDir);
  const names = tableNames();
  return db
    .prepare(`SELECT * FROM ${q(names.chain)} WHERE chain_id = ? AND task_wbs = ?`)
    .get(chainId, taskWbs) as ChainRecord | null;
}

export function listNodeRecords(stateDir: string, chainId: string, taskWbs: string): NodeRecord[] {
  const db = getDb(stateDir);
  const names = tableNames();
  return db
    .prepare(`SELECT * FROM ${q(names.nodes)} WHERE chain_id = ? AND task_wbs = ? ORDER BY ordinal`)
    .all(chainId, taskWbs) as NodeRecord[];
}

export function listEvidenceRecords(stateDir: string, chainId: string, taskWbs: string): EvidenceRecord[] {
  const db = getDb(stateDir);
  const names = tableNames();
  return db
    .prepare(
      `SELECT * FROM ${q(names.evidence)} WHERE chain_id = ? AND task_wbs = ? ORDER BY node_name, evidence_index`,
    )
    .all(chainId, taskWbs) as EvidenceRecord[];
}

export function loadCheckpoint(stateDir: string, chainId: string, taskWbs: string): CheckpointRecord | null {
  const db = getDb(stateDir);
  const names = tableNames();
  return db
    .prepare(`SELECT * FROM ${q(names.checkpoints)} WHERE chain_id = ? AND task_wbs = ?`)
    .get(chainId, taskWbs) as CheckpointRecord | null;
}

export function loadChain(stateDir: string, chainId: string, taskWbs: string): ChainState | null {
  const row = loadChainRecord(stateDir, chainId, taskWbs);
  if (!row) {
    return null;
  }
  return JSON.parse(row.state) as ChainState;
}

export function loadChainById(stateDir: string, chainId: string): ChainState | null {
  const db = getDb(stateDir);
  const names = tableNames();
  const row = db
    .prepare(`SELECT state FROM ${q(names.chain)} WHERE chain_id = ? ORDER BY updated_at DESC LIMIT 1`)
    .get(chainId) as { state: string } | null;
  if (!row) {
    return null;
  }
  return JSON.parse(row.state) as ChainState;
}

export function findChainsById(stateDir: string, chainId: string): ChainState[] {
  const db = getDb(stateDir);
  const names = tableNames();
  const rows = db
    .prepare(`SELECT state FROM ${q(names.chain)} WHERE chain_id = ? ORDER BY updated_at DESC`)
    .all(chainId) as Array<{ state: string }>;
  return rows.map((row) => JSON.parse(row.state) as ChainState);
}

export function saveChain(stateDir: string, state: ChainState, manifest?: unknown): void {
  const db = getDb(stateDir);
  const names = tableNames();
  const manifestJson = manifest ? JSON.stringify(manifest) : null;
  const chainRecord = serializeChainRecord(state, manifestJson);
  const checkpointRecord = serializeCheckpointRecord(state);
  const nodeRecords = state.nodes.map((node, ordinal) => serializeNodeRecord(state, node, ordinal));
  const evidenceRecords = state.nodes.flatMap((node) => serializeEvidenceRecords(state, node));

  const persist = db.transaction(() => {
    db.prepare(
      `INSERT INTO ${q(names.chain)} (
        chain_id, task_wbs, chain_name, status, current_node,
        created_at, updated_at, paused_at, paused_node, paused_response,
        global_retry, state, manifest
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(chain_id, task_wbs) DO UPDATE SET
        chain_name = excluded.chain_name,
        status = excluded.status,
        current_node = excluded.current_node,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        paused_at = excluded.paused_at,
        paused_node = excluded.paused_node,
        paused_response = excluded.paused_response,
        global_retry = excluded.global_retry,
        state = excluded.state,
        manifest = COALESCE(excluded.manifest, ${q(names.chain)}.manifest)`,
    ).run(
      chainRecord.chain_id,
      chainRecord.task_wbs,
      chainRecord.chain_name,
      chainRecord.status,
      chainRecord.current_node,
      chainRecord.created_at,
      chainRecord.updated_at,
      chainRecord.paused_at,
      chainRecord.paused_node,
      chainRecord.paused_response,
      chainRecord.global_retry,
      chainRecord.state,
      chainRecord.manifest,
    );

    db.prepare(`DELETE FROM ${q(names.nodes)} WHERE chain_id = ? AND task_wbs = ?`).run(
      state.chain_id,
      state.task_wbs,
    );
    db.prepare(`DELETE FROM ${q(names.evidence)} WHERE chain_id = ? AND task_wbs = ?`).run(
      state.chain_id,
      state.task_wbs,
    );

    const insertNode = db.prepare(
      `INSERT INTO ${q(names.nodes)} (
        chain_id, task_wbs, node_name, ordinal, type, status,
        maker_status, checker_status, checker_result, maker_output,
        maker_error, started_at, completed_at, parallel_children, node_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const nodeRecord of nodeRecords) {
      insertNode.run(
        nodeRecord.chain_id,
        nodeRecord.task_wbs,
        nodeRecord.node_name,
        nodeRecord.ordinal,
        nodeRecord.type,
        nodeRecord.status,
        nodeRecord.maker_status,
        nodeRecord.checker_status,
        nodeRecord.checker_result,
        nodeRecord.maker_output,
        nodeRecord.maker_error,
        nodeRecord.started_at,
        nodeRecord.completed_at,
        nodeRecord.parallel_children,
        nodeRecord.node_json,
      );
    }

    const insertEvidence = db.prepare(
      `INSERT INTO ${q(names.evidence)} (
        chain_id, task_wbs, node_name, evidence_index, method, result, timestamp, evidence_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const evidenceRecord of evidenceRecords) {
      insertEvidence.run(
        evidenceRecord.chain_id,
        evidenceRecord.task_wbs,
        evidenceRecord.node_name,
        evidenceRecord.evidence_index,
        evidenceRecord.method,
        evidenceRecord.result,
        evidenceRecord.timestamp,
        evidenceRecord.evidence_json,
      );
    }

    db.prepare(
      `INSERT INTO ${q(names.checkpoints)} (
        chain_id, task_wbs, status, current_node, paused_at, paused_node, paused_response, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(chain_id, task_wbs) DO UPDATE SET
        status = excluded.status,
        current_node = excluded.current_node,
        paused_at = excluded.paused_at,
        paused_node = excluded.paused_node,
        paused_response = excluded.paused_response,
        updated_at = excluded.updated_at`,
    ).run(
      checkpointRecord.chain_id,
      checkpointRecord.task_wbs,
      checkpointRecord.status,
      checkpointRecord.current_node,
      checkpointRecord.paused_at,
      checkpointRecord.paused_node,
      checkpointRecord.paused_response,
      checkpointRecord.updated_at,
    );
  });

  persist();
  logger.debug(`Saved chain state for ${state.chain_id}/${state.task_wbs}`);
}

export function loadManifestById(stateDir: string, chainId: string): ChainManifest | null {
  const db = getDb(stateDir);
  const names = tableNames();
  const row = db
    .prepare(`SELECT manifest FROM ${q(names.chain)} WHERE chain_id = ? ORDER BY updated_at DESC LIMIT 1`)
    .get(chainId) as { manifest: string | null } | null;
  if (!row?.manifest) {
    return null;
  }
  return JSON.parse(row.manifest) as ChainManifest;
}

export function loadManifest(stateDir: string, chainId: string, taskWbs: string): ChainManifest | null {
  const row = loadChainRecord(stateDir, chainId, taskWbs);
  if (!row?.manifest) {
    return null;
  }
  return JSON.parse(row.manifest) as ChainManifest;
}

export function listChains(stateDir: string, taskWbs?: string): ChainState[] {
  const db = getDb(stateDir);
  const names = tableNames();
  const rows = taskWbs
    ? (db
        .prepare(`SELECT state FROM ${q(names.chain)} WHERE task_wbs = ? ORDER BY updated_at DESC`)
        .all(taskWbs) as Array<{ state: string }>)
    : (db.prepare(`SELECT state FROM ${q(names.chain)} ORDER BY updated_at DESC`).all() as Array<{
        state: string;
      }>);

  return rows.map((row) => JSON.parse(row.state) as ChainState);
}
