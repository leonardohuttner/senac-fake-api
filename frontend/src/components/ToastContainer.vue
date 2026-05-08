<script setup>
defineProps({
  toasts: {
    type: Array,
    required: true
  }
});
</script>

<template>
  <div class="toast-container">
    <div v-for="toast in toasts" :key="toast.id" class="toast" :class="toast.type">
      {{ toast.text }}
    </div>
  </div>
</template>
