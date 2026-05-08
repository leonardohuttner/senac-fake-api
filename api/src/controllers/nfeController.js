import NfeModel from '../models/NfeModel.js';
import nfeView from '../views/nfeView.js';

const STATUS_VALIDOS = ['Pendente', 'Autorizada', 'Não Autorizada', 'Erro'];

function somenteDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function validarDocumento(documento) {
  const digitos = somenteDigitos(documento);
  return digitos.length === 11 || digitos.length === 14;
}

function arredondar(valor) {
  return Math.round(Number(valor) * 100) / 100;
}

function normalizarNota(body) {
  const numero = body.numero_nf || body.numero || body.numeroNota || '1';
  const destinatarioDocumento = body.destinatario?.documento || body.destinatario?.cpf || body.destinatario?.cnpj || body.destinatario_documento;
  const emitenteCnpj = body.emitente?.cnpj || body.emitente_cnpj;

  return {
    ...body,
    numero_nf: String(numero).padStart(9, '0'),
    emitente: {
      ...(body.emitente || {}),
      cnpj: somenteDigitos(emitenteCnpj)
    },
    destinatario: {
      ...(body.destinatario || {}),
      nome: body.destinatario?.nome || body.destinatario_nome || '',
      documento: somenteDigitos(destinatarioDocumento)
    },
    itens: Array.isArray(body.itens) ? body.itens : [],
    total_da_nota: Number(body.total_da_nota ?? body.valor_total ?? 0),
    status: body.status || 'Pendente',
    chave_acesso: body.chave_acesso || null
  };
}

function validarNota(nota) {
  if (!nota.emitente.cnpj || somenteDigitos(nota.emitente.cnpj).length !== 14) {
    return 'CNPJ do emitente deve conter 14 digitos.';
  }

  if (!validarDocumento(nota.destinatario.documento)) {
    return 'Documento do destinatario deve ser CPF com 11 digitos ou CNPJ com 14 digitos.';
  }

  if (!nota.destinatario.nome) {
    return 'Nome do destinatario e obrigatorio.';
  }

  if (!nota.itens.length) {
    return 'A nota deve possuir pelo menos um item.';
  }

  for (const [index, item] of nota.itens.entries()) {
    const quantidade = Number(item.quantidade);
    const valorUnitario = Number(item.valor_unitario);
    const valorTotalItem = Number(item.valor_total_item);

    if ([quantidade, valorUnitario, valorTotalItem].some((valor) => Number.isNaN(valor))) {
      return `Item ${index + 1}: quantidade, valor_unitario e valor_total_item devem ser numericos.`;
    }

    if (arredondar(quantidade * valorUnitario) !== arredondar(valorTotalItem)) {
      return `Item ${index + 1}: quantidade * valor_unitario nao bate com valor_total_item.`;
    }
  }

  const somaItens = nota.itens.reduce((total, item) => total + Number(item.valor_total_item), 0);
  if (arredondar(somaItens) !== arredondar(nota.total_da_nota)) {
    return 'A soma dos itens nao bate com o total_da_nota.';
  }

  if (!STATUS_VALIDOS.includes(nota.status)) {
    return `Status invalido. Use: ${STATUS_VALIDOS.join(', ')}.`;
  }

  return null;
}

function calcularDigitoVerificador(chave43) {
  const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
  let soma = 0;
  let pesoIndex = 0;

  for (let i = chave43.length - 1; i >= 0; i -= 1) {
    soma += Number(chave43[i]) * pesos[pesoIndex];
    pesoIndex = (pesoIndex + 1) % pesos.length;
  }

  const resto = soma % 11;
  const dv = 11 - resto;
  return dv >= 10 ? 0 : dv;
}

function gerarChaveAcesso(nota) {
  const uf = '43';
  const agora = new Date();
  const aamm = `${String(agora.getFullYear()).slice(-2)}${String(agora.getMonth() + 1).padStart(2, '0')}`;
  const cnpj = somenteDigitos(nota.emitente.cnpj).padStart(14, '0').slice(0, 14);
  const modelo = '55';
  const serie = String(nota.serie || '1').padStart(3, '0').slice(-3);
  const numero = String(nota.numero_nf || '1').replace(/\D/g, '').padStart(9, '0').slice(-9);
  const tipo = '1';
  const random = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  const chave43 = `${uf}${aamm}${cnpj}${modelo}${serie}${numero}${tipo}${random}`;
  return `${chave43}${calcularDigitoVerificador(chave43)}`;
}

async function receber(req, res, next) {
  try {
    const nota = normalizarNota(req.body);
    const erro = validarNota(nota);

    if (erro) {
      res.status(400).json(nfeView.erro(erro));
      return;
    }

    const criada = await NfeModel.create({ ...nota, status: 'Pendente' });
    res.status(201).json(nfeView.recebida(criada));
  } catch (error) {
    next(error);
  }
}

async function autorizar(req, res, next) {
  try {
    const nota = await NfeModel.findById(req.params.id);
    if (!nota) {
      res.status(404).json(nfeView.erro('Nota nao encontrada.'));
      return;
    }

    if (nota.status !== 'Pendente') {
      res.status(400).json(nfeView.erro('Somente notas com status Pendente podem ser autorizadas.'));
      return;
    }

    const atualizada = await NfeModel.update(req.params.id, {
      ...nota,
      status: 'Autorizada',
      chave_acesso: gerarChaveAcesso(nota)
    });

    res.json(nfeView.autorizada(atualizada));
  } catch (error) {
    next(error);
  }
}

async function listar(req, res, next) {
  try {
    await NfeModel.deleteOlderThan(90);
    const notas = await NfeModel.findAll();
    res.json(notas);
  } catch (error) {
    next(error);
  }
}

async function editar(req, res, next) {
  try {
    const existente = await NfeModel.findById(req.params.id);
    if (!existente) {
      res.status(404).json(nfeView.erro('Nota nao encontrada.'));
      return;
    }

    const nota = normalizarNota({
      ...existente,
      ...req.body,
      emitente: {
        ...(existente.emitente || {}),
        ...(req.body.emitente || {})
      },
      destinatario: {
        ...(existente.destinatario || {}),
        ...(req.body.destinatario || {})
      },
      itens: req.body.itens || existente.itens
    });
    const erro = validarNota(nota);

    if (erro) {
      res.status(400).json(nfeView.erro(erro));
      return;
    }

    const atualizada = await NfeModel.update(req.params.id, nota);
    res.json(nfeView.atualizada(atualizada));
  } catch (error) {
    next(error);
  }
}

function validarXml(req, res) {
  const xml = String(req.body?.xml || req.body?.texto || '');
  const tags = ['infNFe', 'emit', 'dest'];
  const faltando = tags.filter((tag) => !new RegExp(`<${tag}[\\s>]`, 'i').test(xml));

  if (faltando.length) {
    res.status(400).json({
      valido: false,
      erro: `XML invalido. Tags ausentes: ${faltando.map((tag) => `<${tag}>`).join(', ')}.`
    });
    return;
  }

  res.json({ valido: true, mensagem: 'XML contem as tags obrigatorias.' });
}

export default {
  receber,
  autorizar,
  listar,
  editar,
  validarXml
};
