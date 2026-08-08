// ============================================================
// vue-shadertoy-player 示例：彩虹脉冲圆环
// ============================================================
// 经典的 ShaderToy 单 pass 风格代码。直接保存为 ripple.glsl，
// 通过 <ShaderPlayer src="/ripple.glsl" /> 加载即可运行。
//
// 注意：本文件不应包含 #version / precision / uniform 声明，
// 组件的 FS 模板会自动注入这些内容。

void mainImage(out vec4 col, in vec2 fragCoord) {
    // 1. 把 fragCoord 归一化到 [-1, 1]，并按 iResolution.y 做宽高比修正
    //    这样无论画布是宽是扁，圆形看起来都是真正的圆
    vec2 uv = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    // 2. 与画面中心的距离 d，用于构造圆环
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