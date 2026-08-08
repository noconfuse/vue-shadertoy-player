// ============================================================
// vue-shadertoy-player 进阶示例：跟随鼠标的彩色光斑
// ============================================================
// 演示 iMouse 使用。按住并拖动鼠标可在画布上拖出一道彩色光斑。
// 注意：组件会持续把 iMouse.xy 上传为当前像素坐标（y 轴已翻转为底部为 0）。

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