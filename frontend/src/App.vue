<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { autorizarNota, editarNota, listarNotas, receberNota } from './services/api';

const notas = ref([]);
const busca = ref('');
const carregando = ref(false);
const salvando = ref(false);
const editandoId = ref(null);
const abaAtiva = ref('dashboard');
const toasts = ref([]);

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
  const pendentes = notas.value.filter((nota) => nota.status === 'Pendente').length;
  const autorizadas = notas.value.filter((nota) => nota.status === 'Autorizada').length;

  return {
    totalNotas: notas.value.length,
    pendentes,
    autorizadas,
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

function moeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function documentoNota(nota) {
  return nota.destinatario_documento || nota.destinatario?.documento || '';
}

function nomeNota(nota) {
  return nota.destinatario_nome || nota.destinatario?.nome || 'Sem destinatario';
}

function chaveCurta(chave) {
  if (!chave) return 'Sem chave';
  return `${String(chave).slice(0, 8)}...${String(chave).slice(-6)}`;
}

function formatarDocumento(valor) {
  return String(valor || '').replace(/\D/g, '').slice(0, 14);
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
  Object.assign(form, {
    ...notaInicial(),
    ...nota,
    emitente: { cnpj: nota.emitente_cnpj || nota.emitente?.cnpj || '12.345.678/0001-90' },
    destinatario: {
      nome: nota.destinatario_nome || nota.destinatario?.nome || '',
      documento: nota.destinatario_documento || nota.destinatario?.documento || ''
    },
    itens: (nota.itens || []).map((item) => ({ ...item }))
  });
  recalcularTotal();
}

function preencherExemplo(exemplo) {
  editandoId.value = null;
  aplicarNotaNoForm({
    ...notaInicial(),
    ...exemplo.nota,
    numero_nf: notaInicial().numero_nf
  });
  abaAtiva.value = 'formulario';
}

async function lancarExemplo(exemplo) {
  salvando.value = true;
  try {
    const nota = {
      ...notaInicial(),
      ...exemplo.nota,
      numero_nf: notaInicial().numero_nf,
      total_da_nota: exemplo.nota.itens.reduce((total, item) => total + Number(item.valor_total_item), 0)
    };
    await receberNota(nota);
    notify(`Exemplo "${exemplo.nome}" lancado.`);
    await carregarNotas();
    abaAtiva.value = 'dashboard';
  } catch (error) {
    notify(error.message, 'danger');
  } finally {
    salvando.value = false;
  }
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

function imprimirNota(nota) {
  const win = window.open('', '_blank');
  const itensHtml = (nota.itens || []).map((item) => `
    <tr>
      <td>${item.descricao}</td>
      <td>${item.quantidade}</td>
      <td>R$ ${Number(item.valor_unitario).toFixed(2)}</td>
      <td>R$ ${Number(item.valor_total_item).toFixed(2)}</td>
    </tr>
  `).join('');

  win.document.write(`
    <html>
      <head>
        <title>DANFE - ${nota.numero_nf}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #111827; }
          .border { border: 1px solid #111827; padding: 10px; margin-bottom: 6px; }
          .header { text-align: center; font-weight: 700; font-size: 1.1rem; background: #f3f4f6; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #111827; padding: 6px; text-align: left; font-size: 12px; }
          .total { text-align: right; font-size: 1.1rem; margin-top: 15px; border-top: 2px solid #111827; padding-top: 8px; }
          .key { overflow-wrap: anywhere; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="border header">DANFE - DOCUMENTO AUXILIAR DA NF-E (SIMULADOR SENAC)</div>
        <div class="border">
          <strong>NF:</strong> ${nota.numero_nf} | <strong>SERIE:</strong> ${nota.serie || '001'}<br>
          <strong>CHAVE:</strong> <span class="key">${nota.chave_acesso || 'N/A'}</span><br>
          <strong>EMITENTE:</strong> ${nota.emitente_cnpj || nota.emitente?.cnpj || 'N/A'}
        </div>
        <div class="border">
          <strong>DESTINATARIO:</strong> ${nomeNota(nota)}<br>
          <strong>DOCUMENTO:</strong> ${documentoNota(nota)}
        </div>
        <table>
          <thead>
            <tr><th>DESCRICAO</th><th>QTD</th><th>V. UNIT</th><th>V. TOTAL</th></tr>
          </thead>
          <tbody>${itensHtml}</tbody>
        </table>
        <div class="total"><strong>VALOR TOTAL: R$ ${Number(nota.total_da_nota).toFixed(2)}</strong></div>
        <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body>
    </html>
  `);
  win.document.close();
}

onMounted(carregarNotas);
</script>

<template>
  <main class="shell">
    <div class="toast-container">
      <div v-for="toast in toasts" :key="toast.id" class="toast" :class="toast.type">
        {{ toast.text }}
      </div>
    </div>

    <header class="topbar">
      <div>
        <p class="eyebrow">Simulador de processos fiscais</p>
        <h1>SEFAZ SENAC</h1>
      </div>
      <div class="header-actions">
        <button class="secondary" @click="carregarNotas">Atualizar</button>
        <button @click="abaAtiva = 'formulario'">Nova emissao</button>
      </div>
    </header>

    <nav class="tabs" aria-label="Navegacao principal">
      <button :class="{ active: abaAtiva === 'dashboard' }" @click="abaAtiva = 'dashboard'">Dashboard</button>
      <button :class="{ active: abaAtiva === 'lista' }" @click="abaAtiva = 'lista'">Notas</button>
      <button :class="{ active: abaAtiva === 'formulario' }" @click="abaAtiva = 'formulario'">
        {{ editandoId ? 'Editar NF-e' : 'Emitir NF-e' }}
      </button>
      <button :class="{ active: abaAtiva === 'exemplos' }" @click="abaAtiva = 'exemplos'">Exemplos</button>
    </nav>

    <section v-if="abaAtiva === 'dashboard'" class="dashboard">
      <div class="metric-grid">
        <article class="metric">
          <span>Notas recebidas</span>
          <strong>{{ estatisticas.totalNotas }}</strong>
        </article>
        <article class="metric warn">
          <span>Pendentes</span>
          <strong>{{ estatisticas.pendentes }}</strong>
        </article>
        <article class="metric ok">
          <span>Autorizadas</span>
          <strong>{{ estatisticas.autorizadas }}</strong>
        </article>
        <article class="metric value">
          <span>Valor movimentado</span>
          <strong>{{ moeda(estatisticas.valorTotal) }}</strong>
        </article>
      </div>

      <div class="dashboard-grid">
        <section class="panel broadcast">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Recepcao em tempo real</p>
              <h2>Ultimas NF-e recebidas</h2>
            </div>
            <span v-if="carregando" class="loading-pill">Sincronizando</span>
          </div>

          <div v-if="!ultimasNotas.length" class="empty-state">
            Nenhuma NF-e recebida ainda.
          </div>

          <article v-for="nota in ultimasNotas" :key="nota.id" class="feed-row">
            <div>
              <strong>NF {{ nota.numero_nf }}</strong>
              <span>{{ nomeNota(nota) }}</span>
              <code>{{ chaveCurta(nota.chave_acesso) }}</code>
            </div>
            <div class="feed-side">
              <span class="badge" :class="nota.status === 'Autorizada' ? 'autorizada' : 'pendente'">{{ nota.status }}</span>
              <strong>{{ moeda(nota.total_da_nota) }}</strong>
            </div>
          </article>
        </section>

        <aside class="panel queue">
          <div class="panel-heading compact-heading">
            <div>
              <p class="eyebrow">Fila SEFAZ</p>
              <h2>Pendentes</h2>
            </div>
          </div>

          <div v-if="!notasPendentes.length" class="empty-state small">
            Sem notas aguardando autorizacao.
          </div>

          <article v-for="nota in notasPendentes" :key="nota.id" class="queue-row">
            <div>
              <strong>NF {{ nota.numero_nf }}</strong>
              <span>{{ chaveCurta(nota.chave_acesso) }}</span>
            </div>
            <button class="success-button" @click="autorizar(nota)">Autorizar</button>
          </article>
        </aside>
      </div>
    </section>

    <section v-if="abaAtiva === 'lista'" class="panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Administracao</p>
          <h2>Notas fiscais</h2>
        </div>
        <input v-model="busca" placeholder="Buscar por NF, chave, cliente ou status" />
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>NF</th>
              <th>Destinatario</th>
              <th>Chave</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="nota in notasFiltradas" :key="nota.id">
              <td><strong>{{ nota.numero_nf }}</strong></td>
              <td>
                {{ nomeNota(nota) }}
                <span>{{ documentoNota(nota) }}</span>
              </td>
              <td><code>{{ chaveCurta(nota.chave_acesso) }}</code></td>
              <td>{{ moeda(nota.total_da_nota) }}</td>
              <td><span class="badge" :class="nota.status === 'Autorizada' ? 'autorizada' : 'pendente'">{{ nota.status }}</span></td>
              <td class="actions">
                <button class="secondary" @click="editar(nota)">Editar</button>
                <button v-if="nota.status === 'Pendente'" class="success-button" @click="autorizar(nota)">Autorizar</button>
                <button v-if="nota.status === 'Autorizada'" class="secondary" @click="imprimirNota(nota)">DANFE</button>
              </td>
            </tr>
            <tr v-if="!notasFiltradas.length">
              <td colspan="6" class="empty-cell">Nenhuma nota encontrada.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="abaAtiva === 'formulario'" class="panel">
      <form @submit.prevent="salvarNota">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">{{ editandoId ? 'Edicao' : 'Recepcao JSON' }}</p>
            <h2>{{ editandoId ? 'Editar NF-e' : 'Emitir nova NF-e' }}</h2>
          </div>
          <button type="button" class="secondary" @click="abaAtiva = 'exemplos'">Usar exemplo</button>
        </div>

        <div class="form-grid">
          <label>
            Documento do destinatario
            <input
              :value="form.destinatario.documento"
              maxlength="14"
              placeholder="CPF ou CNPJ, apenas numeros"
              required
              @input="form.destinatario.documento = formatarDocumento($event.target.value)"
            />
          </label>
          <label>
            Nome ou razao social
            <input v-model="form.destinatario.nome" required />
          </label>
        </div>

        <div class="items-header">
          <h3>Itens da nota</h3>
          <button type="button" class="secondary" @click="adicionarItem">Adicionar item</button>
        </div>

        <div class="item-row header">
          <span>Descricao</span>
          <span>Qtd</span>
          <span>Unitario</span>
          <span>Total</span>
          <span></span>
        </div>

        <div v-for="(item, index) in form.itens" :key="index" class="item-row">
          <input v-model="item.descricao" placeholder="Descricao do produto ou servico" required />
          <input v-model.number="item.quantidade" type="number" min="0" step="0.01" required @input="recalcularItem(item)" />
          <input v-model.number="item.valor_unitario" type="number" min="0" step="0.01" required @input="recalcularItem(item)" />
          <output>{{ moeda(item.valor_total_item) }}</output>
          <button type="button" class="icon-danger" @click="removerItem(index)">Remover</button>
        </div>

        <footer class="form-footer">
          <div>
            <span>Total da NF-e</span>
            <strong>{{ moeda(form.total_da_nota) }}</strong>
          </div>
          <div class="actions">
            <button type="button" class="secondary" @click="cancelarEdicao">Cancelar</button>
            <button type="submit" :disabled="salvando">{{ salvando ? 'Processando...' : (editandoId ? 'Atualizar' : 'Emitir') }}</button>
          </div>
        </footer>
      </form>
    </section>

    <section v-if="abaAtiva === 'exemplos'" class="panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Aula demonstrativa</p>
          <h2>Lancar exemplos</h2>
        </div>
      </div>

      <div class="example-grid">
        <article v-for="exemplo in exemplos" :key="exemplo.nome" class="example-card">
          <h3>{{ exemplo.nome }}</h3>
          <p>{{ exemplo.nota.destinatario.nome }}</p>
          <strong>{{ moeda(exemplo.nota.itens.reduce((total, item) => total + item.valor_total_item, 0)) }}</strong>
          <div class="actions">
            <button class="secondary" @click="preencherExemplo(exemplo)">Editar antes</button>
            <button :disabled="salvando" @click="lancarExemplo(exemplo)">Lancar agora</button>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.toast-container {
  display: grid;
  gap: 10px;
  position: fixed;
  right: 20px;
  top: 20px;
  z-index: 20;
}

.toast {
  background: #087443;
  border-radius: 8px;
  color: #fff;
  font-weight: 800;
  padding: 14px 18px;
}

.toast.danger {
  background: #b42318;
}

.topbar {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 18px;
}

.header-actions,
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}

.tabs button {
  background: #e8eef6;
  color: #2f4054;
}

.tabs button.active {
  background: #175ddc;
  color: #fff;
}

.metric-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 18px;
}

.metric,
.panel,
.example-card {
  background: #fff;
  border: 1px solid #dde4ec;
  border-radius: 8px;
  box-shadow: 0 16px 45px rgba(32, 50, 74, 0.08);
}

.metric {
  border-top: 4px solid #175ddc;
  padding: 18px;
}

.metric.warn {
  border-top-color: #d9822b;
}

.metric.ok {
  border-top-color: #087443;
}

.metric.value {
  border-top-color: #6336c9;
}

.metric span,
.queue-row span,
.feed-row span,
td span,
.form-footer span {
  color: #667085;
  display: block;
  font-size: 0.84rem;
}

.metric strong {
  display: block;
  font-size: 2rem;
  line-height: 1.1;
  margin-top: 8px;
}

.dashboard-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 1.5fr) minmax(320px, 0.7fr);
}

.panel {
  min-width: 0;
  padding: 18px;
}

.panel-heading {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 16px;
}

.compact-heading {
  align-items: flex-start;
}

.loading-pill,
.badge {
  border-radius: 999px;
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 800;
  padding: 5px 10px;
}

.loading-pill,
.pendente {
  background: #fff3c6;
  color: #946300;
}

.autorizada {
  background: #dcf7e7;
  color: #087443;
}

.feed-row,
.queue-row {
  align-items: center;
  border-top: 1px solid #e6ebf1;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 14px 0;
}

.feed-row code,
td code {
  color: #405266;
  font-family: "Cascadia Mono", Consolas, monospace;
  overflow-wrap: anywhere;
}

.feed-side {
  display: grid;
  gap: 6px;
  justify-items: end;
}

.empty-state,
.empty-cell {
  color: #667085;
  padding: 28px;
  text-align: center;
}

.empty-state.small {
  padding: 14px 0;
}

.success-button {
  background: #087443;
}

.table-wrap {
  overflow-x: auto;
}

table {
  border-collapse: collapse;
  min-width: 980px;
  width: 100%;
}

th,
td {
  border-bottom: 1px solid #e6ebf1;
  padding: 12px 10px;
  text-align: left;
  vertical-align: middle;
}

th {
  color: #5f6c7b;
  font-size: 0.78rem;
  text-transform: uppercase;
}

form {
  display: grid;
  gap: 14px;
}

.form-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: 1fr 1.5fr;
}

.items-header {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
}

.item-row {
  align-items: center;
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(220px, 1fr) 90px 130px 130px auto;
}

.item-row.header {
  color: #667085;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
}

output {
  background: #f3f6fa;
  border-radius: 6px;
  color: #087443;
  font-weight: 800;
  min-height: 40px;
  padding: 10px;
  text-align: right;
}

.form-footer {
  align-items: center;
  border-top: 1px solid #e6ebf1;
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 18px;
}

.form-footer strong {
  display: block;
  font-size: 1.8rem;
}

.example-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.example-card {
  display: grid;
  gap: 10px;
  padding: 16px;
}

.example-card p {
  color: #667085;
  margin-bottom: 0;
}

.example-card strong {
  font-size: 1.4rem;
}

@media (max-width: 1040px) {
  .metric-grid,
  .dashboard-grid,
  .example-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .item-row {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 720px) {
  .topbar,
  .panel-heading,
  .form-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .item-row {
    grid-template-columns: 1fr;
  }
}
</style>
