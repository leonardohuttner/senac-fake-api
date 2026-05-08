import { createClient } from '@libsql/client';

const databaseUrl = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({
  url: databaseUrl,
  authToken
});

async function run(sql, params = []) {
  const result = await client.execute({
    sql,
    args: params
  });

  return {
    id: result.lastInsertRowid ? Number(result.lastInsertRowid) : null,
    changes: result.rowsAffected
  };
}

async function get(sql, params = []) {
  const result = await client.execute({
    sql,
    args: params
  });

  return result.rows[0] || null;
}

async function all(sql, params = []) {
  const result = await client.execute({
    sql,
    args: params
  });

  return result.rows;
}

async function initializeDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS notas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_nf TEXT NOT NULL,
      chave_acesso TEXT,
      destinatario_nome TEXT NOT NULL,
      destinatario_documento TEXT NOT NULL,
      emitente_cnpj TEXT NOT NULL,
      total_da_nota REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pendente',
      dados_json TEXT NOT NULL,
      data_criacao TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

export {
  client,
  run,
  get,
  all,
  initializeDatabase
};
