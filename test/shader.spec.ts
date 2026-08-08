import { describe, it, expect } from 'vitest';
import { baseVS, baseFS } from '../src/shader';

const USER_CODE = 'void mainImage(out vec4 fragColor, in vec2 fragCoord) { fragColor = vec4(1.0); }';

describe('shader 模板', () => {
  it('baseVS 声明顶点着色器入口', () => {
    expect(baseVS).toContain('#version 300 es');
    expect(baseVS).toContain('in vec2 a_Position');
    expect(baseVS).toContain('void main()');
  });

  it('baseFS 包含注入标记与 mainImage 调用', () => {
    expect(baseFS).toContain('//=#*INSERT_LOCATION*#=');
    expect(baseFS).toContain('mainImage(col, gl_FragCoord.xy)');
    expect(baseFS).toContain('iResolution');
    expect(baseFS).toContain('iTime');
    expect(baseFS).toContain('iMouse');
    expect(baseFS).toContain('iFrame');
  });

  it('baseFS 注入用户代码后得到完整片段着色器', () => {
    const merged = baseFS.replace('//=#*INSERT_LOCATION*#=', USER_CODE);
    expect(merged).toContain(USER_CODE);
    expect(merged).not.toContain('//=#*INSERT_LOCATION*#=');
  });
});
