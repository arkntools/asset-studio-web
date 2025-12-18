<template>
  <div ref="container" class="spine-player-container" :class="{ 'is-ready': isReady }"></div>
</template>

<script setup lang="ts">
import '@/lib/spine-player/index.css';
import { useElementSize, useEventListener, useMouseInElement } from '@vueuse/core';
import { clamp, isJSON } from 'es-toolkit';
import spine from '@/lib/spine-player';

const {
  skel,
  atlas,
  images,
  bgColor = '#00000000',
} = defineProps<{
  skel: string;
  atlas: string;
  images: Record<string, string>;
  bgColor?: string;
}>();

const container = useTemplateRef('container');
const containerSize = useElementSize(container);

const isReady = ref(false);
const animationHeight = ref(0);

const scale = defineModel<number>('scale', { default: 1 });
const scaleValue = computed(() => scale.value ** (scale.value > 1 ? 2 : 0.5));

const { isOutside } = useMouseInElement(container, {
  handleOutside: false,
  windowScroll: false,
});

useEventListener(window, 'wheel', e => {
  if (isOutside.value) return;
  const up = e.deltaY > 0;
  scale.value = clamp(Math.round(scale.value * 10 + (up ? -1 : 1)), 1, 19) / 10;
});

const spineViewPort = computed(() => {
  const { width, height } = containerSize;
  return {
    x: -width.value / scaleValue.value,
    y: -height.value / scaleValue.value + animationHeight.value / 2,
    width: (width.value * 2) / scaleValue.value,
    height: (height.value * 2) / scaleValue.value,
  };
});

let player: spine.SpinePlayer | undefined;

watch(spineViewPort, async value => {
  if (!player) return;
  Object.assign(player.currentViewport || player.config.viewport, value);
});

watch(
  () => bgColor,
  value => {
    if (!player) return;
    player.config.backgroundColor = value;
  },
);

const cleanUp = () => {
  if (player) {
    player.stopRendering();
    player.context.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  if (container.value) container.value.innerHTML = '';
};

const loadSpine = async () => {
  if (!container.value) return;

  const isJsonSkel = isJSON(await fetch(skel).then(res => res.text()));

  player = new spine.SpinePlayer(container.value, {
    skelUrl: isJsonSkel ? undefined : skel,
    jsonUrl: isJsonSkel ? skel : undefined,
    atlasUrl: atlas,
    rawDataURIs: { ...images },
    viewport: {
      ...spineViewPort.value,
      padLeft: 0,
      padRight: 0,
      padTop: 0,
      padBottom: 0,
      transitionTime: 0,
    },
    alpha: true,
    backgroundColor: bgColor,
    onCalculateAnimationViewport: ({ height }) => {
      if (animationHeight.value === height) triggerRef(animationHeight);
      else animationHeight.value = height;
      if (!isReady.value) {
        requestAnimationFrame(() => {
          isReady.value = true;
        });
      }
    },
  });
};

onMounted(loadSpine);

onBeforeUnmount(() => {
  cleanUp();
});
</script>

<style lang="scss" scoped>
.spine-player-container {
  width: 100%;
  height: 100%;
  &:not(.is-ready) :deep(canvas) {
    opacity: 0;
  }
}
</style>
