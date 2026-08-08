import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { STNPlayer } from '../src/player';
import { createFakeCanvas, createFakeGL } from './helpers/fakeWebGL';

const VALID_GLSL = 'void mainImage(out vec4 c, in vec2 p){ c = vec4(1.0); }';

describe('STNPlayer', () => {
  let origRAF: typeof requestAnimationFrame;

  beforeEach(() => {
    origRAF = globalThis.requestAnimationFrame;
    // 阻止递归渲染循环
    globalThis.requestAnimationFrame = (() => 0) as typeof requestAnimationFrame;
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = origRAF;
  });

  it('构造时按 CSS 尺寸初始化绘制缓冲', () => {
    const canvas = createFakeCanvas({ width: 800, height: 600 });
    const gl = createFakeGL(canvas);
    const player = new STNPlayer(gl);

    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
    expect(gl.viewport).toHaveBeenCalledWith(0, 0, 800, 600);
    player.dispose();
  });

  it('refreshCanvasSize 跟随新尺寸更新缓冲与视口', () => {
    const canvas = createFakeCanvas({ width: 320, height: 240 });
    const gl = createFakeGL(canvas);
    const player = new STNPlayer(gl);

    canvas.clientWidth = 640;
    canvas.clientHeight = 480;
    player.refreshCanvasSize();

    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(480);
    expect(gl.viewport).toHaveBeenLastCalledWith(0, 0, 640, 480);
    player.dispose();
  });

  it('run 注入 shader 并完成第一帧绘制与 uniform 上传', () => {
    const canvas = createFakeCanvas({ width: 100, height: 100 });
    const gl = createFakeGL(canvas);
    const player = new STNPlayer(gl);

    player.run(VALID_GLSL);

    // VS + FS 各一次 shaderSource
    expect(gl.shaderSource).toHaveBeenCalledTimes(2);
    // 上传统一变量
    expect(gl.getUniformLocation).toHaveBeenCalled();
    expect(gl.uniform3f).toHaveBeenCalledWith(expect.anything(), 100, 100, 1);
    expect(gl.uniform1f).toHaveBeenCalled();
    expect(gl.uniform1i).toHaveBeenCalled();
    // 第一帧已绘制
    expect(gl.drawArrays).toHaveBeenCalledWith(gl.TRIANGLES, 0, 3);
    player.dispose();
  });

  it('shader 编译失败时抛出包含日志的 Error', () => {
    const canvas = createFakeCanvas();
    const gl = createFakeGL(canvas);
    gl.getShaderParameter.mockReturnValue(false);
    gl.getShaderInfoLog.mockReturnValue('0:12: error: syntax error');
    const player = new STNPlayer(gl);

    expect(() => player.run(VALID_GLSL)).toThrow(/syntax error/);
    player.dispose();
  });

  it('linkProgram 失败时抛出 Error', () => {
    const canvas = createFakeCanvas();
    const gl = createFakeGL(canvas);
    gl.getProgramParameter.mockImplementation((_p: unknown, pname: number) =>
      pname === gl.LINK_STATUS ? false : true
    );
    gl.getProgramInfoLog.mockReturnValue('link error');
    const player = new STNPlayer(gl);

    expect(() => player.run(VALID_GLSL)).toThrow(/link error/);
    player.dispose();
  });

  it('dispose 后渲染循环不再继续', () => {
    const canvas = createFakeCanvas({ width: 50, height: 50 });
    const gl = createFakeGL(canvas);
    const player = new STNPlayer(gl);

    player.run(VALID_GLSL);
    const drawCount = gl.drawArrays.mock.calls.length;
    player.dispose();
    // loop 已返回，无新增绘制
    expect(gl.drawArrays.mock.calls.length).toBe(drawCount);
  });

  it('鼠标按下拖动会更新 iMouse 输入', () => {
    const canvas = createFakeCanvas({ width: 200, height: 100 });
    const gl = createFakeGL(canvas);
    const player = new STNPlayer(gl);

    // 按下 (20, 30) → 移动 (40, 60) → 松开
    canvas.onmousedown({ clientX: 20, clientY: 30 });
    canvas.onmousemove({ clientX: 40, clientY: 60 });
    canvas.onmouseup();

    player.run(VALID_GLSL);

    // iMouse = (当前x, 当前y, 按下x, 按下y)，y 轴从底部向上
    const posX = 40;
    const posY = 100 - 60;
    const oriX = 20;
    const oriY = 100 - 30;
    expect(gl.uniform4f).toHaveBeenCalledWith(expect.anything(), posX, posY, oriX, oriY);
    player.dispose();
  });
});
