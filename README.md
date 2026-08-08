# vue-shadertoy-player

基于 Vue 3 的 ShaderToy 单 pass shader 播放组件。传入一个 glsl 文件地址即可运行，组件内部完成 WebGL2 编译、渲染循环与 ShaderToy 内置 uniform 的自动上传。

## 特性

- 🖼 声明式用法：组件属性指向 glsl 地址，即插即用
- ⚡ WebGL2 + 全屏三角形渲染，性能开销极小
- 🎨 自动上传 ShaderToy 标准 uniform（`iResolution` / `iTime` / `iTimeDelta` / `iMouse` / `iFrame`）
- 🖱 内置鼠标交互（按下拖动会更新 `iMouse`）
- 🛡 编译错误通过 `error` 事件抛出，便于定位
- 📦 TypeScript 类型声明，Vue 为 peerDependency，不打包进产物

## 安装

```bash
npm install vue-shadertoy-player
```

需要 peer 依赖 `vue@^3.2.0`。

## 快速开始

### 组件用法

```vue
<template>
  <ShaderPlayer
    src="/shaders/city.glsl"
    width="100%"
    height="480px"
    preserve-drawing-buffer
    @ready="onReady"
    @error="onError"
  />
</template>

<script setup lang="ts">
import { ShaderPlayer } from 'vue-shadertoy-player';

const onReady = () => console.log('shader started');
const onError = (err: Error) => console.error(err);
</script>
```

### 编程式用法（STNPlayer）

```ts
import { STNPlayer } from 'vue-shadertoy-player';

const canvas = document.querySelector('canvas')!;
const gl = canvas.getContext('webgl2');
if (!gl) throw new Error('当前环境不支持 WebGL2');

const player = new STNPlayer(gl);

const res = await fetch('/shaders/city.glsl');
player.run(await res.text());

// 容器尺寸变化时调用（组件已内置 resize 监听）
player.refreshCanvasSize();

// 卸载时释放
player.dispose();
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `src` | `string` | - | **必填**。ShaderToy 单 pass glsl 文件地址；变化时自动重新加载 |
| `width` | `string` | `'100%'` | 容器宽度（任意 CSS 尺寸） |
| `height` | `string` | `'100%'` | 容器高度（任意 CSS 尺寸） |
| `preserveDrawingBuffer` | `boolean` | `false` | 是否保留绘制缓冲（截图 / 取色等场景需要） |

## 事件

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `ready` | - | shader 编译成功并开始渲染 |
| `error` | `Error` | 加载或编译失败 |

## Shader 编写约定

单 pass 片段着色器，需包含以下入口函数（其余语法遵循 GLSL ES 3.00）：

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // fragCoord 为当前像素坐标，原点在左下角
    // 例如一个随时间变化的渐变：
    fragColor = vec4(fragCoord.xy / iResolution.xy, 0.5 + 0.5 * sin(iTime), 1.0);
}
```

可用内置 uniform：

| uniform | 类型 | 说明 |
| --- | --- | --- |
| `iResolution` | `vec3` | 画布分辨率（`x, y, 1`） |
| `iTime` | `float` | 从开始运行累计的秒数 |
| `iTimeDelta` | `float` | 当前帧与上一帧的时间差（秒） |
| `iMouse` | `vec4` | `(当前x, 当前y, 按下时的x, 按下时的y)`，坐标为设备像素 |
| `iFrame` | `int` | 帧序号，从 0 开始 |

## 开发

```bash
npm install       # 安装依赖
npm run dev       # 本地开发
npm test          # 单元测试
npm run build     # 构建 dist（lib 模式 + 类型声明）
```

## License

MIT
