# SEFAZ SENAC

Simulador educacional de ambiente SEFAZ para emissao de NF-e, dividido em:

- `api`: Node.js, Express, SQLite/libSQL e MVC.
- `frontend`: Vue.js 3 com Vite.

## Como rodar

```bash
npm run install:all
npm run dev:backend
npm run dev:frontend
```

URLs padrao:

- API: `http://localhost:3000`
- Dashboard: `http://localhost:5173`

## Formatos

As rotas principais simulam a SEFAZ e aceitam XML por padrao. O banco continua retrocompativel: XML e JSON sao normalizados para o mesmo formato salvo em `dados_json` na tabela `notas`.

Para simular um ERP ou integracao mais simples, use as rotas JSON em `/api/nfe/json`.

## Endpoints XML

### `POST /api/nfe/receber`

Recebe uma NF-e em XML, valida tags basicas do padrao NF-e (`infNFe`, `ide`, `emit`, `dest`, `det`, `prod`, `total`, `ICMSTot`), CNPJ/CPF, itens e total da nota. Quando tudo esta correto, salva a nota com status `Pendente` e retorna XML.

Exemplo:

```xml
<?xml version="1.0"?>
<NFe>
  <infNFe>
    <ide>
      <serie>1</serie>
      <nNF>1</nNF>
    </ide>
    <emit>
      <CNPJ>12345678000190</CNPJ>
    </emit>
    <dest>
      <CPF>12345678901</CPF>
      <xNome>Aluno SENAC</xNome>
    </dest>
    <det>
      <prod>
        <xProd>Servico educacional</xProd>
        <qCom>2</qCom>
        <vUnCom>50</vUnCom>
        <vProd>100</vProd>
      </prod>
    </det>
    <total>
      <ICMSTot>
        <vNF>100</vNF>
      </ICMSTot>
    </total>
  </infNFe>
</NFe>
```

### `POST /api/nfe/autorizar/:chaveAcesso`

Autoriza uma nota pendente pela chave de acesso de 44 caracteres e retorna XML. A chave e gerada na recepcao da NF-e, antes da autorizacao, para simular a consulta/operacao por chave em vez do ID interno do banco.

### `GET /api/nfe`

Lista as notas em XML. Antes de retornar, remove automaticamente as notas com mais de 90 dias.

### `PUT /api/nfe/:id`

Edita uma nota usando XML ou JSON e retorna no formato solicitado.

### `POST /api/nfe/validar-xml`

Valida estrutura e valores basicos de uma NF-e em XML.

## Endpoints JSON

As rotas JSON mantem o formato antigo da API:

- `POST /api/nfe/json/receber`
- `POST /api/nfe/json/autorizar/:chaveAcesso`
- `GET /api/nfe/json`
- `PUT /api/nfe/json/:id`
- `POST /api/nfe/json/validar-xml`

Exemplo JSON:

```json
{
  "numero_nf": "000000001",
  "serie": "001",
  "emitente": {
    "cnpj": "12345678000190"
  },
  "destinatario": {
    "nome": "Aluno SENAC",
    "documento": "12345678901"
  },
  "itens": [
    {
      "descricao": "Servico educacional",
      "quantidade": 2,
      "valor_unitario": 50,
      "valor_total_item": 100
    }
  ],
  "total_da_nota": 100
}
```

## Banco de dados

O banco local padrao fica em `api/local.db`, ou em `TURSO_DATABASE_URL` quando essa variavel estiver configurada. A tabela `notas` e criada automaticamente na inicializacao do servidor.
