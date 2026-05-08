import { cnpjEmitente, documentoNota, formatarData, nomeEmitente, nomeNota } from './nfe';

function html(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function barcodeSvg(valor) {
  const chave = String(valor || '').replace(/\D/g, '').padEnd(44, '0').slice(0, 44);
  let x = 8;
  const barras = [];

  for (const digito of chave) {
    const largura = 1 + (Number(digito) % 4);
    barras.push(`<rect x="${x}" y="4" width="${largura}" height="44"></rect>`);
    x += largura + 2;
    barras.push(`<rect x="${x}" y="4" width="1" height="44"></rect>`);
    x += 3;
  }

  return `<svg viewBox="0 0 ${x + 8} 58" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Codigo de barras da chave de acesso da NF-e"><rect width="100%" height="100%" fill="#fff"/>${barras.join('')}</svg>`;
}

export function imprimirDanfe(nota, onBlocked) {
  const win = window.open('', '_blank');
  if (!win) {
    onBlocked?.();
    return;
  }

  const destinatario = nota.destinatario || {};
  const protocoloAutorizacao = nota.protocolo_autorizacao;
  const protocoloCancelamento = nota.protocolo_cancelamento;
  const chave = nota.chave_acesso || '';

  const itensHtml = (nota.itens || []).map((item) => `
    <tr>
      <td style="width: 8%;">${html(item.codigo || '001')}</td>
      <td style="width: 32%;">${html(item.descricao)}</td>
      <td style="width: 10%;">00000000</td>
      <td style="width: 5%;">000</td>
      <td style="width: 5%;">5.102</td>
      <td style="width: 5%;">UN</td>
      <td style="width: 5%;">${html(item.quantidade)}</td>
      <td style="width: 10%;">${Number(item.valor_unitario).toFixed(2)}</td>
      <td style="width: 10%;">${Number(item.valor_total_item).toFixed(2)}</td>
      <td style="width: 5%;">12,00</td>
    </tr>
  `).join('');

  const cancelamentoHtml = protocoloCancelamento ? `
    <div class="watermark">NF-e CANCELADA</div>
    <table class="footer-table">
      <tr>
        <td>
          <span class="label">PROTOCOLO DE CANCELAMENTO</span>
          <span class="value">${html(protocoloCancelamento.numero)} - ${html(formatarData(protocoloCancelamento.data))}</span>
        </td>
        <td>
          <span class="label">JUSTIFICATIVA</span>
          <span class="value">${html(nota.justificativa_cancelamento || 'Cancelamento solicitado.')}</span>
        </td>
      </tr>
    </table>
  ` : '';

  win.document.write(`
    <html>
      <head>
        <title>DANFE - ${html(nota.numero_nf)}</title>
        <style>
          @page { size: portrait; margin: 1cm; }
          body { font-family: Helvetica, Arial, sans-serif; margin: 0; padding: 0; color: #000; font-size: 9px; }
          .container { width: 100%; }
          table { width: 100%; border-collapse: collapse; margin-bottom: -1px; }
          td, th { border: 1px solid #000; padding: 2px 4px; vertical-align: top; text-transform: uppercase; }
          .label { font-size: 7px; display: block; font-weight: bold; }
          .value { font-size: 10px; display: block; min-height: 12px; }
          .bold { font-weight: bold; }
          .header-danfe { font-size: 14px; text-align: center; line-height: 1.2; }
          .barcode svg { display: block; height: 52px; width: 100%; }
          .footer-table { margin-top: 5px; }
          .watermark { border: 2px solid #000; font-size: 18px; font-weight: bold; margin: 8px 0 4px; padding: 8px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <table>
            <tr>
              <td style="width: 80%;">
                <span class="label">RECEBEMOS DE ${html(nomeEmitente(nota))} OS PRODUTOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO</span>
                <div style="display:flex; margin-top:5px;">
                  <div style="width: 20%;"><span class="label">DATA DE RECEBIMENTO</span></div>
                  <div style="width: 80%;"><span class="label">IDENTIFICACAO E ASSINATURA DO RECEBEDOR</span></div>
                </div>
              </td>
              <td style="width: 20%; text-align: center;">
                <span class="bold">NF-e</span><br>
                <span class="bold" style="font-size:12px;">No ${html(nota.numero_nf)}</span><br>
                <span class="label">SERIE 1</span>
              </td>
            </tr>
          </table>

          <table style="margin-top: 5px;">
            <tr>
              <td style="width: 35%; text-align: center;">
                <div style="padding: 10px;">
                  <strong style="font-size: 16px;">LOGOTIPO</strong><br>
                  <span>${html(nomeEmitente(nota))}</span><br>
                  <span>CNPJ ${html(cnpjEmitente(nota))}</span>
                </div>
              </td>
              <td style="width: 20%;" class="header-danfe">
                <span class="bold">DANFE</span><br>
                <span>Documento Auxiliar da Nota Fiscal Eletronica</span><br>
                <div style="display:flex; justify-content: space-around; margin-top:5px;">
                  <span>0 - Entrada<br>1 - Saida</span>
                  <span style="border: 1px solid #000; padding: 5px; font-size: 14px;">1</span>
                </div>
                <br>
                <span class="bold">No ${html(nota.numero_nf)}</span><br>
                <span>SERIE: 1</span>
              </td>
              <td style="width: 45%;">
                <span class="label">CONTROLE DO FISCO</span>
                <div class="barcode">${barcodeSvg(chave)}</div>
                <span class="label">CHAVE DE ACESSO</span>
                <span class="value" style="font-size: 9px;">${html(chave || '0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000')}</span>
                <span class="label" style="text-align: center; margin-top:5px;">Consulta de autenticidade no portal nacional da NF-e</span>
              </td>
            </tr>
          </table>

          <table>
            <tr>
              <td style="width: 65%;"><span class="label">NATUREZA DA OPERACAO</span><span class="value">VENDA DE MERCADORIA</span></td>
              <td style="width: 35%;"><span class="label">PROTOCOLO DE AUTORIZACAO DE USO</span><span class="value">${html(protocoloAutorizacao?.numero || 'SEM PROTOCOLO')} - ${html(formatarData(protocoloAutorizacao?.data))}</span></td>
            </tr>
          </table>

          <div style="margin-top: 5px; font-weight: bold;">DESTINATARIO / REMETENTE</div>
          <table>
            <tr>
              <td style="width: 60%;"><span class="label">NOME / RAZAO SOCIAL</span><span class="value">${html(nomeNota(nota))}</span></td>
              <td style="width: 25%;"><span class="label">CNPJ / CPF</span><span class="value">${html(documentoNota(nota))}</span></td>
              <td style="width: 15%;"><span class="label">DATA EMISSAO</span><span class="value">${html(formatarData(nota.data_criacao))}</span></td>
            </tr>
            <tr>
              <td><span class="label">ENDERECO</span><span class="value">${html(destinatario.endereco || '')}</span></td>
              <td><span class="label">MUNICIPIO / UF</span><span class="value">${html([destinatario.cidade, destinatario.uf].filter(Boolean).join(' / '))}</span></td>
              <td><span class="label">CEP</span><span class="value">${html(destinatario.cep || '')}</span></td>
            </tr>
          </table>

          <div style="margin-top: 5px; font-weight: bold;">CALCULO DO IMPOSTO</div>
          <table>
            <tr>
              <td><span class="label">BASE CALC. ICMS</span><span class="value">R$ ${Number(nota.total_da_nota).toFixed(2)}</span></td>
              <td><span class="label">VALOR ICMS</span><span class="value">R$ ${(nota.total_da_nota * 0.12).toFixed(2)}</span></td>
              <td><span class="label">VALOR DO FRETE</span><span class="value">0,00</span></td>
              <td><span class="label">VALOR TOTAL DA NOTA</span><span class="value">R$ ${Number(nota.total_da_nota).toFixed(2)}</span></td>
            </tr>
          </table>

          <div style="margin-top: 5px; font-weight: bold;">TRANSPORTADOR / VOLUMES TRANSPORTADOS</div>
          <table>
            <tr>
              <td style="width: 40%;"><span class="label">RAZAO SOCIAL</span><span class="value">TRANSPORTES VALDEMAR</span></td>
              <td style="width: 10%;"><span class="label">FRETE POR CONTA</span><span class="value">0-Emitente</span></td>
              <td style="width: 20%;"><span class="label">PLACA DO VEICULO</span><span class="value">ABC-1234</span></td>
              <td style="width: 10%;"><span class="label">UF</span><span class="value">RS</span></td>
              <td style="width: 20%;"><span class="label">CNPJ/CPF</span><span class="value">00.000.000/0000-00</span></td>
            </tr>
          </table>

          <div style="margin-top: 5px; font-weight: bold;">DADOS DOS PRODUTOS / SERVICOS</div>
          <table>
            <thead>
              <tr style="background: #f2f2f2;">
                <th>CODIGO</th>
                <th>DESCRICAO</th>
                <th>NCM</th>
                <th>CST</th>
                <th>CFOP</th>
                <th>UN</th>
                <th>QTD</th>
                <th>V.UNIT</th>
                <th>V.TOTAL</th>
                <th>%ICMS</th>
              </tr>
            </thead>
            <tbody>${itensHtml}</tbody>
          </table>

          <div style="margin-top: 5px; font-weight: bold;">DADOS ADICIONAIS</div>
          <table style="height: 60px;">
            <tr>
              <td style="width: 50%;"><span class="label">INFORMACOES COMPLEMENTARES</span><span class="value">EXEMPLO DE NOTA PARA FINS DIDATICOS - SIMULADOR SENAC.</span></td>
              <td style="width: 50%;"><span class="label">RESERVADO AO FISCO</span></td>
            </tr>
          </table>

          <table class="footer-table">
            <tr>
              <td>
                <span class="label">PROTOCOLO DE AUTORIZACAO</span>
                <span class="value">${html(protocoloAutorizacao?.numero || 'SEM PROTOCOLO')} - ${html(formatarData(protocoloAutorizacao?.data))}</span>
              </td>
              <td>
                <span class="label">CHAVE DE ACESSO</span>
                <span class="value">${html(chave)}</span>
              </td>
            </tr>
          </table>
          ${cancelamentoHtml}
        </div>
        <script>
          window.onload = () => {
            window.focus();
            window.print();
          }
        <\/script>
      </body>
    </html>
  `);
  win.document.close();
}
