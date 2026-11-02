import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { VOICE_WAVE_FRAGMENT_BODY } from './voice-wave.frag';
import type { VoiceMode } from './conversationState.js';
import type { OverlapEntry } from './overlapState.js';

/** Pipecat's actual Wave shader, with a standalone local-voice controller. */
export interface VoiceWaveProps {
  level: number;
  /** Audio activity can be independent from the semantic palette selected by mode. */
  active?: boolean;
  mode?: VoiceMode;
  /** Participant observed joining the other voice; only used for overlap. */
  overlapEntry?: OverlapEntry;
  /** Real low/mid/high audio band energies, each normalized to 0–1. */
  bands?: [number, number, number];
  reducedMotion?: boolean;
  /** Stop waiting motion only; speech and thinking still animate. */
  idleMotion?: boolean;
  /** Use the semantic CSS fallback without creating a WebGL context. */
  renderer?: 'auto' | 'fallback';
  /** Deprecated compatibility props. Semantic state colors are fixed. */
  color?: string;
  accentColor?: string;
  className?: string;
  style?: CSSProperties;
  /** Receives null after successful preparation or context recovery. */
  onError?: (message: string | null) => void;
}
type RGB = [number, number, number];
const WAITING_COLOR: RGB = [0.16, 0.72, 0.46];
const WAITING_ACCENT: RGB = [0.08, 0.46, 0.33];
const USER_COLOR: RGB = [1, 0, 0];
const USER_ACCENT: RGB = [0.8, 0, 0];
const AGENT_COLOR: RGB = [0.08, 0.42, 1];
const AGENT_ACCENT: RGB = [0.015, 0.72, 1];
const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixColor = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
function hsv([r, g, b]: RGB): RGB {
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  let hue = 0;
  if (d > 0) {
    hue = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hue /= 6;
  }
  return [hue, max === 0 ? 0 : d / max, max];
}

const UNIFORMS = `
uniform vec2 iResolution;
uniform float uPhase, uSpan, uBlur, uScale, uFrequency, uAmplitude;
uniform float uMix, uVariance, uSmoothing, uDensity, uFill, uCore;
uniform float uHollow, uDepth, uHighlight, uHueDrift, uColorShift, uMode, uOverlap, uOverlapEntry, uOverlapProgress;
uniform vec3 uColor, uColorHsv, uHsvDelta, uHighlightColor, uUserColor, uAgentColor;
`;
const VERTEX = 'attribute vec2 aPosition; void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }';
const MAIN = '\nvoid main() { vec4 c = vec4(0.0); mainImage(c, gl_FragCoord.xy); gl_FragColor = c; }';

export function VoiceWave({ level, active, mode, bands, overlapEntry = 'simultaneous', reducedMotion = false, idleMotion = true, renderer = 'auto', className, style, onError }: VoiceWaveProps) {
  const resolvedMode = mode ?? (active ? 'user' : 'waiting');
  const signalActive = active ?? (resolvedMode === 'user' || resolvedMode === 'agent' || resolvedMode === 'overlap');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const fallbackOverlapRef = useRef<HTMLDivElement>(null);
  const props = useRef({ level, mode: resolvedMode, active: signalActive, bands, overlapEntry, reducedMotion, idleMotion, onError });
  props.current = { level, mode: resolvedMode, active: signalActive, bands, overlapEntry, reducedMotion, idleMotion, onError };
  const drawRef = useRef<(() => void) | null>(null);
  const [failed, setFailed] = useState(false);
  const [contextGeneration, setContextGeneration] = useState(0);

  useEffect(() => {
    if (renderer === 'fallback') { props.current.onError?.(null); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let frame = 0;
    let intersecting = true;
    let previous = performance.now();
    let lastDraw = 0;
    let phase = 0.7;
    let hueDrift = 0;
    let energy = 0;
    let pulse = 0;
    let speechBlend = 0;
    let palette: RGB = [...WAITING_COLOR];
    let accentPalette: RGB = [...WAITING_ACCENT];
    let bandLevels: RGB = [0, 0, 0];
    let thinkingBlend = 0;
    let overlapBlend = 0;
    let overlapProgress = 1;
    let wasOverlapping = false;
    let lastOverlapEntry: OverlapEntry = 'simultaneous';
    let thinkingPhase = 0;
    let gl: WebGLRenderingContext | null = null;
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    const shaders: WebGLShader[] = [];
    const fail = (message: string) => {
      if (disposed) return;
      cancelAnimationFrame(frame); frame = 0;
      setFailed(true);
      props.current.onError?.(message);
    };
    try {
      gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, premultipliedAlpha: true, powerPreference: 'low-power' });
      if (!gl) throw new Error('この環境ではWebGLを利用できません。別のブラウザーでお試しください。');
      const compile = (type: number, source: string) => {
        const shader = gl!.createShader(type);
        if (!shader) throw new Error('Waveの描画を準備できませんでした。');
        shaders.push(shader);
        gl!.shaderSource(shader, source);
        gl!.compileShader(shader);
        if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) throw new Error('Waveシェーダーを読み込めませんでした。');
        return shader;
      };
      const highp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
      const precision = highp && highp.precision > 0 ? 'highp' : 'mediump';
      const vertex = compile(gl.VERTEX_SHADER, VERTEX);
      const fragment = compile(gl.FRAGMENT_SHADER, `precision ${precision} float;\n${UNIFORMS}${VOICE_WAVE_FRAGMENT_BODY}${MAIN}`);
      program = gl.createProgram();
      if (!program) throw new Error('Waveの描画プログラムを準備できませんでした。');
      gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Waveの描画を開始できませんでした。');
      gl.useProgram(program);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'aPosition');
      gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.clearColor(0, 0, 0, 0);
      setFailed(false);
      props.current.onError?.(null);
    } catch (error) {
      fail(error instanceof Error ? error.message : 'Waveを表示できませんでした。');
      for (const shader of shaders) gl?.deleteShader(shader);
      if (program) gl?.deleteProgram(program);
      if (buffer) gl?.deleteBuffer(buffer);
      return;
    }
    const graphics = gl;
    const locations = new Map<string, WebGLUniformLocation | null>();
    const uniform = (name: string) => {
      if (!locations.has(name)) locations.set(name, graphics.getUniformLocation(program!, name));
      return locations.get(name)!;
    };
    const scalar = (name: string, value: number) => graphics.uniform1f(uniform(name), value);
    const vector = (name: string, value: RGB) => graphics.uniform3f(uniform(name), ...value);
    const canDraw = () => !disposed && intersecting && !document.hidden && !graphics.isContextLost();
    const requestDraw = () => {
      if (!frame && canDraw()) {
        previous = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };
    const draw = (now: number) => {
      frame = 0;
      if (!canDraw()) return;
      // The soft shader remains smooth at 30 fps; avoid wasted work at idle.
      if (now - lastDraw < 1000 / 30) { frame = requestAnimationFrame(draw); return; }
      const delta = Math.min(0.1, Math.max(0.001, (now - previous) / 1000));
      previous = now; lastDraw = now;
      const config = props.current;
      const speaking = config.active && (config.mode === 'user' || config.mode === 'agent' || config.mode === 'overlap');
      const voice = speaking ? clamp(config.level) : 0;
      // Fast syllable response, relaxed phrase release. Band inputs are measured audio,
      // never phoneme classifications or synthetic oscillators.
      energy += (voice - energy) * (1 - Math.exp(-delta / (voice > energy ? 0.065 : 0.5)));
      pulse += (voice - pulse) * (1 - Math.exp(-delta / (voice > pulse ? 0.035 : 0.22)));
      const rawBands = config.bands ?? [voice, voice, voice];
      bandLevels = bandLevels.map((old, i) => {
        const target = speaking ? clamp(rawBands[i]) : 0;
        return old + (target - old) * (1 - Math.exp(-delta / (target > old ? 0.045 : 0.32)));
      }) as RGB;
      const [low, mid, high] = bandLevels;
      speechBlend += ((speaking ? 1 : 0) - speechBlend) * (1 - Math.exp(-delta / (speaking ? 0.10 : 0.38)));
      const thinking = config.mode === 'thinking';
      const overlap = config.mode === 'overlap';
      if (overlap) {
        if (!wasOverlapping || lastOverlapEntry !== config.overlapEntry) overlapProgress = 0;
        lastOverlapEntry = config.overlapEntry;
        overlapProgress = config.reducedMotion || lastOverlapEntry === 'simultaneous'
          ? 1 : Math.min(1, overlapProgress + delta / 0.85);
      }
      // A short overlap fades from its actual position, not a completed split.
      wasOverlapping = overlap;
      const agentWasFirst = overlap && config.overlapEntry === 'user';
      overlapBlend += ((overlap ? 1 : 0) - overlapBlend) * (1 - Math.exp(-delta / 0.16));
      thinkingBlend += ((thinking ? 1 : 0) - thinkingBlend) * (1 - Math.exp(-delta / 0.25));
      if (!config.reducedMotion) thinkingPhase += delta * Math.PI * 2 / 3;
      const baseTarget = config.mode === 'user' || (overlap && !agentWasFirst) ? USER_COLOR : config.mode === 'agent' || thinking || agentWasFirst ? AGENT_COLOR : WAITING_COLOR;
      const accentTarget = config.mode === 'user' || (overlap && !agentWasFirst) ? USER_ACCENT : config.mode === 'agent' || thinking || agentWasFirst ? AGENT_ACCENT : WAITING_ACCENT;
      const colorAlpha = 1 - Math.exp(-delta / (speaking ? 0.065 : 0.32));
      palette = mixColor(palette, baseTarget, colorAlpha);
      accentPalette = mixColor(accentPalette, accentTarget, colorAlpha);
      const baseHsv = hsv(palette), accentHsv = hsv(accentPalette);
      let hueDifference = accentHsv[0] - baseHsv[0]; hueDifference -= Math.round(hueDifference);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width * dpr)), height = Math.max(1, Math.round(bounds.height * dpr));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      graphics.viewport(0, 0, width, height);
      graphics.uniform2f(uniform('iResolution'), width, height);
      const animate = !config.reducedMotion && (config.mode !== 'waiting' || config.idleMotion);
      const motion = animate ? 1 : 0;
      // Keep a gently rounded, fluid waiting contour. Speech retains the
      // original measured modulation and eased release.
      const pace = mix(2.0, 8, speechBlend) + 48 * energy + 18 * mid;
      phase += delta * 0.05 * pace * motion;
      hueDrift = (hueDrift + delta * 0.0018 * pace * motion) % 1;
      // Reduced motion must settle into a deliberate form, not freeze the
      // warped phase that happened to be on screen when the option changed.
      scalar('uPhase', config.reducedMotion ? 0.7 : phase);
      scalar('uSpan', 1.02); // Upstream fit, preserving margin for full speech.
      scalar('uBlur', 0.2);
      scalar('uScale', config.reducedMotion ? 0.235 : mix(0.225, 0.25, speechBlend) + 0.06 * pulse + 0.025 * low);
      scalar('uFrequency', config.reducedMotion ? 0.23 : mix(0.30, 0.45, speechBlend) + 0.6 * mid + 0.4 * high);
      scalar('uAmplitude', config.reducedMotion ? 0.055 : mix(0.20, 0.35, speechBlend) + 0.5 * energy + 0.5 * mid);
      scalar('uVariance', config.reducedMotion ? 0.014 : mix(0.035, 0.08, speechBlend) + 0.45 * mid + 0.25 * high);
      // One thinking breath every three seconds; reduced motion suppresses it.
      const thoughtPulse = config.reducedMotion ? 1 : mix(1, 0.62 + 0.5 * (0.5 + 0.5 * Math.sin(thinkingPhase)), thinkingBlend);
      scalar('uMix', (config.reducedMotion ? 1.2 : mix(1.15, 1.25, speechBlend) * (1 + 0.55 * energy + 0.35 * high)) * thoughtPulse);
      scalar('uSmoothing', 0.28); scalar('uDensity', 0.55); scalar('uFill', config.reducedMotion ? 0.5 : 0.4);
      scalar('uCore', config.reducedMotion ? 0.2 : 0.1); scalar('uHollow', 0.3); scalar('uDepth', config.reducedMotion ? 0.16 : 0.22);
      scalar('uHighlight', 0.16); scalar('uHueDrift', hueDrift);
      scalar('uColorShift', 0.05 * (1 + 1.6 * (config.reducedMotion ? 0 : energy)));
      scalar('uMode', 0); scalar('uOverlap', overlapBlend);
      scalar('uOverlapEntry', lastOverlapEntry === 'user' ? 1 : lastOverlapEntry === 'agent' ? -1 : 0);
      scalar('uOverlapProgress', overlapProgress);
      vector('uUserColor', USER_COLOR); vector('uAgentColor', AGENT_COLOR);
      vector('uColor', palette); vector('uColorHsv', baseHsv);
      vector('uHsvDelta', [hueDifference, accentHsv[1] - baseHsv[1], accentHsv[2] - baseHsv[2]]);
      // Tint the shine with the palette: no white highlight that turns recording red pink.
      vector('uHighlightColor', palette);
      graphics.clear(graphics.COLOR_BUFFER_BIT);
      graphics.drawArrays(graphics.TRIANGLE_STRIP, 0, 4);
      const colorPending = Math.max(...palette.map((v, i) => Math.abs(v - baseTarget[i])), ...accentPalette.map((v, i) => Math.abs(v - accentTarget[i]))) > 0.001;
      const settling = colorPending || Math.abs(speechBlend - (speaking ? 1 : 0)) > 0.001
        || Math.abs(overlapBlend - (overlap ? 1 : 0)) > 0.001 || Math.abs(thinkingBlend - (thinking ? 1 : 0)) > 0.001
        || Math.abs(energy - voice) > 0.001 || Math.abs(pulse - voice) > 0.001
        || bandLevels.some((value, i) => Math.abs(value - (speaking ? clamp(rawBands[i]) : 0)) > 0.001);
      if (animate || settling) frame = requestAnimationFrame(draw);
    };
    drawRef.current = requestDraw;
    const resize = new ResizeObserver(requestDraw);
    resize.observe(canvas);
    const visibility = () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else requestDraw();
    };
    const intersection = new IntersectionObserver(entries => {
      intersecting = entries[0]?.isIntersecting ?? true;
      if (!intersecting) { cancelAnimationFrame(frame); frame = 0; }
      else requestDraw();
    });
    intersection.observe(canvas);
    const lost = (event: Event) => { event.preventDefault(); fail('WebGLが一時停止したため簡易表示に切り替えました。復旧すると自動で戻ります。'); };
    const restored = () => setContextGeneration(value => value + 1);
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    document.addEventListener('visibilitychange', visibility);
    requestDraw();
    return () => {
      disposed = true; drawRef.current = null;
      cancelAnimationFrame(frame); resize.disconnect(); intersection.disconnect();
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      document.removeEventListener('visibilitychange', visibility);
      if (buffer) graphics.deleteBuffer(buffer);
      if (program) graphics.deleteProgram(program);
      for (const shader of shaders) graphics.deleteShader(shader);
    };
  }, [contextGeneration, renderer]);

  useEffect(() => { drawRef.current?.(); }, [level, active, resolvedMode, bands, overlapEntry, reducedMotion, idleMotion]);

  const fallback = renderer === 'fallback' || failed;
  useEffect(() => {
    const node = fallbackRef.current;
    if (!fallback || !node || reducedMotion) return;
    const thinking = resolvedMode === 'thinking';
    if (!thinking && (resolvedMode !== 'waiting' || !idleMotion)) return;
    const animation = node.animate(thinking
      ? [{ opacity: 0.55 }, { opacity: 0.95 }, { opacity: 0.55 }]
      : [{ borderRadius: '46% 54% 52% 48%' }, { borderRadius: '54% 46% 45% 55%' }, { borderRadius: '46% 54% 52% 48%' }],
    { duration: thinking ? 3000 : 5500, iterations: Infinity, easing: 'ease-in-out' });
    return () => animation.cancel();
  }, [fallback, resolvedMode, idleMotion, reducedMotion]);
  useEffect(() => {
    const node = fallbackOverlapRef.current;
    if (!fallback || !node || resolvedMode !== 'overlap' || reducedMotion || overlapEntry === 'simultaneous') return;
    const animation = node.animate([
      { clipPath: overlapEntry === 'user' ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)' },
      { clipPath: 'inset(0 0 0 0)' },
    ], { duration: 850, easing: 'ease-in-out', fill: 'both' });
    return () => animation.cancel();
  }, [fallback, resolvedMode, overlapEntry, reducedMotion]);
  const fallbackActivity = signalActive && (resolvedMode === 'user' || resolvedMode === 'agent' || resolvedMode === 'overlap') ? clamp(level) : 0;
  return <div className={className} data-wave-state={signalActive ? 'speaking' : resolvedMode === 'thinking' ? 'thinking' : 'calm'} data-wave-mode={resolvedMode} data-wave-active={signalActive} data-wave-overlap-entry={resolvedMode === 'overlap' ? overlapEntry : undefined} data-idle-motion={idleMotion} data-wave-renderer={fallback ? 'fallback' : 'webgl'} style={{ width: '100%', height: '100%', position: 'relative', ...style }}>
    <canvas ref={canvasRef} aria-hidden="true" style={{ width: '100%', height: '100%', display: fallback ? 'none' : 'block' }} />
    {fallback && <div ref={fallbackRef} aria-hidden="true" style={{ position: 'absolute', inset: '25%', borderRadius: '46% 54% 52% 48%',
      background: resolvedMode === 'overlap'
        ? `radial-gradient(ellipse, ${overlapEntry === 'user' ? '#146bff' : '#ff0000'} 0%, transparent 72%)`
        : `radial-gradient(circle at 35% 30%, ${resolvedMode === 'user' ? '#ff0000' : resolvedMode === 'agent' || resolvedMode === 'thinking' ? '#146bff' : '#29b875'} 0%, ${resolvedMode === 'user' ? '#b60000' : resolvedMode === 'agent' || resolvedMode === 'thinking' ? '#05b8ff' : '#147554'} 45%, transparent 72%)`,
      opacity: 0.9, transform: reducedMotion ? undefined : `scale(${1 + fallbackActivity * 0.2})`, transition: reducedMotion ? undefined : 'transform 80ms linear' }}>
      {resolvedMode === 'overlap' && <div ref={fallbackOverlapRef} style={{ position: 'absolute', inset: 0, borderRadius: 'inherit',
        background: 'radial-gradient(ellipse at 25% 50%, #ff0000 0%, transparent 65%), radial-gradient(ellipse at 75% 50%, #146bff 0%, transparent 65%)' }} />}
    </div>}

  </div>;
}
