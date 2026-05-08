<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { autorizarNota, editarNota, listarNotas, receberNota, validarXml } from './services/api';

// --- ESTADOS GERAIS ---
const notas = ref([]);
const busca = ref('');
const carregando = ref(false);
const salvando = ref(false);
const editandoId = ref(null);
const abaAtiva = ref('lista');

// --- SISTEMA DE TOASTS (NOTIFICAÇÕES FLUTUANTES) ---
const toasts = ref([]);
function notify(text, type = 'success') {
  const id = Date.now();
  toasts.value.push({ id, text, type });
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }, 4000);
}

// --- MÁSCARA ALFANUMÉRICA (CPF/CNPJ) ---
const formatarDocumento = (val) => {
  if (!val) return '';
  // Aceita letras e números para o simulador
  const limpo = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (limpo.length <= 11) {
    return limpo.replace(/(\w{3})(\w{3})(\w{3})(\w{2})/, '$1.$2.$3-$4');
  }
  return limpo.replace(/(\w{2})(\w{3})(\w{3})(\w{4})(\w{2})/, '$1.$2.$3/$4-$5');
};

const notaInicial = () => ({
  numero_nf: String(Math.floor(Math.random() * 900000) + 100000).padStart(9, '0'),
  serie: '001',
  emitente: { cnpj: '12.345.678/0001-90' },
  destinatario: { nome: '', documento: '' },
  itens: [{ descricao: '', quantidade: 1, valor_unitario: 0, valor_total_item: 0 }],
  total_da_nota: 0,
  status: 'Pendente'
});

const form = reactive(notaInicial());

// --- LÓGICA DE ITENS E CÁLCULOS ---
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
  if (form.itens.length > 1) {
    form.itens.splice(index, 1);
    recalcularTotal();
  }
}

// --- INTEGRAÇÃO COM API ---
async function carregarNotas() {
  carregando.value = true;
  try {
    notas.value = await listarNotas();
  } catch (e) {
    notify(e.message, 'danger');
  } finally {
    carregando.value = false;
  }
}

async function salvarNota() {
  if (form.total_da_nota <= 0) {
    return notify('Adicione ao menos um item com valor.', 'danger');
  }
  salvando.value = true;
  try {
    if (editandoId.value) {
      await editarNota(editandoId.value, form);
      notify('Nota fiscal atualizada com sucesso!');
    } else {
      await receberNota(form);
      notify('Nota emitida e enviada para processamento!');
    }
    cancelarEdicao();
    await carregarNotas();
  } catch (e) {
    notify(e.message, 'danger');
  } finally {
    salvando.value = false;
  }
}

async function autorizar(id) {
  try {
    await autorizarNota(id);
    notify('Nota Autorizada pela SEFAZ!');
    await carregarNotas();
  } catch (e) {
    notify(e.message, 'danger');
  }
}

// --- FUNÇÃO DE IMPRESSÃO (DANFE SIMULADA) ---
function imprimirNota(nota) {
  const win = window.open('', '_blank');
  const itensHtml = (nota.itens || []).map(i => `
    <tr>
      <td>${i.descricao}</td>
      <td>${i.quantidade}</td>
      <td>R$ ${Number(i.valor_unitario).toFixed(2)}</td>
      <td>R$ ${Number(i.valor_total_item).toFixed(2)}</td>
    </tr>
  `).join('');

  win.document.write(`
    <html>
      <head>
        <title>DANFE - ${nota.numero_nf}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; padding: 20px; }
          .border { border: 1px solid #000; padding: 10px; margin-bottom: 5px; }
          .header { text-align: center; font-weight: bold; font-size: 1.2rem; background: #f0f0f0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #000; padding: 5px; text-align: left; font-size: 11px; }
          .total { text-align: right; font-size: 1.1rem; margin-top: 15px; border-top: 2px solid #000; }
        </style>
      </head>
      <body>
        <div class="border header">DANFE - DOCUMENTO AUXILIAR DA NF-E (SIMULADOR SENAC)</div>
        <div class="border">
          <strong>EMITENTE:</strong> CNPJ: ${nota.emitente_cnpj || nota.emitente?.cnpj || 'N/A'}<br>
          <strong>NÚMERO:</strong> ${nota.numero_nf} | <strong>SÉRIE:</strong> ${nota.serie}
        </div>
        <div class="border">
          <strong>DESTINATÁRIO:</strong><br>
          NOME: ${nota.destinatario_nome || nota.destinatario?.nome}<br>
          DOC: ${nota.destinatario_documento || nota.destinatario?.documento}
        </div>
        <table>
          <thead>
            <tr><th>DESCRIÇÃO</th><th>QTD</th><th>V. UNIT</th><th>V. TOTAL</th></tr>
          </thead>
          <tbody>${itensHtml}</tbody>
        </table>
        <div class="total"><strong>VALOR TOTAL DA NOTA: R$ ${Number(nota.total_da_nota).toFixed(2)}</strong></div>
        <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body>
    </html>
  `);
  win.document.close();
}

// --- UTILITÁRIOS ---
function moeda(v) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function mudarAba(n) { abaAtiva.value = n; }
function editar(n) { 
  editandoId.value = n.id; 
  // Garante que a estrutura do form receba os dados corretamente
  Object.assign(form, {
    ...n,
    emitente: { cnpj: n.emitente_cnpj || n.emitente?.cnpj },
    destinatario: { nome: n.destinatario_nome || n.destinatario?.nome, documento: n.destinatario_documento || n.destinatario?.documento }
  });
  mudarAba('formulario'); 
}
function cancelarEdicao() { editandoId.value = null; Object.assign(form, notaInicial()); mudarAba('lista'); }

onMounted(carregarNotas);
</script>

<template>
  <main class="shell">
    <div class="toast-container">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">
        {{ t.text }}
      </div>
    </div>

    <header class="topbar">
      <div>
        <p class="eyebrow">Simulador de Processos Fiscais</p>
        <h1>SEFAZ SENAC</h1>
      </div>
      <div class="header-actions">
        <button class="secondary" @click="carregarNotas">🔄 Atualizar Sincronia</button>
        <button v-if="abaAtiva === 'lista'" @click="mudarAba('formulario')">➕ Nova Emissão</button>
      </div>
    </header>

    <nav class="tabs">
      <button :class="{ active: abaAtiva === 'lista' }" @click="mudarAba('lista')">📋 Lista de Notas</button>
      <button :class="{ active: abaAtiva === 'formulario' }" @click="mudarAba('formulario')">
        {{ editandoId ? '📝 Editando Nota' : '✍️ Formulário de Emissão' }}
      </button>
    </nav>

    <div class="content">
      <section v-if="abaAtiva === 'lista'" class="panel">
        <div v-if="carregando" class="loading-state">Obtendo dados do servidor...</div>
        <table v-else>
          <thead>
            <tr>
              <th>NF</th>
              <th>Destinatário</th>
              <th>Valor Total</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="nota in notas" :key="nota.id">
              <td><strong>{{ nota.numero_nf }}</strong></td>
              <td>{{ nota.destinatario_nome }}</td>
              <td>{{ moeda(nota.total_da_nota) }}</td>
              <td><span class="badge" :class="nota.status.toLowerCase()">{{ nota.status }}</span></td>
              <td class="actions">
                <button class="btn-icon" @click="editar(nota)" title="Editar">✏️</button>
                <button v-if="nota.status === 'Pendente'" class="btn-icon success" @click="autorizar(nota.id)" title="Autorizar">✅</button>
                <button v-if="nota.status === 'Autorizada'" class="btn-icon secondary" @click="imprimirNota(nota)" title="Imprimir DANFE">🖨️</button>
              </td>
            </tr>
            <tr v-if="!notas.length">
              <td colspan="5" class="text-center">Nenhuma nota encontrada.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-if="abaAtiva === 'formulario'" class="panel">
        <form @submit.prevent="salvarNota">
          <div class="form-header-box">
            <h3>Identificação do Destinatário</h3>
          </div>
          
          <div class="grid-form">
            <label>
              Documento (CPF/CNPJ Alfanumérico)
              <input :value="form.destinatario.documento" 
                     @input="form.destinatario.documento = formatarDocumento($event.target.value)" 
                     placeholder="Ex: ABC12345678" maxlength="18" required />
            </label>
            <label>
              Nome ou Razão Social
              <input v-model="form.destinatario.nome" required />
            </label>
          </div>

          <div class="form-header-box" style="margin-top: 30px;">
            <h3>Produtos / Itens da Nota</h3>
          </div>

          <div class="items-container">
            <div class="items-head">
              <span class="col-desc">Descrição do Produto</span>
              <span class="col-small">Qtd</span>
              <span class="col-med">Valor Unit.</span>
              <span class="col-med">Total Item</span>
              <span class="col-action"></span>
            </div>

            <div v-for="(item, index) in form.itens" :key="index" class="item-row-card">
              <input v-model="item.descricao" placeholder="Descrição do produto" class="col-desc" required />
              
              <input v-model.number="item.quantidade" type="number" step="0.01" class="col-small" @input="recalcularItem(item)" required />
              
              <input v-model.number="item.valor_unitario" type="number" step="0.01" class="col-med" @input="recalcularItem(item)" required />
              
              <div class="col-med total-item-preview">
                {{ moeda(item.valor_total_item) }}
              </div>
              
              <button type="button" class="btn-del" @click="removerItem(index)" title="Remover Item">✕</button>
            </div>

            <button type="button" class="btn-add-item" @click="adicionarItem">+ Adicionar Outro Produto</button>
          </div>

          <div class="form-actions-footer">
            <div class="total-final">
              <span>TOTAL DA NF-E</span>
              <strong>{{ moeda(form.total_da_nota) }}</strong>
            </div>
            <div class="btns">
              <button type="button" class="secondary" @click="cancelarEdicao">Cancelar</button>
              <button type="submit" class="btn-primary" :disabled="salvando">
                {{ salvando ? 'Processando...' : (editandoId ? 'Atualizar Nota' : 'Emitir Nota Fiscal') }}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  </main>
</template>

<style scoped>
/* NOTIFICAÇÕES TOAST */
.toast-container { position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; }
.toast { padding: 15px 25px; border-radius: 8px; color: white; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: slideRight 0.4s ease; }
.toast.success { background: #2ecc71; border-left: 6px solid #27ae60; }
.toast.danger { background: #e74c3c; border-left: 6px solid #c0392b; }
@keyframes slideRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

/* ESTRUTURA GERAL */
.shell { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: 'Inter', sans-serif; }
.topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.topbar h1 { margin: 0; color: #2c3e50; font-size: 1.8rem; }
.eyebrow { font-size: 0.7rem; text-transform: uppercase; color: #95a5a6; font-weight: bold; margin: 0; }

/* TABS */
.tabs { display: flex; gap: 5px; }
.tabs button { padding: 12px 20px; border: 1px solid #ddd; background: #f8f9fa; cursor: pointer; border-radius: 8px 8px 0 0; color: #7f8c8d; font-weight: bold; }
.tabs button.active { background: #fff; border-bottom: 2px solid #fff; color: #3498db; border-top: 3px solid #3498db; }

/* CONTEÚDO */
.content { background: #fff; border: 1px solid #ddd; border-radius: 0 8px 8px 8px; padding: 25px; box-shadow: 0 4px 10px rgba(0,0,0,0.03); }
.panel { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* FORMULÁRIO */
.form-header-box { border-bottom: 1px solid #eee; margin-bottom: 15px; }
.form-header-box h3 { font-size: 1rem; color: #34495e; margin-bottom: 8px; }
.grid-form { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
label { display: flex; flex-direction: column; gap: 6px; font-weight: bold; font-size: 0.85rem; color: #2c3e50; }
input { padding: 10px; border: 1px solid #ced4da; border-radius: 6px; font-size: 1rem; transition: border 0.2s; }
input:focus { border-color: #3498db; outline: none; }

/* LISTA DE ITENS */
.items-container { background: #fdfdfd; border: 1px solid #eee; padding: 15px; border-radius: 8px; }
.items-head { display: flex; gap: 10px; padding: 0 10px 8px; font-weight: bold; font-size: 0.75rem; color: #95a5a6; text-transform: uppercase; }
.item-row-card { display: flex; gap: 10px; align-items: center; background: #fff; border: 1px solid #eee; padding: 8px 12px; border-radius: 6px; margin-bottom: 8px; }
.col-desc { flex: 3; }
.col-small { flex: 0.7; text-align: center; }
.col-med { flex: 1.2; }
.total-item-preview { background: #f8f9fa; padding: 10px; border-radius: 4px; font-weight: bold; color: #27ae60; text-align: right; }
.btn-del { background: #fff1f0; color: #ff4d4f; border: 1px solid #ffa39e; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; }
.btn-add-item { width: 100%; padding: 10px; background: none; border: 2px dashed #d9d9d9; color: #3498db; font-weight: bold; cursor: pointer; margin-top: 10px; border-radius: 6px; }
.btn-add-item:hover { background: #f0f7ff; border-color: #3498db; }

/* FOOTER FORM */
.form-actions-footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; display: flex; justify-content: space-between; align-items: center; }
.total-final { display: flex; flex-direction: column; }
.total-final span { font-size: 0.75rem; color: #7f8c8d; font-weight: bold; }
.total-final strong { font-size: 1.8rem; color: #2ecc71; }
.btns { display: flex; gap: 10px; }

/* BOTÕES E BADGES */
button { padding: 10px 20px; border-radius: 6px; border: none; font-weight: bold; cursor: pointer; transition: 0.2s; }
.btn-primary { background: #3498db; color: #fff; }
.secondary { background: #e9ecef; color: #495057; }
.btn-icon { padding: 8px 12px; margin-right: 4px; background: #f8f9fa; border: 1px solid #dee2e6; }
.btn-icon.success { color: #27ae60; border-color: #27ae60; }
.badge { padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; text-transform: uppercase; }
.autorizada { background: #e6fffa; color: #319795; }
.pendente { background: #fffaf0; color: #dd6b20; }

/* TABELA */
table { width: 100%; border-collapse: collapse; }
th { text-align: left; padding: 12px; font-size: 0.8rem; color: #95a5a6; border-bottom: 2px solid #eee; }
td { padding: 12px; border-bottom: 1px solid #f8f9fa; font-size: 0.9rem; }
.text-center { text-align: center; padding: 40px; color: #95a5a6; }
</style>