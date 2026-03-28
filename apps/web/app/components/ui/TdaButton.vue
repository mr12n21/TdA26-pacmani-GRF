<script setup lang="ts">
/**
 * TdaButton — brand button with ripple effect and all visual states.
 *
 * Variants: primary | secondary | outline | ghost | danger
 * Sizes:    sm | md | lg
 * States:   default, hover, active, loading, disabled
 */

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  icon?: string
  iconRight?: string
  to?: string
  block?: boolean
}>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
  block: false
})

const emit = defineEmits<{
  click: [e: MouseEvent]
}>()

const is = computed(() => props.to ? resolveComponent('NuxtLink') : 'button')
const bindProps = computed(() => props.to ? { to: props.to } : { type: 'button' as const })
const isDisabled = computed(() => props.disabled || props.loading)

// ── Ripple effect ──
const btnRef = ref<HTMLElement | null>(null)

function handleClick(e: MouseEvent) {
  if (isDisabled.value) return
  createRipple(e)
  emit('click', e)
}

function createRipple(e: MouseEvent) {
  const el = btnRef.value
  if (!el) return

  const rect = el.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 2.5
  const ripple = document.createElement('span')

  ripple.style.cssText = `
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    width: ${size}px;
    height: ${size}px;
    top: ${e.clientY - rect.top}px;
    left: ${e.clientX - rect.left}px;
    transform: translate(-50%, -50%) scale(0);
    opacity: 0.25;
    transition: transform 500ms ease, opacity 500ms ease;
  `

  // Ripple color based on variant
  const colors: Record<ButtonVariant, string> = {
    primary: 'rgba(255,255,255,0.35)',
    secondary: 'rgba(255,255,255,0.3)',
    outline: 'rgba(145,245,173,0.2)',
    ghost: 'rgba(0,112,187,0.1)',
    danger: 'rgba(255,255,255,0.3)'
  }
  ripple.style.background = colors[props.variant]

  el.appendChild(ripple)
  requestAnimationFrame(() => {
    ripple.style.transform = 'translate(-50%, -50%) scale(1)'
    ripple.style.opacity = '0'
  })
  setTimeout(() => ripple.remove(), 550)
}
</script>

<template>
  <component
    :is="is"
    ref="btnRef"
    v-bind="bindProps"
    :disabled="isDisabled"
    class="tda-btn"
    :class="[
      `tda-btn--${variant}`,
      `tda-btn--${size}`,
      { 'tda-btn--block': block, 'tda-btn--loading': loading }
    ]"
    @click="handleClick"
  >
    <!-- Loading spinner -->
    <span v-if="loading" class="tda-btn__spinner" />

    <!-- Left icon -->
    <UIcon v-if="icon && !loading" :name="icon" class="tda-btn__icon" />

    <!-- Label -->
    <span class="tda-btn__label" :class="{ 'opacity-0': loading }">
      <slot />
    </span>

    <!-- Right icon -->
    <UIcon v-if="iconRight" :name="iconRight" class="tda-btn__icon" />
  </component>
</template>

<style scoped>
.tda-btn {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-family: inherit;
  font-weight: 600;
  white-space: nowrap;
  user-select: none;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  transition:
    background-color 250ms cubic-bezier(0.34, 1.56, 0.64, 1),
    border-color 250ms cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 250ms ease,
    transform 150ms ease;
}

.tda-btn:active:not(:disabled) { transform: scale(0.97); }
.tda-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(20%);
}

/* ── Sizes ── */
.tda-btn--sm { padding: 0.375rem 0.875rem; font-size: 0.8125rem; border-radius: 0.375rem; }
.tda-btn--md { padding: 0.625rem 1.375rem; font-size: 0.875rem; }
.tda-btn--lg { padding: 0.875rem 2rem; font-size: 1rem; border-radius: 0.625rem; }

.tda-btn--block { width: 100%; }

/* ═══ PRIMARY ═══ */
.tda-btn--primary {
  background: #0070BB;
  color: #fff;
  box-shadow: 0 2px 10px -2px rgba(0, 112, 187, 0.3);
}
.tda-btn--primary:hover:not(:disabled) {
  background: #0257A5;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px -4px rgba(0, 112, 187, 0.45);
}
.tda-btn--primary:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 112, 187, 0.3), 0 2px 10px -2px rgba(0, 112, 187, 0.3);
}

/* ═══ SECONDARY ═══ */
.tda-btn--secondary {
  background: #49B3B4;
  color: #fff;
  box-shadow: 0 2px 10px -2px rgba(73, 179, 180, 0.3);
}
.tda-btn--secondary:hover:not(:disabled) {
  background: #2592B8;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px -4px rgba(73, 179, 180, 0.45);
}
.tda-btn--secondary:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(73, 179, 180, 0.3), 0 2px 10px -2px rgba(73, 179, 180, 0.3);
}

/* ═══ OUTLINE ═══ */
.tda-btn--outline {
  background: transparent;
  color: #6DD4B1;
  border-color: #6DD4B1;
}
.tda-btn--outline:hover:not(:disabled) {
  background: rgba(109, 212, 177, 0.08);
  border-color: #91F5AD;
  transform: translateY(-1px);
}
:root .tda-btn--outline { color: #0070BB; border-color: #0070BB; }
:root .tda-btn--outline:hover:not(:disabled) { background: rgba(0, 112, 187, 0.06); border-color: #0257A5; }
.dark .tda-btn--outline { color: #6DD4B1; border-color: #6DD4B1; }
.dark .tda-btn--outline:hover:not(:disabled) { background: rgba(109, 212, 177, 0.08); border-color: #91F5AD; }

/* ═══ GHOST ═══ */
.tda-btn--ghost {
  background: transparent;
  color: var(--ui-text-muted);
}
.tda-btn--ghost:hover:not(:disabled) {
  background: var(--ui-bg-accented);
  color: var(--ui-text-highlighted);
}

/* ═══ DANGER ═══ */
.tda-btn--danger {
  background: #DC2626;
  color: #fff;
  box-shadow: 0 2px 10px -2px rgba(220, 38, 38, 0.3);
}
.tda-btn--danger:hover:not(:disabled) {
  background: #B91C1C;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px -4px rgba(220, 38, 38, 0.45);
}

/* ── Spinner ── */
.tda-btn__spinner {
  position: absolute;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
.tda-btn--outline .tda-btn__spinner,
.tda-btn--ghost .tda-btn__spinner {
  border-color: var(--ui-border-accented);
  border-top-color: var(--ui-text-tinted);
}

/* ── Icon ── */
.tda-btn__icon { width: 1em; height: 1em; flex-shrink: 0; }
</style>
