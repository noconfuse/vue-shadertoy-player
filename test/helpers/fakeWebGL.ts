import { vi } from 'vitest';

/**
 * 构造一个模拟的 WebGL2RenderingContext。
 * 所有 GL 调用均为 vi.fn，可单独覆写返回值。
 */
export function createFakeGL(canvas: any) {
  const gl: any = {
    canvas,
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    STATIC_DRAW: 0x88e4,
    TRIANGLES: 4,
    FLOAT: 0x1406,
    COLOR_BUFFER_BIT: 0x4000,
    DEPTH_BUFFER_BIT: 0x100,
    FRAGMENT_SHADER_DERIVATIVE_HINT: 0x8b8b,
    NICEST: 0x1102,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ''),
    hint: vi.fn(),
    useProgram: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    uniform3f: vi.fn(),
    uniform1f: vi.fn(),
    uniform4f: vi.fn(),
    uniform1i: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    clearColor: vi.fn(),
    clear: vi.fn(),
    drawArrays: vi.fn(),
    viewport: vi.fn(),
    scissor: vi.fn()
  };
  return gl;
}

/**
 * 构造一个模拟的 canvas，getContext 默认返回由 createFakeGL 生成的 fake context。
 */
export function createFakeCanvas(opts: { width?: number; height?: number } = {}) {
  const width = opts.width ?? 300;
  const height = opts.height ?? 150;
  const canvas: any = {
    width: 0,
    height: 0,
    clientWidth: width,
    clientHeight: height,
    getContext: vi.fn(() => null),
    getBoundingClientRect: () => ({ left: 0, top: 0, right: width, bottom: height }),
    onmousedown: null,
    onmousemove: null,
    onmouseup: null
  };
  canvas.getContext.mockReturnValue(createFakeGL(canvas));
  return canvas;
}
