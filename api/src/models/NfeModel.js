import { all, get, run } from '../config/database.js';

function toRowPayload(nota) {
  return {
    numero_nf: String(nota.numero_nf),
    chave_acesso: nota.chave_acesso || null,
    destinatario_nome: nota.destinatario?.nome || nota.destinatario_nome,
    destinatario_documento: nota.destinatario?.documento || nota.destinatario?.cpf || nota.destinatario?.cnpj || nota.destinatario_documento,
    emitente_cnpj: nota.emitente?.cnpj || nota.emitente_cnpj,
    total_da_nota: Number(nota.total_da_nota),
    status: nota.status || 'Pendente',
    dados_json: JSON.stringify(nota)
  };
}

function parseRow(row) {
  if (!row) {
    return null;
  }

  const dados = JSON.parse(row.dados_json);
  return {
    ...dados,
    id: row.id,
    numero_nf: row.numero_nf,
    chave_acesso: row.chave_acesso,
    destinatario_nome: row.destinatario_nome,
    destinatario_documento: row.destinatario_documento,
    emitente_cnpj: row.emitente_cnpj,
    total_da_nota: row.total_da_nota,
    status: row.status,
    data_criacao: row.data_criacao
  };
}

async function create(nota) {
  const payload = toRowPayload(nota);
  const result = await run(
    `INSERT INTO notas (
      numero_nf,
      chave_acesso,
      destinatario_nome,
      destinatario_documento,
      emitente_cnpj,
      total_da_nota,
      status,
      dados_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.numero_nf,
      payload.chave_acesso,
      payload.destinatario_nome,
      payload.destinatario_documento,
      payload.emitente_cnpj,
      payload.total_da_nota,
      payload.status,
      payload.dados_json
    ]
  );

  return findById(result.id);
}

async function findAll() {
  const rows = await all('SELECT * FROM notas ORDER BY id DESC');
  return rows.map(parseRow);
}

async function findById(id) {
  const row = await get('SELECT * FROM notas WHERE id = ?', [id]);
  return parseRow(row);
}

async function update(id, nota) {
  const payload = toRowPayload(nota);
  await run(
    `UPDATE notas
      SET numero_nf = ?,
          chave_acesso = ?,
          destinatario_nome = ?,
          destinatario_documento = ?,
          emitente_cnpj = ?,
          total_da_nota = ?,
          status = ?,
          dados_json = ?
      WHERE id = ?`,
    [
      payload.numero_nf,
      payload.chave_acesso,
      payload.destinatario_nome,
      payload.destinatario_documento,
      payload.emitente_cnpj,
      payload.total_da_nota,
      payload.status,
      payload.dados_json,
      id
    ]
  );

  return findById(id);
}

async function deleteOlderThan(days) {
  return run("DELETE FROM notas WHERE data_criacao < datetime('now', ?)", [`-${days} days`]);
}

export default {
  create,
  findAll,
  findById,
  update,
  deleteOlderThan
};
