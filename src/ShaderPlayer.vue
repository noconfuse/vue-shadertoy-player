<template>
  <div class="stn-player" :style="{ position: 'relative', overflow: 'hidden', width, height }">
    <canvas
      ref="canvasRef"
      :style="{ display: 'block', width: '100%', height: '100%' }"
    ></canvas>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { STNPlayer } from './player';

interface Props {
  /** ShaderToy 单 pass glsl 文件地址（须包含 mainImage(out vec4, in vec2)） */
  src: string;
  /** 容器宽度，默认 100% */
  width?: string;
  /** 容器高度，默认 100% */
  height?: string;
  /** 保留绘制缓冲（便于截图/取色），默认 false */
  preserveDrawingBuffer?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  height: '100%',
  preserveDrawingBuffer: false
});

const emit = defineEmits<{
  (e: 'ready'): void;
  (e: 'error', err: Error): void;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let player: STNPlayer | null = null;

const stop = () => {
  player?.dispose();
  player = null;
};

const start = async () => {
  stop();
  const canvas = canvasRef.value;
  if (!canvas || !props.src) return;

  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: props.preserveDrawingBuffer });
  if (!gl) {
    emit('error', new Error('当前环境不支持 WebGL2'));
    return;
  }

  player = new STNPlayer(gl);
  try {
    const res = await fetch(props.src);
    if (!res.ok) throw new Error(`加载 ${props.src} 失败: HTTP ${res.status}`);
    const code = await res.text();
    player.run(code);
    emit('ready');
  } catch (err) {
    emit('error', err as Error);
  }
};

const onResize = () => player?.refreshCanvasSize();

onMounted(() => {
  start();
  window.addEventListener('resize', onResize);
});

// 切换 glsl 地址时重新加载
watch(() => props.src, () => start());

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  stop();
});
</script>

<style scoped>
.stn-player {
  position: relative;
  overflow: hidden;
}

.stn-player canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
