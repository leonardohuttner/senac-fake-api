function recebida(nota) {
  return {
    mensagem: 'NF-e recebida com sucesso.',
    recibo: nota.id,
    nota
  };
}

function autorizada(nota) {
  return {
    mensagem: 'NF-e autorizada.',
    nota
  };
}

function atualizada(nota) {
  return {
    mensagem: 'NF-e atualizada.',
    nota
  };
}

function erro(mensagem) {
  return {
    erro: mensagem
  };
}

export default {
  recebida,
  autorizada,
  atualizada,
  erro
};
