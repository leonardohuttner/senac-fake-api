# SEFAZ SENAC

Simulador educacional de ambiente SEFAZ para emissao de NF-e, dividido em:

- `backend`: Node.js, Express, SQLite e MVC.
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

## Endpoints

### `POST /nfe/receber`

Recebe os dados da nota, valida CPF/CNPJ, totais dos itens e total da nota. Quando tudo esta correto, salva a nota com status `Pendente` e retorna o ID de recibo.

Exemplo:

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

### `POST /nfe/autorizar/:id`

Autoriza uma nota pendente e gera uma chave de acesso com 44 caracteres:

`[UF][AAMM][CNPJ][MOD][SERIE][NUMERO][TIPO][RANDOM][DV]`

### `GET /nfe`

Lista todas as notas. Antes de retornar, remove automaticamente do SQLite as notas com mais de 30 dias.

### `PUT /nfe/:id`

Permite editar os dados da nota e alterar manualmente o status para testes.

### `POST /nfe/validar-xml`

Valida se um texto XML contem as tags `<infNFe>`, `<emit>` e `<dest>`.

```json
{
  "xml": "<infNFe><emit></emit><dest></dest></infNFe>"
}
```

## Banco de dados

O SQLite fica em `backend/database.sqlite`. A tabela `notas` e criada automaticamente na inicializacao do servidor.
