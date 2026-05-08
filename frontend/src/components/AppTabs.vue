<script setup>
defineProps({
  active: {
    type: String,
    required: true
  },
  editing: {
    type: Boolean,
    default: false
  }
});

defineEmits(['change']);
</script>

<template>
  <nav class="tabs" aria-label="Navegacao principal">
    <button :class="{ active: active === 'dashboard' }" @click="$emit('change', 'dashboard')">Dashboard</button>
    <button :class="{ active: active === 'lista' }" @click="$emit('change', 'lista')">Notas</button>
    <button :class="{ active: active === 'formulario' }" @click="$emit('change', 'formulario')">
      {{ editing ? 'Editar NF-e' : 'Emitir NF-e' }}
    </button>
  </nav>
</template>
