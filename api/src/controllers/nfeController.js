import NfeModel from '../models/NfeModel.js';
import nfeView from '../views/nfeView.js';

const STATUS_VALIDOS = ['Pendente', 'Autorizada', 'Não Autorizada', 'Erro'];
const TAGS_XML_OBRIGATORIAS = ['infNFe', 'ide', 'emit', 'dest', 'det', 'prod', 'total', 'ICMSTot'];

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

function escaparXml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function tagExiste(xml, tag) {
  return new RegExp(`<${tag}(\\s|>|/)`, 'i').test(xml);
}

function conteudoTag(xml, tag) {
  const match = String(xml || '').match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1].trim() : '';
}

function blocosTag(xml, tag) {
  return String(xml || '').match(new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tag}>`, 'gi')) || [];
}

function validarEstruturaXml(xml) {
  if (!xml.trim()) {
    return 'XML da NF-e e obrigatorio.';
  }

  const faltando = TAGS_XML_OBRIGATORIAS.filter((tag) => !tagExiste(xml, tag));
  if (faltando.length) {
    return `XML invalido. Tags ausentes: ${faltando.map((tag) => `<${tag}>`).join(', ')}.`;
  }

  return null;
}

function extrairNotaDoXml(xml) {
  const erroEstrutura = validarEstruturaXml(xml);
  if (erroEstrutura) {
    return { erro: erroEstrutura };
  }

  const ide = conteudoTag(xml, 'ide');
  const emit = conteudoTag(xml, 'emit');
  const dest = conteudoTag(xml, 'dest');
  const total = conteudoTag(xml, 'ICMSTot') || conteudoTag(xml, 'total');
  const itens = blocosTag(xml, 'det').map((det, index) => {
    const prod = conteudoTag(det, 'prod') || det;
    const quantidade = Number(conteudoTag(prod, 'qCom') || conteudoTag(prod, 'quantidade') || 0);
    const valorUnitario = Number(conteudoTag(prod, 'vUnCom') || conteudoTag(prod, 'valor_unitario') || 0);
    const valorTotalItem = Number(conteudoTag(prod, 'vProd') || conteudoTag(prod, 'valor_total_item') || 0);

    return {
      descricao: conteudoTag(prod, 'xProd') || conteudoTag(prod, 'descricao') || `Item ${index + 1}`,
      quantidade,
      valor_unitario: valorUnitario,
      valor_total_item: valorTotalItem
    };
  });

  return {
    nota: normalizarNota({
      numero_nf: conteudoTag(ide, 'nNF'),
      serie: conteudoTag(ide, 'serie') || conteudoTag(ide, 'serieNF') || conteudoTag(ide, 'nSerie'),
      emitente: {
        cnpj: conteudoTag(emit, 'CNPJ')
      },
      destinatario: {
        nome: conteudoTag(dest, 'xNome'),
        documento: conteudoTag(dest, 'CNPJ') || conteudoTag(dest, 'CPF')
      },
      itens,
      total_da_nota: Number(conteudoTag(total, 'vNF') || conteudoTag(total, 'total_da_nota') || 0),
      xml_original: xml
    })
  };
}

function objetoParaXml(nome, valor) {
  if (Array.isArray(valor)) {
    return valor.map((item) => objetoParaXml(nome === 'itens' ? 'item' : nome, item)).join('');
  }

  if (valor && typeof valor === 'object') {
    const filhos = Object.entries(valor)
      .filter(([chave]) => chave !== 'xml_original')
      .map(([chave, item]) => objetoParaXml(chave, item))
      .join('');
    return `<${nome}>${filhos}</${nome}>`;
  }

  return `<${nome}>${escaparXml(valor)}</${nome}>`;
}

function respostaXml(res, status, nomeRaiz, payload) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>${objetoParaXml(nomeRaiz, payload)}`;
  res.status(status).type('application/xml').send(xml);
}

function deveResponderJson(req) {
  const accept = req.get('accept') || '';
  return Boolean(
    req.responderJson ||
      req.query.formato === 'json' ||
      req.is('application/json') ||
      accept.includes('application/json')
  );
}

function responder(req, res, status, payload, nomeRaiz = 'retorno') {
  if (deveResponderJson(req)) {
    res.status(status).json(payload);
    return;
  }

  respostaXml(res, status, nomeRaiz, payload);
}

function responderErro(req, res, status, mensagem) {
  responder(req, res, status, nfeView.erro(mensagem), 'retErro');
}

function normalizarNota(body) {
  const numero = body.numero_nf || body.numero || body.numeroNota || '1';
  const destinatarioDocumento = body.destinatario?.documento || body.destinatario?.cpf || body.destinatario?.cnpj || body.destinatario_documento;
  const emitenteCnpj = body.emitente?.cnpj || body.emitente_cnpj;

  return {
    ...body,
    numero_nf: String(numero).replace(/\D/g, '').padStart(9, '0'),
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

function notaDaRequisicao(req) {
  if (typeof req.body === 'string') {
    return extrairNotaDoXml(req.body);
  }

  if (req.body?.xml || req.body?.texto) {
    return extrairNotaDoXml(String(req.body.xml || req.body.texto));
  }

  return { nota: normalizarNota(req.body || {}) };
}

function dadosEdicaoDaRequisicao(req) {
  if (typeof req.body === 'string' || req.body?.xml || req.body?.texto) {
    return notaDaRequisicao(req);
  }

  return { nota: req.body || {} };
}

async function receber(req, res, next) {
  try {
    const { nota, erro: erroXml } = notaDaRequisicao(req);
    const erro = erroXml || validarNota(nota);

    if (erro) {
      responderErro(req, res, 400, erro);
      return;
    }

    const chaveAcesso = nota.chave_acesso || gerarChaveAcesso(nota);
    const criada = await NfeModel.create({ ...nota, status: 'Pendente', chave_acesso: chaveAcesso });
    responder(req, res, 201, nfeView.recebida(criada), 'retRecepcaoNFe');
  } catch (error) {
    next(error);
  }
}

async function autorizar(req, res, next) {
  try {
    const chaveAcesso = somenteDigitos(req.params.chaveAcesso);
    const nota = await NfeModel.findByChaveAcesso(chaveAcesso);
    if (!nota) {
      responderErro(req, res, 404, 'Nota nao encontrada.');
      return;
    }

    if (nota.status !== 'Pendente') {
      responderErro(req, res, 400, 'Somente notas com status Pendente podem ser autorizadas.');
      return;
    }

    const atualizada = await NfeModel.update(nota.id, {
      ...nota,
      status: 'Autorizada',
      chave_acesso: nota.chave_acesso || chaveAcesso
    });

    responder(req, res, 200, nfeView.autorizada(atualizada), 'retAutorizacaoNFe');
  } catch (error) {
    next(error);
  }
}

async function listar(req, res, next) {
  try {
    await NfeModel.deleteOlderThan(90);
    const notas = await NfeModel.findAll();
    responder(req, res, 200, { notas }, 'retConsultaNFe');
  } catch (error) {
    next(error);
  }
}

async function editar(req, res, next) {
  try {
    const existente = await NfeModel.findById(req.params.id);
    if (!existente) {
      responderErro(req, res, 404, 'Nota nao encontrada.');
      return;
    }

    const { nota: dadosEntrada, erro: erroXml } = dadosEdicaoDaRequisicao(req);
    if (erroXml) {
      responderErro(req, res, 400, erroXml);
      return;
    }

    const nota = normalizarNota({
      ...existente,
      ...dadosEntrada,
      emitente: {
        ...(existente.emitente || {}),
        ...(dadosEntrada.emitente || {})
      },
      destinatario: {
        ...(existente.destinatario || {}),
        ...(dadosEntrada.destinatario || {})
      },
      itens: dadosEntrada.itens || existente.itens
    });
    const erro = validarNota(nota);

    if (erro) {
      responderErro(req, res, 400, erro);
      return;
    }

    const atualizada = await NfeModel.update(req.params.id, nota);
    responder(req, res, 200, nfeView.atualizada(atualizada), 'retAtualizacaoNFe');
  } catch (error) {
    next(error);
  }
}

function validarXml(req, res) {
  const xml = typeof req.body === 'string' ? req.body : String(req.body?.xml || req.body?.texto || '');
  const erro = validarEstruturaXml(xml);

  if (erro) {
    responder(req, res, 400, { valido: false, erro }, 'retValidacaoXml');
    return;
  }

  const { nota, erro: erroExtracao } = extrairNotaDoXml(xml);
  const erroNota = erroExtracao || validarNota(nota);

  if (erroNota) {
    responder(req, res, 400, { valido: false, erro: erroNota }, 'retValidacaoXml');
    return;
  }

  responder(req, res, 200, { valido: true, mensagem: 'XML da NF-e contem as tags e valores obrigatorios.' }, 'retValidacaoXml');
}

function forcarJson(handler) {
  return (req, res, next) => {
    req.responderJson = true;
    return handler(req, res, next);
  };
}

export default {
  receber,
  autorizar,
  listar,
  editar,
  validarXml,
  receberJson: forcarJson(receber),
  autorizarJson: forcarJson(autorizar),
  listarJson: forcarJson(listar),
  editarJson: forcarJson(editar),
  validarXmlJson: forcarJson(validarXml)
};
