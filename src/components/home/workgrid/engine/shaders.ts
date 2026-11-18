// Olwtelet: TILE_FRAG / TILE_VERT now draw the grid's lines analytically (gapCoverage) and composite the premultiplied
// label atlas; everything else below is unchanged.
// GLSL sources copied VERBATIM from the original page chunk (module 55607 and module 3247):
//   docs/recon/shaders/grid-tile.authored.{vert,frag}, grid-distortion-vignette.authored.*, intro-pixel-morph.authored.*,
//   intro-particle-dude.authored.*, noise-lib-3247.authored.glsl. three adds the GLSL3 prefix (#version 300 es, varying→in/out,
//   texture2D→texture, gl_FragColor→pc_fragColor) exactly like r175 did on the original (runtime-webgl2.* captures).

/** module 55607 `T` — tile fragment shader */
export const TILE_FRAG = `
  precision highp float;

  const float INACTIVE_LABEL_OPACITY = 0.8;
  const float CELL_BLUR_OPACITY = 0.7;

  varying vec2 vUv;
  varying vec2 vBlurUv;
  varying vec2 vMediaUv;
  varying vec4 vCellBoundsUv;
  varying vec2 vTileUv;
  flat varying float vInstanceIndex;
  flat varying float vAtlasIndex;

  // Olwtelet: the grid's lines, drawn here (see gapCoverage)
  const vec3 GAP_COLOR = vec3(0.2462); // GridBackground "#888" in the linear pipeline (≈ #3f3f3f on screen)
  const float GAP_HALF = 0.001;        // half of the replica's 0.002-unit gap between 0.998 tiles

  uniform sampler2D colorMap0;
  uniform sampler2D alphaMap0;
  uniform sampler2D labelMap0;

  uniform sampler2D colorMap1;
  uniform sampler2D alphaMap1;
  uniform sampler2D labelMap1;

  uniform sampler2D colorMap2;
  uniform sampler2D alphaMap2;
  uniform sampler2D labelMap2;

  uniform float[4] activeInstance;
  uniform float[4] activeInstanceIntensity;
  uniform float opacity;

  struct ColorPack {
    vec4 video;
    vec4 label;
  };

  float mapLinear(float scalar, float min1, float max1, float min2, float max2) {
    return min2 + (scalar - min1) * (max2 - min2) / (max1 - min1);
  }

  ColorPack getColorPack(
    sampler2D colorMap0,
    sampler2D alphaMap0,
    sampler2D labelMap0,
    sampler2D colorMap1,
    sampler2D alphaMap1,
    sampler2D labelMap1,
    sampler2D colorMap2,
    sampler2D alphaMap2,
    sampler2D labelMap2,
    vec2 uv,
    vec2 mediaUv,
    vec4 uvBounds,
    int index
  ) {

    vec4 video = vec4(0.,0.,0.,0.);
    vec4 label = vec4(0.,0.,0.,0.);

    vec2 boundedMediaUv = vec2(
      clamp(mediaUv.x, uvBounds.x, uvBounds.z),
      clamp(mediaUv.y, uvBounds.y, uvBounds.w)
    );
    bool isMediaInBounds = true;
    if(length(boundedMediaUv - mediaUv) > 0.) {
      isMediaInBounds = false;
    }

    if(index == 0) {
      label = texture2D(labelMap0, uv);
      if(isMediaInBounds == true) {
        video.rgb = texture2D(colorMap0, mediaUv).xyz;
        video.a = texture2D(alphaMap0, mediaUv).r;
      }
    }
    if(index == 1) {
      label = texture2D(labelMap1, uv);
      if(isMediaInBounds) {
        video.rgb = texture2D(colorMap1, mediaUv).xyz;
        video.a = texture2D(alphaMap1, mediaUv).r;
      }
    }
    if(index == 2) {
      label = texture2D(labelMap2, uv);
      if(isMediaInBounds) {
        video.rgb = texture2D(colorMap2, mediaUv).xyz;
        video.a = texture2D(alphaMap2, mediaUv).r;
      }
    }

    return ColorPack(video, label);
  }

  vec3 getBlurColor(sampler2D map0, sampler2D map1, sampler2D map2, vec2 uv, int index) {
    const float steps = 2.0;
    vec3 col = vec3(0.0);

    // Get texel size from the appropriate texture
    vec2 texelSize;
    if(index == 0) {
        texelSize = 1.0 / vec2(textureSize(map0, 0));
    } else if(index == 1) {
        texelSize = 1.0 / vec2(textureSize(map1, 0));
    } else if(index == 2) {
        texelSize = 1.0 / vec2(textureSize(map2, 0));
    }

    for(float x = -steps; x <= steps; x++) {
        for(float y = -steps; y <= steps; y++) {
            vec2 offset = vec2(x, y) * texelSize;
            if(index == 0) {
              col += texture2D(map0, uv + offset).rgb;
            } else if(index == 1) {
              col += texture2D(map1, uv + offset).rgb;
            } else if(index == 2) {
              col += texture2D(map2, uv + offset).rgb;
            }
        }
    }
    return col / ((steps * 2.0 + 1.0) * (steps * 2.0 + 1.0));
  }

  // Olwtelet: exact coverage of this pixel by the line centred on the nearest tile edge (box filter). Tiles abut, every
  // pixel is drawn by exactly one tile, so the line's energy on screen is the same whatever its sub-pixel position: it
  // glides as the grid moves instead of popping on and off (the replica's 0.35–1 px geometric gap, without
  // antialiasing in the composer's target, was either fully lit or absent).
  float gapCoverage(vec2 tileUv, vec2 px) {
    vec2 d = min(tileUv, 1. - tileUv);
    vec2 hp = px * .5;
    vec2 cov = clamp(min(d + GAP_HALF, hp) - max(d - GAP_HALF, -hp), 0., 1.) / max(px, vec2(1e-6));
    cov = clamp(cov, 0., 1.);
    return 1. - (1. - cov.x) * (1. - cov.y);
  }

  void main() {
    int atlasIndex = int(vAtlasIndex);
    // derivatives in uniform control flow, before any branch
    float gap = gapCoverage(vTileUv, fwidth(vTileUv));

    ColorPack pack = getColorPack(
      colorMap0,
      alphaMap0,
      labelMap0,
      colorMap1,
      alphaMap1,
      labelMap1,
      colorMap2,
      alphaMap2,
      labelMap2,
      vUv,
      vMediaUv,
      vCellBoundsUv,
      atlasIndex
    );

    vec4 video = pack.video;
    vec4 label = pack.label;
    float labelAlpha = INACTIVE_LABEL_OPACITY;


    vec3 background = vec3(0., 0., 0.);

    for(int i = 0; i < 4; i++) {
      if(int(activeInstance[i]) == int(vInstanceIndex)) {
        background = getBlurColor(colorMap0, colorMap1, colorMap2, vBlurUv, atlasIndex) * CELL_BLUR_OPACITY * activeInstanceIntensity[i];
        labelAlpha = mapLinear(activeInstanceIntensity[i], 0., 1., INACTIVE_LABEL_OPACITY, 1.);
      }
    }

    label *= labelAlpha;

    vec3 albedo = background;
    albedo = mix(albedo, video.rgb, video.a);
    // Olwtelet: the label atlas is premultiplied (mipmapped, see AtlasAssets.getLabelTexture); the same result as the
    // replica's mix(albedo, label.rgb, label.a) on its straight-alpha texels: albedo·(1−L·a) + L²·a·rgb
    albedo = albedo * (1. - label.a) + label.rgb * labelAlpha;

    // the line is not faded with the tiles, as the replica's background plane was not
    gl_FragColor = vec4(mix(albedo * opacity, GAP_COLOR, gap), 1.);
  }
`;

/** module 55607 `k` — tile vertex shader */
export const TILE_VERT = `
  precision highp float;

  const float BLUR_ZOOM = 20.;
  const float MEDIA_ZOOM = 0.7;
  const float GRID_SIZE = 6.;
  const float BOUNDS_PADDING = 0.001;

  attribute vec2 uvOffset;
  attribute float instanceIndex;
  attribute float atlasIndex;

  varying vec2 vUv;
  varying vec2 vMediaUv;
  varying vec2 vBlurUv;
  varying vec4 vCellBoundsUv;
  varying vec2 vTileUv;
  flat varying float vInstanceIndex;
  flat varying float vAtlasIndex;

  float map(float value, float min1, float max1, float min2, float max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
  }

  vec2 getTransformedUv(vec2 offset, vec2 uv, float zoom) {
    float cellSize = (1. / GRID_SIZE) / zoom;
    float halfCell = cellSize / 2.;
    float halfCellClamp = (1. / GRID_SIZE) / 2.;

    float x = map(uv.x, 0., 1., -halfCell, halfCell);
    float y = map(uv.y, 0., 1., 1. - halfCell, 1. + halfCell);

    return vec2(x, y) + vec2(offset.x, -offset.y) + vec2(halfCellClamp, -halfCellClamp);
  }

  vec4 getCellBoundsUv(vec2 offset) {
    vec2 minBound = getTransformedUv(offset, vec2(0.,0.), 1.);
    vec2 maxBound = getTransformedUv(offset, vec2(1.,1.), 1.);
    return vec4(minBound.x + BOUNDS_PADDING, minBound.y + BOUNDS_PADDING, maxBound.x - BOUNDS_PADDING, maxBound.y - BOUNDS_PADDING);
  }

  void main() {
      gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);

      vUv = getTransformedUv(uvOffset, uv, 1.);
      vMediaUv = getTransformedUv(uvOffset, uv, MEDIA_ZOOM);
      vCellBoundsUv = getCellBoundsUv(uvOffset);
      vBlurUv = getTransformedUv(uvOffset, uv, BLUR_ZOOM);
      vTileUv = uv;
      vInstanceIndex = instanceIndex;
      vAtlasIndex = atlasIndex;
  }
`;

/** module 55607 `e4` — DistortionShader fragment (barrel/pincushion + vignette) */
export const DISTORTION_FRAG = `
uniform sampler2D tDiffuse;
uniform vec2 distortion;
uniform float vignetteOffset;
uniform float vignetteDarkness;
uniform bool isVignette;

varying vec2 vUv;

const vec2 CENTER = vec2(0.5);

vec2 getTransfrom(vec2 uv){
  vec2 mappedUV = 2. * ( uv - .5 );

  vec3 distortedValue = vec3(( 0.88 + distortion * dot( mappedUV, mappedUV ) ) * mappedUV, 1.);
  return distortedValue.xy * .5 + .5;
}

void main() {
  vec3 color = vec3(0.);
  vec2 distortedUV = getTransfrom(vUv);
  if ( distortedUV.x >= 0. && distortedUV.x <= 1. && distortedUV.y >= 0. && distortedUV.y <= 1. ) {
    color = texture2D( tDiffuse, distortedUV ).rgb;
  }

  if(isVignette){
    float dist = distance(vUv, CENTER);
    color *= smoothstep(0.8, vignetteOffset * 0.799, (vignetteDarkness + vignetteOffset) * dist);
  }

  gl_FragColor = vec4(color, 1.);
}`;

/** module 55607 `e5` — DistortionShader vertex */
export const DISTORTION_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

/** module 55607 `eu` — intro sprite (pixel mosaic + frame cross-fade) fragment */
export const MORPH_FRAG = `
  precision mediump float;

  uniform sampler2D texture1;
  uniform sampler2D texture2;
  uniform float morphFactor;
  uniform float pixelSize;
  uniform vec2 resolution;
  uniform float fade;

  varying vec2 v_texCoord;

  // Cubic ease-in function
  float easeInCubic(float t) {
    return t * t * t;
  }

  vec2 getPixelatedCoord(vec2 uv) {
    if (pixelSize <= 1.0) return uv;
    vec2 dxy = pixelSize / resolution;
    return dxy * (floor(uv / dxy) + 0.5);
  }

  void main() {
    vec2 pixelatedCoord = getPixelatedCoord(v_texCoord);
    vec4 color1 = texture2D(texture1, pixelatedCoord);
    vec4 color2 = texture2D(texture2, pixelatedCoord);
    float eased_morphFactor = easeInCubic(morphFactor);
    gl_FragColor = mix(color1, color2, eased_morphFactor) * fade;
  }
`;

/** module 55607 `eh` — intro sprite vertex */
export const MORPH_VERT = `
  varying vec2 v_texCoord;
  void main() {
    v_texCoord = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** module 55607 `K` — particle fragment (intro mark) */
export const PARTICLE_FRAG = `
varying vec3 vColor;
uniform sampler2D particleMap;
uniform float brightness;
uniform float opacity;

void main() {
  vec2 cxy = 2.0 * gl_PointCoord - 1.0;
  if (dot(cxy, cxy) > 1.0) discard;

  vec2 uv = gl_PointCoord.xy;
  uv.y = 1.0 - uv.y;

  vec3 color = vColor * texture2D(particleMap, uv).rgb;
  color *= brightness;
  float alpha = 1.;

  gl_FragColor = vec4(color, alpha * opacity);
}
`;

/** module 3247 export R (`${s}${r}${n}${o}`) — noise library */
const NOISE_S = `
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
const NOISE_R = `
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
const NOISE_N = `
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
const NOISE_O = `
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
export const NOISE_LIB = `${NOISE_S}${NOISE_R}${NOISE_N}${NOISE_O}`;

/** module 55607 `$` */
const PARTICLE_SIZE = `

float particleSize(vec4 screenPos, mat4 mtxProj, vec2 viewport, float radius) {
	return viewport.y * mtxProj[1][1] * radius / screenPos.w;
}
 `;

/** module 55607 `J` — particle vertex (intro mark) */
export const PARTICLE_VERT = `
attribute vec4 vRandom;

varying vec3 vColor;
uniform vec2 viewport;

uniform float offsetX;
uniform float offsetY;
uniform float offsetZ;
uniform float totalScale;
uniform float pScaleMin;
uniform float pScaleMax;
uniform float time;

uniform float curlFreq;
uniform float noiseScale;

#define PI 3.1415926535

${NOISE_LIB}
${PARTICLE_SIZE}

void main() {
  vec3 pos = position;

  float t = time * 0.015;
  float pScale = mix(pScaleMin, pScaleMax, (vRandom.x))* totalScale;
  float unit = 0.0001;
  pos.x += mix(-unit * offsetX, unit * offsetX, vRandom.w);
  pos.y += mix(-unit * offsetY, unit * offsetY, vRandom.y);
  pos.z += mix(-unit * offsetZ, unit * offsetZ, vRandom.z);

  //noise displacement
  pos += curlNoise(pos * curlFreq + t) * noiseScale * 0.1;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);;
  gl_PointSize = particleSize(gl_Position, projectionMatrix, viewport, pScale);
  //assign vertex color here
  vColor = vec3(1.0);
}
`;
