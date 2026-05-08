<script setup>
import { formatarCep, formatarDocumento, moeda } from '../utils/nfe';

defineProps({
  form: {
    type: Object,
    required: true
  },
  editing: {
    type: Boolean,
    default: false
  },
  saving: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['submit', 'cancel', 'add-item', 'remove-item', 'recalculate-item']);
</script>

<template>
  <section class="panel">
    <form @submit.prevent="$emit('submit')">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">{{ editing ? 'Edicao' : 'Recepcao JSON' }}</p>
          <h2>{{ editing ? 'Editar NF-e' : 'Emitir nova NF-e' }}</h2>
        </div>
      </div>

      <div class="items-header">
        <h3>Emitente</h3>
      </div>

      <div class="form-grid">
        <label>
          Nome da empresa emitente
          <input v-model="form.emitente.nome" required />
        </label>
        <label>
          CNPJ da empresa emitente
          <input
            :value="form.emitente.cnpj"
            maxlength="14"
            placeholder="Apenas numeros"
            required
            @input="form.emitente.cnpj = formatarDocumento($event.target.value)"
          />
        </label>
      </div>

      <div class="items-header">
        <h3>Destinatario</h3>
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
        <label>
          Endereco
          <input v-model="form.destinatario.endereco" />
        </label>
        <label>
          Cidade
          <input v-model="form.destinatario.cidade" />
        </label>
        <label>
          UF
          <input v-model="form.destinatario.uf" maxlength="2" />
        </label>
        <label>
          CEP
          <input
            :value="form.destinatario.cep"
            maxlength="8"
            placeholder="Apenas numeros"
            @input="form.destinatario.cep = formatarCep($event.target.value)"
          />
        </label>
      </div>

      <div class="items-header">
        <h3>Itens da nota</h3>
        <button type="button" class="secondary" @click="$emit('add-item')">Adicionar item</button>
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
        <input
          v-model.number="item.quantidade"
          type="number"
          min="0"
          step="0.01"
          required
          @input="$emit('recalculate-item', item)"
        />
        <input
          v-model.number="item.valor_unitario"
          type="number"
          min="0"
          step="0.01"
          required
          @input="$emit('recalculate-item', item)"
        />
        <output>{{ moeda(item.valor_total_item) }}</output>
        <button type="button" class="icon-danger" @click="$emit('remove-item', index)">Remover</button>
      </div>

      <footer class="form-footer">
        <div>
          <span>Total da NF-e</span>
          <strong>{{ moeda(form.total_da_nota) }}</strong>
        </div>
        <div class="actions">
          <button type="button" class="secondary" @click="$emit('cancel')">Cancelar</button>
          <button type="submit" :disabled="saving">{{ saving ? 'Processando...' : (editing ? 'Atualizar' : 'Emitir') }}</button>
        </div>
      </footer>
    </form>
  </section>
</template>
