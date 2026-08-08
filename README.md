# vue-shadertoy-player

基于 Vue 3 的 ShaderToy 单 pass shader 播放组件。传入一个 glsl 文件地址即可运行，组件内部完成 WebGL2 编译、渲染循环与 ShaderToy 内置 uniform 的自动上传。

## 特性

- 🖼 声明式用法：组件属性指向 glsl 地址，即插即用
- ⚡ WebGL2 + 全屏三角形渲染，性能开销极小
- 🎨 遵循 ShaderToy 规范自动注入运行时 uniform（`iResolution` / `iTime` / `iTimeDelta` / `iMouse` / `iFrame`），你的 glsl 里直接使用变量名即可，无需手动声明与上传
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

你只需编写 `mainImage` 函数体内的算法。组件在编译时会把你的代码嵌入一段预置的片段着色器模板，模板里已声明并由渲染循环自动上传以下 uniform —— **因此这些变量你不用 `uniform` 声明，也不用手动上传，直接在 `mainImage` 里使用即可**：

**示例一：彩虹脉冲圆环**（`examples/ripple.glsl`）

```glsl
void mainImage(out vec4 col, in vec2 fragCoord) {
    // 1. 把 fragCoord 归一化到 [-1, 1]，并按 iResolution.y 做宽高比修正
    //    这样无论画布是宽是扁，圆形看起来都是真正的圆
    vec2 uv = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    // 2. 与画面中心的距离 d
    float d = length(uv);

    // 3. 半径 0.5 处的圆环：abs(d - 0.5) < 0.05 的区域亮
    float ring = smoothstep(0.06, 0.05, abs(d - 0.5));

    // 4. 颜色随角度循环（彩虹环），用 iTime 让色环缓慢转动
    float a = atan(uv.y, uv.x);
    vec3 hue = 0.5 + 0.5 * cos(iTime + a + vec3(0.0, 2.0, 4.0));

    // 5. 深色背景 + 彩色圆环叠加
    vec3 bg = vec3(0.05, 0.07, 0.12);
    col = vec4(bg + hue * ring, 1.0);
}
```

**示例二：跟随鼠标的彩色光斑**（`examples/mouse-glow.glsl`，演示 `iMouse`）

```glsl
void mainImage(out vec4 col, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;

    // iMouse.xy 是当前鼠标的像素坐标，组件会自动上传
    vec2 mouse = iMouse.xy / iResolution.xy;
    float d = length(uv - mouse);

    // 指数衰减：靠近鼠标处最亮
    float glow = exp(-d * 20.0);

    // 用 iTime + 坐标生成彩虹色
    vec3 hue = 0.5 + 0.5 * cos(iTime * 2.0 + uv.xyx * 6.28);
    col = vec4(hue * glow, 1.0);
}
```

> ⚠️ **关于 `#version` / `precision` / `uniform` 声明**：以上代码**不要**写 `#version 300 es`、precision 声明和 `uniform vec3 iResolution;` 之类的语句——组件的 FS 模板会统一注入，写了反而会与模板产生语法冲突。

内置 uniform 说明：

| uniform | 类型 | 来源 | 说明 |
| --- | --- | --- | --- |
| `iResolution` | `vec3` | 组件上传 | 画布分辨率（`x, y, 1`） |
| `iTime` | `float` | 组件上传 | 从开始运行累计的秒数 |
| `iTimeDelta` | `float` | 组件上传 | 当前帧与上一帧的时间差（秒） |
| `iMouse` | `vec4` | 组件上传 | `(当前x, 当前y, 按下时的x, 按下时的y)`，坐标为设备像素，y 轴从底部向上 |
| `iFrame` | `int` | 组件上传 | 帧序号，从 0 开始 |

如果你需要自定义 uniform（如纹理采样器、自定义参数），请在 `mainImage` 里自行声明和初始化，组件不会替你处理（避免与内置命名冲突，建议加前缀，例如 `u_myTexture`、`u_myParam`）。

## 开发

```bash
npm install       # 安装依赖
npm run dev       # 本地开发
npm test          # 单元测试
npm run build     # 构建 dist（lib 模式 + 类型声明）
```

## License

MIT
