const fs = require("node:fs");
const makeShaderSource = (iterations, dither) => {
  const antiBanding = dither ? "" : "    cl += (rf(I).x - 0.5) / 255.0;\n";
  return `
const float T = 6.283185;
const float N = ${iterations.toFixed(1)};

vec2 rf(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.xx + p.yx) * p.xy);
}

vec3 tm(vec3 x) {
  x *= 4.0;
  return x / (1.0 + x);
}

float lm(vec3 cl) {
  return dot(cl, vec3(0.299, 0.587, 0.114));
}

vec3 hr(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float sc(vec2 st, float r) {
  return length(st) - r;
}

vec2 tb(vec2 q, float t, float it) {

  mat2 m0 = mat2(0.6, -0.25, 0.25, 0.9);

  mat2 m1 = mat2(0.6, -0.8, 0.8, 0.6);

  float f = mix(2.0, 15.0, uFrequency);
  float a = uAmplitude;
  float g = 1.4;
  float at = t;

  const int L = 4;
  for(int i = 0; i < L; i++) {

    vec2 rp = q * m0;
    vec2 w = sin(f * rp + float(i) * at + it);

    q += (a / f) * m0[0] * w;

    m0 *= m1;
    a *= mix(1.0, max(w.x, w.y), uVariance);
    f *= g;
  }

  return q;
}

${dither ? makeDitherSource(dither) : ""}void mainImage(out vec4 O, in vec2 I) {
${
  dither
    ? `  vec2 c = floor(I / uPixelSize);
  I = (c + 0.5) * uPixelSize;
`
    : ""
}  vec2 uv = I / iResolution.xy;

  vec3 pp = vec3(0.0);

  float t = uPhase;

  vec2 q = (uv - 0.5) * uSpan;

  vec2 pv = tb(q, t, 0.0 - 1.0 / N);
  float sp = mix(1.0, T, 0.5);

  float rn = length(q) / max(uScale, 1e-5);

  float ho = mix(uCore, 1.0, smoothstep(uHollow, 1.0, rn));

  for(float i = 1.0; i < N + 1.0; i++) {
    float k = i / N;
    vec2 st = tb(q, t, k * sp);

    float sd = sc(st, uScale * (1.0 - uDepth * k));
    float d = abs(sd);
    float pd = distance(st, pv);
    pv = st;

    float db = exp2(pd * 2.0 * 1.4426950408889634) - 1.0;
    float e = uBlur * 0.05 + max(db * uSmoothing, 0.001);

    float sh = smoothstep(0.0, e, d) - 1.0;
    float bd = smoothstep(0.0, e, max(sd, 0.0)) - 1.0;
    float ik = mix(sh, bd, uFill) * ho;

    vec3 cl = uColor;
    if(dot(abs(uHsvDelta), vec3(1.0)) > 0.001) {

      float w = 0.5 + 0.5 * sin(T * (uHueDrift + k * uColorShift * 1.5));

      vec3 hs = uColorHsv + uHsvDelta * smoothstep(0.2, 0.8, w);
      hs.x = fract(hs.x);
      hs.yz = clamp(hs.yz, 0.0, 1.0);
      cl = hr(hs);
    }

    pp += ik * cl;
  }

  pp *= 1.0 / N;

  vec2 hp = q - vec2(-0.3, 0.3) * uScale;
  float ss = uHighlight * exp(-dot(hp, hp) / max(uScale * uScale * 0.07, 1e-6));
  vec3 hl = ss * uHighlightColor;

  vec3 cl;

  if(uMode < 0.5) {
    cl = (-pp * uDensity) * 1.2 + hl;
${antiBanding}    cl = tm(cl);
    float al = lm(cl) * uMix;
    O = vec4(cl * uMix, al);
  }

  else {
    cl = -pp * uDensity + hl;
${antiBanding}
    float br = length(cl);
    vec3 di = br > 0.0 ? cl / br : cl;

    float fa = 2.0;
    float mb = (br * fa) / (1.0 + br * fa);
    cl = di * mb;

    float gr = dot(cl, vec3(0.2, 0.5, 0.1));
    float sb = 3.0;
    cl = mix(vec3(gr), cl, sb);

    cl = clamp(cl, 0.0, 1.0);

    float al = mb * clamp(uMix, 1.0, 2.0);
    O = vec4(cl, al);
  }
${
  dither
    ? `
  float th = dt(c);
  O = vec4(
    qz(O.r, uDitherLevels, th),
    qz(O.g, uDitherLevels, th),
    qz(O.b, uDitherLevels, th),
    qz(O.a, uDitherAlphaLevels, th)
  );
`
    : ""
}}`;
};

fs.writeFileSync("src/visualizer/pipecat-wave.frag.ts", "// Pipecat UI / Daily, BSD-2-Clause. See public/licenses/pipecat-ui-BSD-2-Clause.txt.\n// Shader extracted without algorithm changes; 24 ribbons, dithering disabled.\nexport const PIPECAT_FRAGMENT_BODY = " + JSON.stringify(makeShaderSource(24, null)) + ";\n");
