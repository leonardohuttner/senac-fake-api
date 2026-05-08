<script setup>
import { chaveCurta, moeda, nomeNota, statusClass } from '../utils/nfe';

defineProps({
  estatisticas: {
    type: Object,
    required: true
  },
  ultimasNotas: {
    type: Array,
    required: true
  },
  notasPendentes: {
    type: Array,
    required: true
  },
  carregando: {
    type: Boolean,
    default: false
  }
});

defineEmits(['authorize']);
</script>

<template>
  <section class="dashboard">
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
      <article class="metric danger-metric">
        <span>Canceladas</span>
        <strong>{{ estatisticas.canceladas }}</strong>
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
            <span class="badge" :class="statusClass(nota.status)">{{ nota.status }}</span>
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
          <button class="success-button" @click="$emit('authorize', nota)">Autorizar</button>
        </article>
      </aside>
    </div>
  </section>
</template>
