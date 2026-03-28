<script setup lang="ts">
/**
 * SoftParticles — floating bubble particles with brand green/teal gradient.
 * Used as a decorative background layer on hero/CTA sections.
 */
const props = withDefaults(defineProps<{
  amount?: number
}>(), {
  amount: 18
})

const particles = computed(() =>
  Array.from({ length: props.amount }, (_, i) => {
    const seed = i * 37 + 11
    return {
      id: i,
      left: (seed * 17) % 100,
      delay: ((seed * 13) % 40) / 10,
      duration: 9 + ((seed * 19) % 50) / 10,
      size: 6 + ((seed * 23) % 18),
      opacity: 0.08 + ((seed * 7) % 8) / 100
    }
  })
)
</script>

<template>
  <div class="soft-particles" aria-hidden="true">
    <span
      v-for="p in particles"
      :key="p.id"
      class="particle"
      :style="{
        left: `${p.left}%`,
        width: `${p.size}px`,
        height: `${p.size}px`,
        animationDelay: `${p.delay}s`,
        animationDuration: `${p.duration}s`,
        opacity: p.opacity
      }"
    />
  </div>
</template>

<style scoped>
.soft-particles {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.particle {
  position: absolute;
  bottom: -40px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 30%, rgba(145, 245, 173, 0.85), rgba(73, 179, 180, 0.48));
  filter: blur(0.2px);
  animation-name: floatUp;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

@keyframes floatUp {
  0%   { transform: translate3d(0, 0, 0) scale(0.95); }
  50%  { transform: translate3d(12px, -42vh, 0) scale(1.1); }
  100% { transform: translate3d(-8px, -88vh, 0) scale(0.92); }
}
</style>
