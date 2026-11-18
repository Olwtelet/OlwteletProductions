// GLSL of the team particle portraits — copied verbatim from the original chunk 105
// (module 3247 = shared noise: mod289/permute/taylorInvSqrt/fade, snoise + sNoise3, cnoise, curlNoise;
//  module 60105 = fragment `v` and vertex `m`). docs/recon/about.md §7.4

const noiseCommon = `
  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 permute(vec4 x) {
    return mod289(((x*34.0)+1.0)*x);
  }

  vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
  }

  vec3 fade(vec3 t) {
    return t*t*t*(t*(t*6.0-15.0)+10.0);
  }
`;

const simplex = `
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1. + 3.0 * C.xxx;

    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 1.0 / 7.0;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  vec3 sNoise3(vec3 x) {
    float s = snoise(vec3(x));
    float s1 = snoise(vec3(x.y - 19.1, x.z + 33.4, x.x + 47.2));
    float s2 = snoise(vec3(x.z + 74.2, x.x - 124.5, x.y + 99.4));
    vec3 c = vec3(s, s1, s2);
    return c;
  }
`;

const classic = `
  float cnoise(vec3 P) {
    vec3 Pi0 = floor(P); // Integer part for indexing
    vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
    Pi0 = mod289(Pi0);
    Pi1 = mod289(Pi1);
    vec3 Pf0 = fract(P); // Fractional part for interpolation
    vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
  }
`;

const curl = `
  vec3 curlNoise(vec3 p) {

    const float e = .1;
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);

    vec3 p_x0 = sNoise3(p - dx);
    vec3 p_x1 = sNoise3(p + dx);
    vec3 p_y0 = sNoise3(p - dy);
    vec3 p_y1 = sNoise3(p + dy);
    vec3 p_z0 = sNoise3(p - dz);
    vec3 p_z1 = sNoise3(p + dz);

    float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
    float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
    float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;

    const float divisor = 1.0 / (2.0 * e);
    return normalize(vec3(x, y, z) * divisor);

  }
`;

/** module 3247 `R` */
export const NOISE_GLSL = `
  ${noiseCommon}
  ${simplex}
  ${classic}
  ${curl}
`;

/** module 60105 `v` */
export const FACE_FRAGMENT = `
  varying vec3 vColor;
  varying float vDistance;
  uniform sampler2D particleMap;
  uniform bool onShading;

  void main() {
    if(vColor.r < 0.){
      discard;
    }

    float dist = distance(gl_PointCoord, vec2(0.5, 0.5));
    vec2 uv = gl_PointCoord.xy;
    uv.y = 1.0 - uv.y;
    vec3 color = onShading ? vColor * texture2D(particleMap, uv).rgb : vColor;

    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    if (dot(cxy, cxy) > 1.0) discard;

    float alpha = (1.04 - clamp(vDistance * 1.5, 0.0, 1.0));
    gl_FragColor = vec4(color, alpha);

  }
`;

/** module 60105 `m` */
export const FACE_VERTEX = `
  attribute vec4 vRandom;
  attribute vec2 vIndex;

  uniform sampler2D depthMap1;
  uniform sampler2D colorMap1;
  uniform sampler2D depthMap2;
  uniform sampler2D colorMap2;
  uniform float offsetX;
  uniform float offsetY;
  uniform float totalScale;
  uniform float brightness;
  uniform float pScaleMin;
  uniform float pScaleMax;
  uniform float faceSize;
  uniform float transition;
  uniform float time;
  uniform float time2;
  uniform float focus;
  uniform float fov;
  uniform float blur;

  uniform float curlFreq1;
  uniform float noiseScale;
  uniform float curlFreq2;
  uniform float noiseScale2;

  uniform float nxScale;
  uniform float nyScale;
  uniform float nzScale;

  uniform float posZ;
  uniform float zScale;

  varying vec3 vColor;
  varying float vDistance;

  #define PI 3.1415926535

  ${NOISE_GLSL}

  void main() {
    vec3 pos = position;
    float t = time * 0.015;
    float t2 = time2 * 0.15;

    //color
    vec3 colorTexture1 = texture2D(colorMap1, vIndex.xy).xyz;
    vec3 colorTexture2 = texture2D(colorMap2, vIndex.xy).xyz;

    float speed = clamp(transition * mix(0.8, .9, transition), 0., 1.0);
    speed = smoothstep(0.0, 1.0, speed);
    vec3 mainColorTexture = mix(colorTexture1, colorTexture2, speed);

    float density =  (mainColorTexture.x + mainColorTexture.y + mainColorTexture.z ) / 3.;
    float pScale = 1.;

    vec3 depthTexture1 = texture2D(depthMap1, vIndex.xy).xyz;
    vec3 depthTexture2 = texture2D(depthMap2, vIndex.xy).xyz;
    vec3 depthValue = mix(depthTexture1, depthTexture2, speed);
    float zDepth = (1. - depthValue.z);

    if((zDepth > 0.3) && (density > 0.015)){
      pos.xy = vIndex * 2.0 - 1.0;
      pos.z = (zDepth * 2.0 - 1.0) * zScale;
      pos *= faceSize;
      pos.z += posZ;

      float fRange = 0.01;
      pScale = mix(pScaleMin, pScaleMax, (density)); //scale min, scale max
      pos.x += mix(-0.0001*offsetX, 0.0001*offsetX, vRandom.w);
      pos.y += mix(-0.0001*offsetY, 0.0001*offsetY, vRandom.y);
      vColor = vec3(density*density*brightness + 0.01); //brightness

      float randomZ = vRandom.y + cnoise(pos * curlFreq2 + t2) * noiseScale2;
      float smoothTransition = abs(sin(speed*PI));
      pos.x += nxScale * randomZ * 0.1 * smoothTransition;
      pos.y += nyScale * randomZ * 0.1 * smoothTransition;
      pos.z += nzScale * randomZ * 0.1 * smoothTransition;

      //noiseA
      pos += curlNoise(pos * curlFreq1 + t) * noiseScale * 0.1;
    }
    else {
      vColor = vec3(-1.);
    }

    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    vDistance = abs(focus + viewPosition.z);
    gl_Position = projectedPosition;

    float pointSize = ((step(1.0 - (1.0 / fov), vRandom.x  )) + 0.1);
    gl_PointSize = pointSize * pScale * vDistance * blur * totalScale;
    ;
  }
`;
