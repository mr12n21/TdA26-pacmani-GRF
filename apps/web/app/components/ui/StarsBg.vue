<script setup lang="ts">
/**
 * StarsBg — three-layer rising star field with brand-tinted colors.
 * Used behind CTA sections for ambient motion.
 */
const props = withDefaults(defineProps<{
  color?: string
}>(), {
  color: 'rgba(145, 245, 173, 0.8)'
})

interface Star { x: number; y: number; size: number }

const generateStars = (count: number): Star[] =>
  Array.from({ length: count }, () => ({
    x: Math.floor(Math.random() * 2000),
    y: Math.floor(Math.random() * 2000),
    size: Math.random() * 1.5 + 0.5
  }))

const layers = [
  { stars: generateStars(100), duration: 100, opacity: 1 },
  { stars: generateStars(80), duration: 150, opacity: 0.75 },
  { stars: generateStars(60), duration: 200, opacity: 0.5 }
]
</script>

<template>
  <div class="stars-container" aria-hidden="true">
    <div class="stars-mask">
      <div
        v-for="(layer, i) in layers"
        :key="i"
        class="star-layer"
        :style="{
          '--star-dur': `${layer.duration}s`,
          '--star-opacity': layer.opacity
        }"
      >
        <div
          v-for="(star, j) in layer.stars"
          :key="j"
          class="star"
          :style="{
            left: `${star.x}px`,
            top: `${star.y}px`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: color,
            opacity: 'var(--star-opacity)'
          }"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.stars-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.stars-mask {
  position: absolute;
  inset: 0;
  left: 50%;
  transform: translateX(-50%);
  mask-image: linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.8) 25%, #fff 50%, rgba(255,255,255,0.8) 75%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.8) 25%, #fff 50%, rgba(255,255,255,0.8) 75%, transparent 100%);
}

.star-layer {
  animation: risingStars linear infinite;
  animation-duration: var(--star-dur);
  will-change: transform;
}

.star {
  position: absolute;
  border-radius: 50%;
}

@keyframes risingStars {
  0%   { transform: translateY(0); }
  100% { transform: translateY(-2000px); }
}
</style>
