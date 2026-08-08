/**
 * ShaderToy 播放器着色器模板。
 * baseFS 通过 //=#*INSERT_LOCATION*#= 注入用户的 mainImage 代码。
 */

export const baseVS = `#version 300 es
    #ifdef GL_ES
        precision highp float;
        precision highp int;
        precision mediump sampler3D;
    #endif
    in vec2 a_Position;
    void main() {
        gl_Position = vec4(a_Position.xy, 0.0, 1.0);
    }
`;

export const baseFS = `#version 300 es
    #ifdef GL_ES
        precision highp float;
        precision highp int;
        precision mediump sampler3D;
    #endif
    #define HW_PERFORMANCE 1
    out vec4 color;
    uniform vec3      iResolution;
    uniform float     iTime;
    uniform vec4      iMouse;
    uniform int       iFrame;
    uniform float     iTimeDelta;
    //=#*INSERT_LOCATION*#=
    void main(){
        vec4 col = vec4(0.0, 0.0, 0.0, 1.0);
        mainImage(col, gl_FragCoord.xy);
        color = col;
    }
`;
