<script setup>
defineEmits(['refresh', 'new-note']);
</script>

<template>
  <header class="topbar">
    <div>
      <p class="eyebrow">Simulador de processos fiscais</p>
      <h1>SEFAZ SENAC</h1>
    </div>
    <div class="header-actions">
      <button class="secondary" @click="$emit('refresh')">Atualizar</button>
      <button @click="$emit('new-note')">Nova emissao</button>
    </div>
  </header>
</template>
