export const EMITENTE_PADRAO = 'Senac Comercio Educativo LTDA';

export function notaInicial() {
  return {
    numero_nf: String(Math.floor(Math.random() * 900000) + 100000).padStart(9, '0'),
    serie: '001',
    emitente: { nome: EMITENTE_PADRAO, cnpj: '12.345.678/0001-90' },
    destinatario: { nome: '', documento: '', endereco: '', cidade: '', uf: '', cep: '' },
    itens: [{ descricao: '', quantidade: 1, valor_unitario: 0, valor_total_item: 0 }],
    total_da_nota: 0,
    status: 'Pendente'
  };
}

export function moeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function documentoNota(nota) {
  return nota.destinatario_documento || nota.destinatario?.documento || '';
}

export function nomeNota(nota) {
  return nota.destinatario_nome || nota.destinatario?.nome || 'Sem destinatario';
}

export function nomeEmitente(nota) {
  return nota.emitente?.nome || nota.emitente_nome || EMITENTE_PADRAO;
}

export function cnpjEmitente(nota) {
  return nota.emitente_cnpj || nota.emitente?.cnpj || '';
}

export function statusClass(status) {
  if (status === 'Autorizada') return 'autorizada';
  if (status === 'Cancelada') return 'cancelada';
  return 'pendente';
}

export function chaveCurta(chave) {
  if (!chave) return 'Sem chave';
  return `${String(chave).slice(0, 8)}...${String(chave).slice(-6)}`;
}

export function formatarDocumento(valor) {
  return String(valor || '').replace(/\D/g, '').slice(0, 14);
}

export function formatarCep(valor) {
  return String(valor || '').replace(/\D/g, '').slice(0, 8);
}

export function formatarData(valor) {
  if (!valor) return '';
  return new Date(valor).toLocaleString('pt-BR');
}

export function normalizarNotaParaForm(nota) {
  return {
    ...notaInicial(),
    ...nota,
    emitente: {
      nome: nota.emitente?.nome || nota.emitente_nome || EMITENTE_PADRAO,
      cnpj: nota.emitente_cnpj || nota.emitente?.cnpj || '12.345.678/0001-90'
    },
    destinatario: {
      nome: nota.destinatario_nome || nota.destinatario?.nome || '',
      documento: nota.destinatario_documento || nota.destinatario?.documento || '',
      endereco: nota.destinatario?.endereco || nota.destinatario_endereco || '',
      cidade: nota.destinatario?.cidade || nota.destinatario_cidade || '',
      uf: nota.destinatario?.uf || nota.destinatario_uf || '',
      cep: nota.destinatario?.cep || nota.destinatario_cep || ''
    },
    itens: (nota.itens || []).map((item) => ({ ...item }))
  };
}
