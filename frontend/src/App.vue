<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import AppHeader from './components/AppHeader.vue';
import AppTabs from './components/AppTabs.vue';
import DashboardView from './components/DashboardView.vue';
import NotaForm from './components/NotaForm.vue';
import NotasTable from './components/NotasTable.vue';
import ToastContainer from './components/ToastContainer.vue';
import { autorizarNota, cancelarNota, editarNota, listarNotas, receberNota } from './services/api';
import { imprimirDanfe } from './utils/danfe';
import { nomeNota, normalizarNotaParaForm, notaInicial } from './utils/nfe';

const notas = ref([]);
const busca = ref('');
const carregando = ref(false);
const salvando = ref(false);
const editandoId = ref(null);
const abaAtiva = ref('dashboard');
const toasts = ref([]);
const form = reactive(notaInicial());

const notasFiltradas = computed(() => {
  const termo = busca.value.trim().toLowerCase();
  if (!termo) return notas.value;

  return notas.value.filter((nota) => [
    nota.numero_nf,
    nota.chave_acesso,
    nota.destinatario_nome,
    nota.destinatario?.nome,
    nota.status
  ].some((valor) => String(valor || '').toLowerCase().includes(termo)));
});

const estatisticas = computed(() => {
  const total = notas.value.reduce((soma, nota) => soma + Number(nota.total_da_nota || 0), 0);

  return {
    totalNotas: notas.value.length,
    pendentes: notas.value.filter((nota) => nota.status === 'Pendente').length,
    autorizadas: notas.value.filter((nota) => nota.status === 'Autorizada').length,
    canceladas: notas.value.filter((nota) => nota.status === 'Cancelada').length,
    valorTotal: total
  };
});

const ultimasNotas = computed(() => notas.value.slice(0, 8));
const notasPendentes = computed(() => notas.value.filter((nota) => nota.status === 'Pendente').slice(0, 6));

function notify(text, type = 'success') {
  const id = Date.now();
  toasts.value.push({ id, text, type });
  setTimeout(() => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  }, 4000);
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
  form.itens.push({ descricao: '', quantidade: 1, valor_unitario: 0, valor_total_item: 0 });
}

function removerItem(index) {
  if (form.itens.length === 1) return;
  form.itens.splice(index, 1);
  recalcularTotal();
}

function aplicarNotaNoForm(nota) {
  Object.assign(form, normalizarNotaParaForm(nota));
  recalcularTotal();
}

async function carregarNotas() {
  carregando.value = true;
  try {
    const resposta = await listarNotas();
    notas.value = Array.isArray(resposta) ? resposta : resposta.notas || [];
  } catch (error) {
    notify(error.message, 'danger');
  } finally {
    carregando.value = false;
  }
}

async function salvarNota() {
  if (form.total_da_nota <= 0) {
    notify('Adicione ao menos um item com valor.', 'danger');
    return;
  }

  salvando.value = true;
  try {
    if (editandoId.value) {
      await editarNota(editandoId.value, form);
      notify('Nota fiscal atualizada.');
    } else {
      await receberNota(form);
      notify('Nota enviada para recepcao.');
    }
    cancelarEdicao();
    await carregarNotas();
  } catch (error) {
    notify(error.message, 'danger');
  } finally {
    salvando.value = false;
  }
}

async function autorizar(nota) {
  if (!nota.chave_acesso) {
    notify('Esta nota ainda nao tem chave de acesso. Reenvie ou edite a nota para gerar uma nova.', 'danger');
    return;
  }

  try {
    await autorizarNota(nota.chave_acesso);
    notify('Nota autorizada pela chave de acesso.');
    await carregarNotas();
  } catch (error) {
    notify(error.message, 'danger');
  }
}

async function cancelar(nota) {
  if (!nota.chave_acesso) {
    notify('Esta nota ainda nao tem chave de acesso.', 'danger');
    return;
  }

  const justificativa = window.prompt('Justificativa do cancelamento:', 'Cancelamento solicitado pelo usuario.');
  if (justificativa === null) return;

  try {
    await cancelarNota(nota.chave_acesso, justificativa || 'Cancelamento solicitado pelo usuario.');
    notify(`NF ${nota.numero_nf} cancelada. Protocolo de cancelamento gerado.`);
    await carregarNotas();
  } catch (error) {
    notify(error.message, 'danger');
  }
}

function editar(nota) {
  editandoId.value = nota.id;
  aplicarNotaNoForm(nota);
  abaAtiva.value = 'formulario';
}

function cancelarEdicao() {
  editandoId.value = null;
  Object.assign(form, notaInicial());
  abaAtiva.value = 'dashboard';
}

function novaNota() {
  editandoId.value = null;
  Object.assign(form, notaInicial());
  abaAtiva.value = 'formulario';
}

function imprimirNota(nota) {
  imprimirDanfe(nota, () => notify(`O navegador bloqueou a impressao da NF ${nota.numero_nf} de ${nomeNota(nota)}.`, 'danger'));
}

onMounted(carregarNotas);
</script>

<template>
  <main class="shell">
    <ToastContainer :toasts="toasts" />
    <AppHeader @refresh="carregarNotas" @new-note="novaNota" />
    <AppTabs :active="abaAtiva" :editing="Boolean(editandoId)" @change="abaAtiva = $event" />

    <DashboardView
      v-if="abaAtiva === 'dashboard'"
      :estatisticas="estatisticas"
      :ultimas-notas="ultimasNotas"
      :notas-pendentes="notasPendentes"
      :carregando="carregando"
      @authorize="autorizar"
    />

    <NotasTable
      v-if="abaAtiva === 'lista'"
      v-model:busca="busca"
      :notas="notasFiltradas"
      @edit="editar"
      @authorize="autorizar"
      @cancel="cancelar"
      @print="imprimirNota"
    />

    <NotaForm
      v-if="abaAtiva === 'formulario'"
      :form="form"
      :editing="Boolean(editandoId)"
      :saving="salvando"
      @submit="salvarNota"
      @cancel="cancelarEdicao"
      @add-item="adicionarItem"
      @remove-item="removerItem"
      @recalculate-item="recalcularItem"
    />
  </main>
</template>
