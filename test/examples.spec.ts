import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import ShaderPlayer from '../src/ShaderPlayer.vue';

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = resolve(here, '../examples');

function loadExample(name: string) {
  return readFileSync(resolve(examplesDir, name), 'utf8');
}

const stubGetContext = () => {
  const canvas: any = {
    width: 0,
    height: 0,
    clientWidth: 800,
    clientHeight: 600,
    onmousedown: null,
    onmousemove: null,
    onmouseup: null,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 800, bottom: 600 })
  };
  const gl: any = {
    canvas,
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    STATIC_DRAW: 0x88e4,
    TRIANGLES: 4,
    FLOAT: 0x1406,
    COLOR_BUFFER_BIT: 0x4000,
    DEPTH_BUFFER_BIT: 0x100,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    hint: vi.fn(),
    useProgram: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    uniform3f: vi.fn(),
    uniform1f: vi.fn(),
    uniform4f: vi.fn(),
    uniform1i: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    drawArrays: vi.fn(),
    viewport: vi.fn(),
    scissor: vi.fn()
  };
  canvas.getContext = vi.fn(() => gl);
  HTMLCanvasElement.prototype.getContext = canvas.getContext as any;
  return { canvas, gl };
};

describe('README 示例 glsl 文件', () => {
  let origRAF: typeof requestAnimationFrame;
  let origFetch: typeof fetch;

  beforeEach(() => {
    origRAF = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (() => 0) as typeof requestAnimationFrame;
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = origRAF;
    globalThis.fetch = origFetch;
  });

  it('examples/ripple.glsl 存在且包含 mainImage', () => {
    const code = loadExample('ripple.glsl');
    expect(code).toMatch(/void\s+mainImage\s*\(\s*out\s+vec4\s+\w+\s*,\s*in\s+vec2\s+\w+\s*\)/);
  });

  it('examples/mouse-glow.glsl 存在且使用了 iMouse', () => {
    const code = loadExample('mouse-glow.glsl');
    expect(code).toMatch(/void\s+mainImage\s*\(\s*out\s+vec4\s+\w+\s*,\s*in\s+vec2\s+\w+\s*\)/);
    expect(code).toContain('iMouse');
  });

  it('examples/*.glsl 不应出现 #version / precision / uniform 声明（避免与模板冲突）', () => {
    for (const name of ['ripple.glsl', 'mouse-glow.glsl']) {
      const code = loadExample(name);
      // 只匹配行首的 GLSL 声明，避免误命中注释文字
      expect(code, name).not.toMatch(/^\s*#version\s+\d+/m);
      expect(code, name).not.toMatch(/^\s*precision\s+/m);
      expect(code, name).not.toMatch(/^\s*uniform\s+\w+/m);
    }
  });

  it('示例可通过 ShaderPlayer 成功注入并触发 ready', async () => {
    const { gl } = stubGetContext();
    origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: any) => {
      const url = String(input);
      const fname = url.split('/').pop()!;
      return { ok: true, status: 200, text: async () => loadExample(fname) } as any;
    });

    const wrapper = mount(ShaderPlayer, { props: { src: '/examples/ripple.glsl' } });
    await flushPromises();

    // 模板注入后，VS+FS 都被写入
    expect(gl.shaderSource).toHaveBeenCalledTimes(2);
    // 找到包含模板 mainImage 调用的那段代码（即注入后的 FS）
    const mergedCodes = gl.shaderSource.mock.calls.map((c: any) => String(c[1]));
    const fsCode = mergedCodes.find((s: string) => s.includes('mainImage(col, gl_FragCoord.xy)'));
    expect(fsCode, 'FS 必须包含模板的 mainImage 调用').toBeTruthy();
    expect(fsCode).toContain('#version 300 es');
    // 注入后的 FS 应包含示例代码本体
    expect(fsCode).toContain('mainImage(out vec4 col, in vec2 fragCoord)');
    expect(fsCode).toContain('fragCoord');

    expect(wrapper.emitted('ready')).toBeTruthy();
    expect(wrapper.emitted('error')).toBeFalsy();
    wrapper.unmount();
  });
});