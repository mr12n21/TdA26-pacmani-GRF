<script setup lang="ts">
/**
 * HeroBackground — SVG gradient mask that fades in on mount.
 * Sits at the top of hero sections for a branded green→blue→transparent glow.
 */
const visible = ref(false)
onMounted(() => { visible.value = true })
</script>

<template>
  <div
    class="hero-bg"
    :style="{ opacity: visible ? 1 : 0 }"
    aria-hidden="true"
  >
    <svg
      viewBox="0 0 1440 181"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="w-full block"
    >
      <mask id="hero-mask" fill="white">
        <path d="M0 0H1440V181H0V0Z" />
      </mask>
      <path
        d="M0 0H1440V181H0V0Z"
        fill="url(#hero-grad-fill)"
        fill-opacity="0.08"
      />
      <path
        d="M0 2H1440V-2H0V2Z"
        fill="url(#hero-grad-line)"
        mask="url(#hero-mask)"
      />
      <defs>
        <linearGradient id="hero-grad-fill" x1="720" y1="0" x2="720" y2="181" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#91F5AD" />
          <stop offset="50%" stop-color="#0070BB" />
          <stop offset="100%" stop-color="#0B0F19" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="hero-grad-line" x1="0" y1="90.5" x2="1440" y2="90.5" gradientUnits="userSpaceOnUse">
          <stop stop-color="currentColor" stop-opacity="0" />
          <stop offset="0.4" stop-color="currentColor" />
          <stop offset="1" stop-color="currentColor" stop-opacity="0" />
        </linearGradient>
      </defs>
    </svg>
  </div>
</template>

<style scoped>
.hero-bg {
  position: absolute;
  width: 100%;
  top: -1px;
  color: var(--ui-text-tinted);
  transition: opacity 350ms ease;
  pointer-events: none;
  z-index: 0;
}
</style>
