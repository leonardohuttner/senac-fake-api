<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { autorizarNota, editarNota, listarNotas, receberNota, validarXml } from './services/api';

const notas = ref([]);
const busca = ref('');
const carregando = ref(false);
const salvando = ref(false);
const mensagem = ref('');
const erro = ref('');
const editandoId = ref(null);
const xmlTexto = ref('');
const xmlResultado = ref('');

const notaInicial = () => ({
  numero_nf: '000000001',
  serie: '001',
  emitente: {
    cnpj: '12345678000190'
  },
  destinatario: {
    nome: '',
    documento: ''
  },
  itens: [
    {
      descricao: 'Servico educacional',
      quantidade: 1,
      valor_unitario: 100,
      valor_total_item: 100
    }
  ],
  total_da_nota: 100,
  status: 'Pendente'
});

const form = reactive(notaInicial());

const notasFiltradas = computed(() => {
  const termo = busca.value.replace(/\D/g, '') || busca.value.toLowerCase();
  if (!termo) {
    return notas.value;
  }

  return notas.value.filter((nota) => {
    const documento = String(nota.destinatario_documento || nota.destinatario?.documento || '');
    const numero = String(nota.numero_nf || '');
    return documento.includes(termo) || numero.includes(termo);
  });
});

function statusClass(status) {
  const normalizado = String(status || '').toLowerCase();
  if (normalizado === 'autorizada') {
    return 'status-ok';
  }
  if (normalizado === 'pendente') {
    return 'status-wait';
  }
  return 'status-error';
}

function moeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function limparAlertas() {
  mensagem.value = '';
  erro.value = '';
}

function substituirForm(nota) {
  Object.assign(form, notaInicial(), {
    ...nota,
    emitente: {
      cnpj: nota.emitente?.cnpj || nota.emitente_cnpj || ''
    },
    destinatario: {
      nome: nota.destinatario?.nome || nota.destinatario_nome || '',
      documento: nota.destinatario?.documento || nota.destinatario_documento || ''
    },
    itens: nota.itens?.length ? nota.itens.map((item) => ({ ...item })) : notaInicial().itens
  });
}

function recalcularItem(item) {
  item.valor_total_item = Number((Number(item.quantidade || 0) * Number(item.valor_unitario || 0)).toFixed(2));
  recalcularTotal();
}

function recalcularTotal() {
  form.total_da_nota = Number(
    form.itens.reduce((total, item) => total + Number(item.valor_total_item || 0), 0).toFixed(2)
  );
}

function adicionarItem() {
  form.itens.push({
    descricao: '',
    quantidade: 1,
    valor_unitario: 0,
    valor_total_item: 0
  });
}

function removerItem(index) {
  if (form.itens.length === 1) {
    return;
  }

  form.itens.splice(index, 1);
  recalcularTotal();
}

async function carregarNotas() {
  carregando.value = true;
  limparAlertas();

  try {
    notas.value = await listarNotas();
  } catch (error) {
    erro.value = error.message;
  } finally {
    carregando.value = false;
  }
}

async function salvarNota() {
  salvando.value = true;
  limparAlertas();

  try {
    if (editandoId.value) {
      await editarNota(editandoId.value, form);
      mensagem.value = 'Nota atualizada com sucesso.';
    } else {
      await receberNota(form);
      mensagem.value = 'Nota enviada para a SEFAZ simulada.';
    }

    cancelarEdicao();
    await carregarNotas();
  } catch (error) {
    erro.value = error.message;
  } finally {
    salvando.value = false;
  }
}

function editar(nota) {
  limparAlertas();
  editandoId.value = nota.id;
  substituirForm(nota);
}

function cancelarEdicao() {
  editandoId.value = null;
  substituirForm(notaInicial());
}

async function autorizar(id) {
  limparAlertas();

  try {
    await autorizarNota(id);
    mensagem.value = 'Nota autorizada e chave de acesso gerada.';
    await carregarNotas();
  } catch (error) {
    erro.value = error.message;
  }
}

async function enviarXml() {
  limparAlertas();
  xmlResultado.value = '';

  try {
    const resposta = await validarXml(xmlTexto.value);
    xmlResultado.value = resposta.mensagem;
  } catch (error) {
    erro.value = error.message;
  }
}

onMounted(carregarNotas);
</script>

<template>
  <main class="shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">Simulador educacional</p>
        <h1>SEFAZ SENAC</h1>
      </div>
      <button class="secondary" type="button" @click="carregarNotas">Atualizar</button>
    </header>

    <section class="summary">
      <div>
        <span>Total de notas</span>
        <strong>{{ notas.length }}</strong>
      </div>
      <div>
        <span>Autorizadas</span>
        <strong>{{ notas.filter((nota) => nota.status === 'Autorizada').length }}</strong>
      </div>
      <div>
        <span>Pendentes</span>
        <strong>{{ notas.filter((nota) => nota.status === 'Pendente').length }}</strong>
      </div>
    </section>

    <p v-if="mensagem" class="alert success">{{ mensagem }}</p>
    <p v-if="erro" class="alert danger">{{ erro }}</p>

    <div class="workspace">
      <section class="panel table-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Gestao</p>
            <h2>Notas fiscais</h2>
          </div>
          <input v-model="busca" type="search" placeholder="Buscar por CNPJ/CPF ou numero" />
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Numero</th>
                <th>Chave de acesso</th>
                <th>Destinatario</th>
                <th>Total</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="carregando">
                <td colspan="6">Carregando notas...</td>
              </tr>
              <tr v-else-if="!notasFiltradas.length">
                <td colspan="6">Nenhuma nota encontrada.</td>
              </tr>
              <tr v-for="nota in notasFiltradas" :key="nota.id">
                <td>{{ nota.numero_nf }}</td>
                <td class="key">{{ nota.chave_acesso || 'Aguardando autorizacao' }}</td>
                <td>
                  <strong>{{ nota.destinatario_nome }}</strong>
                  <span>{{ nota.destinatario_documento }}</span>
                </td>
                <td>{{ moeda(nota.total_da_nota) }}</td>
                <td><span class="status" :class="statusClass(nota.status)">{{ nota.status }}</span></td>
                <td class="actions">
                  <button type="button" class="secondary" @click="editar(nota)">Editar</button>
                  <button type="button" :disabled="nota.status !== 'Pendente'" @click="autorizar(nota.id)">
                    Autorizar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <aside class="panel form-panel">
        <div class="panel-heading compact">
          <div>
            <p class="eyebrow">{{ editandoId ? 'Edicao' : 'Emissao' }}</p>
            <h2>{{ editandoId ? 'Editar NF-e' : 'Nova NF-e' }}</h2>
          </div>
          <button v-if="editandoId" class="secondary" type="button" @click="cancelarEdicao">Cancelar</button>
        </div>

        <form @submit.prevent="salvarNota">
          <label>
            Numero da NF
            <input v-model="form.numero_nf" required />
          </label>
          <label>
            Serie
            <input v-model="form.serie" required />
          </label>
          <label>
            CNPJ do emitente
            <input v-model="form.emitente.cnpj" inputmode="numeric" required />
          </label>
          <label>
            Nome do destinatario
            <input v-model="form.destinatario.nome" required />
          </label>
          <label>
            CPF ou CNPJ do destinatario
            <input v-model="form.destinatario.documento" inputmode="numeric" required />
          </label>
          <label>
            Status manual
            <select v-model="form.status">
              <option>Pendente</option>
              <option>Autorizada</option>
              <option>Não Autorizada</option>
              <option>Erro</option>
            </select>
          </label>

          <div class="items-header">
            <h3>Itens</h3>
            <button class="secondary" type="button" @click="adicionarItem">Adicionar</button>
          </div>

          <div v-for="(item, index) in form.itens" :key="index" class="item-row">
            <input v-model="item.descricao" placeholder="Descricao" />
            <input v-model.number="item.quantidade" type="number" min="0" step="0.01" @input="recalcularItem(item)" />
            <input v-model.number="item.valor_unitario" type="number" min="0" step="0.01" @input="recalcularItem(item)" />
            <input v-model.number="item.valor_total_item" type="number" min="0" step="0.01" @input="recalcularTotal" />
            <button class="icon-danger" type="button" @click="removerItem(index)">Remover</button>
          </div>

          <label>
            Total da nota
            <input v-model.number="form.total_da_nota" type="number" min="0" step="0.01" required />
          </label>

          <button type="submit" :disabled="salvando">{{ salvando ? 'Salvando...' : 'Salvar NF-e' }}</button>
        </form>

        <div class="xml-box">
          <h3>Validador XML</h3>
          <textarea v-model="xmlTexto" rows="5" placeholder="<infNFe><emit></emit><dest></dest></infNFe>"></textarea>
          <button class="secondary" type="button" @click="enviarXml">Validar XML</button>
          <p v-if="xmlResultado" class="xml-result">{{ xmlResultado }}</p>
        </div>
      </aside>
    </div>
  </main>
</template>
