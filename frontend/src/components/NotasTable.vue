<script setup>
import { chaveCurta, documentoNota, moeda, nomeNota, statusClass } from '../utils/nfe';

defineProps({
  notas: {
    type: Array,
    required: true
  },
  busca: {
    type: String,
    default: ''
  }
});

defineEmits(['update:busca', 'edit', 'authorize', 'cancel', 'print']);
</script>

<template>
  <section class="panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Administracao</p>
        <h2>Notas fiscais</h2>
      </div>
      <input
        :value="busca"
        placeholder="Buscar por NF, chave, cliente ou status"
        @input="$emit('update:busca', $event.target.value)"
      />
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
          <tr v-for="nota in notas" :key="nota.id">
            <td><strong>{{ nota.numero_nf }}</strong></td>
            <td>
              {{ nomeNota(nota) }}
              <span>{{ documentoNota(nota) }}</span>
            </td>
            <td><code>{{ chaveCurta(nota.chave_acesso) }}</code></td>
            <td>{{ moeda(nota.total_da_nota) }}</td>
            <td><span class="badge" :class="statusClass(nota.status)">{{ nota.status }}</span></td>
            <td class="actions">
              <button class="secondary" @click="$emit('edit', nota)">Editar</button>
              <button v-if="nota.status === 'Pendente'" class="success-button" @click="$emit('authorize', nota)">Autorizar</button>
              <button v-if="nota.status === 'Autorizada'" class="icon-danger" @click="$emit('cancel', nota)">Cancelar</button>
              <button
                v-if="nota.status === 'Autorizada' || nota.status === 'Cancelada'"
                class="secondary"
                @click="$emit('print', nota)"
              >
                DANFE
              </button>
            </td>
          </tr>
          <tr v-if="!notas.length">
            <td colspan="6" class="empty-cell">Nenhuma nota encontrada.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
