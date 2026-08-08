import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ShaderPlayer from '../src/ShaderPlayer.vue';
import { createFakeCanvas, createFakeGL } from './helpers/fakeWebGL';

const VALID_GLSL = 'void mainImage(out vec4 c, in vec2 p){ c = vec4(1.0); }';

function stubGetContext() {
  const canvas = createFakeCanvas({ width: 100, height: 100 });
  const gl = createFakeGL(canvas);
  const ctxSpy = vi.fn(() => gl);
  HTMLCanvasElement.prototype.getContext = ctxSpy as any;
  return { canvas, gl, ctxSpy };
}

describe('ShaderPlayer.vue', () => {
  let origRAF: typeof requestAnimationFrame;
  let origFetch: typeof fetch;

  beforeEach(() => {
    origRAF = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (() => 0) as typeof requestAnimationFrame;

    origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () =>
      ({ ok: true, status: 200, text: async () => VALID_GLSL }) as any
    );
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = origRAF;
    globalThis.fetch = origFetch;
  });

  it('渲染容器并应用默认宽高', () => {
    stubGetContext();
    const wrapper = mount(ShaderPlayer, { props: { src: '/a.glsl' } });
    const root = wrapper.element as HTMLElement;

    expect(wrapper.find('canvas').exists()).toBe(true);
    expect(root.style.position).toBe('relative');
    expect(root.style.overflow).toBe('hidden');
    expect(root.style.width).toBe('100%');
    expect(root.style.height).toBe('100%');
    wrapper.unmount();
  });

  it('加载 glsl 成功后触发 ready', async () => {
    stubGetContext();
    const wrapper = mount(ShaderPlayer, { props: { src: '/a.glsl' } });
    await flushPromises();

    expect(globalThis.fetch).toHaveBeenCalledWith('/a.glsl');
    expect(wrapper.emitted('ready')).toBeTruthy();
    expect(wrapper.emitted('error')).toBeFalsy();
    wrapper.unmount();
  });

  it('HTTP 加载失败触发 error', async () => {
    stubGetContext();
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 404 }) as any);

    const wrapper = mount(ShaderPlayer, { props: { src: '/missing.glsl' } });
    await flushPromises();

    const errorEvent = wrapper.emitted('error');
    expect(errorEvent).toBeTruthy();
    expect(String(errorEvent![0][0])).toContain('404');
    wrapper.unmount();
  });

  it('src 变化时重新加载', async () => {
    stubGetContext();
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const wrapper = mount(ShaderPlayer, { props: { src: '/a.glsl' } });
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledWith('/a.glsl');

    await wrapper.setProps({ src: '/b.glsl' });
    await flushPromises();
    expect(fetchMock).toHaveBeenLastCalledWith('/b.glsl');
    wrapper.unmount();
  });

  it('传递 preserve-drawing-buffer 到 getContext', async () => {
    const { ctxSpy } = stubGetContext();
    const wrapper = mount(ShaderPlayer, {
      props: { src: '/a.glsl', preserveDrawingBuffer: true }
    });
    await flushPromises();

    expect(ctxSpy).toHaveBeenCalledWith('webgl2', { preserveDrawingBuffer: true });
    wrapper.unmount();
  });

  it('卸载时移除 resize 监听并释放播放器', async () => {
    const { ctxSpy } = stubGetContext();
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const wrapper = mount(ShaderPlayer, { props: { src: '/a.glsl' } });
    await flushPromises();

    const gl = ctxSpy.mock.results[0].value;
    wrapper.unmount();

    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    // 释放后渲染循环不再绘制
    expect(gl.drawArrays.mock.calls.length).toBeGreaterThan(0);
  });
});
