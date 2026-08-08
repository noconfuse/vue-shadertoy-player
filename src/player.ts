import { baseFS, baseVS } from './shader';

/**
 * ShaderToy 单 pass shader 播放器。
 * 将 glsl 代码注入片段着色器模板，以全屏三角形 + RAF 循环渲染，
 * 自动上传 ShaderToy 内置 uniform（iResolution / iTime / iMouse / iFrame / iTimeDelta）。
 */
export class STNPlayer {
  private static readonly INSERT_TAG = '//=#*INSERT_LOCATION*#=';

  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;

  private mouseOriX = 0;
  private mouseOriY = 0;
  private mousePosX = 0;
  private mousePosY = 0;
  private mouseIsDown = false;
  private mouseSignalDown = false;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.canvas = gl.canvas as HTMLCanvasElement;
    this.refreshCanvasSize();

    this.canvas.onmousedown = this.onmousedown.bind(this);
    this.canvas.onmousemove = this.onmousemove.bind(this);
    this.canvas.onmouseup = this.onmouseup.bind(this);
  }

  private onmousedown(ev: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseOriX = Math.floor((ev.clientX - rect.left) / (rect.right - rect.left) * this.canvas.width);
    this.mouseOriY = Math.floor(this.canvas.height - (ev.clientY - rect.top) / (rect.bottom - rect.top) * this.canvas.height);
    this.mousePosX = this.mouseOriX;
    this.mousePosY = this.mouseOriY;
    this.mouseIsDown = true;
    this.mouseSignalDown = true;
  }

  private onmousemove(ev: MouseEvent) {
    if (!this.mouseIsDown) return;
    const rect = this.canvas.getBoundingClientRect();
    this.mousePosX = Math.floor((ev.clientX - rect.left) / (rect.right - rect.left) * this.canvas.width);
    this.mousePosY = Math.floor(this.canvas.height - (ev.clientY - rect.top) / (rect.bottom - rect.top) * this.canvas.height);
  }

  private onmouseup() {
    this.mouseIsDown = false;
  }

  /**
   * 开始运行：编译着色器并启动渲染循环。
   * @param glslCode 包含 mainImage(out vec4, in vec2) 的 ShaderToy glsl 代码
   */
  public run(glslCode: string) {
    const gl = this.gl;

    // 拼接着色器，组装 glProgram
    const vsCode: string = baseVS;
    const fsCode: string = baseFS.replace(STNPlayer.INSERT_TAG, glslCode);
    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!vs || !fs) throw new Error('createShader failed');
    gl.shaderSource(vs, vsCode);
    gl.shaderSource(fs, fsCode);
    gl.compileShader(vs);
    this.checkCompile(vs, 'VS');
    gl.compileShader(fs);
    this.checkCompile(fs, 'FS');

    const program = gl.createProgram();
    if (!program) throw new Error('createProgram failed');
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error(`linkProgram error : ${info}`);
    }

    gl.hint(gl.FRAGMENT_SHADER_DERIVATIVE_HINT, gl.NICEST);
    gl.useProgram(program);

    // 全屏大三角形顶点（仅需 3 个顶点覆盖视口）
    //     0
    //   /   \
    //  2 --- 1
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 3, 2, -1, -2, -1]), gl.STATIC_DRAW);

    const aPositionAddr = gl.getAttribLocation(program, 'a_Position');
    gl.enableVertexAttribArray(aPositionAddr);
    gl.vertexAttribPointer(aPositionAddr, 2, gl.FLOAT, false, 0, 0);

    const baseDraw = () => {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // 渲染循环：更新 uniform 并绘制
    let lastTime = Date.now();
    let frame = 0;
    let totalTimeSec = 0;
    const loop = () => {
      if (!this.gl) return; // 已 dispose
      const now = Date.now();
      const dt = (now - lastTime) * 0.001;
      totalTimeSec += dt;
      lastTime = now;

      gl.uniform3f(gl.getUniformLocation(program, 'iResolution'), gl.canvas.width, gl.canvas.height, 1);
      gl.uniform1f(gl.getUniformLocation(program, 'iTime'), totalTimeSec);
      gl.uniform1f(gl.getUniformLocation(program, 'iTimeDelta'), dt);
      gl.uniform4f(gl.getUniformLocation(program, 'iMouse'), this.mousePosX, this.mousePosY, this.mouseOriX, this.mouseOriY);
      gl.uniform1i(gl.getUniformLocation(program, 'iFrame'), frame);

      baseDraw();
      requestAnimationFrame(loop);
      frame++;
    };
    loop();
  }

  /**
   * 按 canvas 当前 CSS 尺寸刷新绘制缓冲大小。
   */
  public refreshCanvasSize() {
    const canvas = this.canvas;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    this.gl.viewport(0, 0, canvas.width, canvas.height);
    this.gl.scissor(0, 0, canvas.width, canvas.height);
  }

  /**
   * 释放播放器：渲染循环将在下一帧停止。
   */
  public dispose() {
    this.gl = null as unknown as WebGL2RenderingContext;
    this.canvas = null as unknown as HTMLCanvasElement;
  }

  private checkCompile(shader: WebGLShader, tag: string) {
    const gl = this.gl;
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      throw new Error(`compiles shader error : ${tag}\n${log}`);
    }
  }
}
