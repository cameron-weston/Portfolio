import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { content } from './content.js';
import { mountOS } from './os.js';

const $ = (s) => document.querySelector(s);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ───────────────────────── HUD (HTML over the scene) ─────────────────────────
$('#hud-name').textContent = content.name;
$('#hud-tagline').textContent = content.tagline;
for (const l of content.links) {
  const a = document.createElement('a');
  a.textContent = l.label;
  a.href = l.url;
  if (!l.url.startsWith('mailto:')) { a.target = '_blank'; a.rel = 'noopener'; }
  $('#hud-links').append(a);
}

const osEl = $('#os');
const os = mountOS(osEl, content);
const SCREEN_PX = { w: 1280, h: 640 }; // logical size of the in-monitor UI

let webglOK = true;
try {
  init();
} catch (err) {
  console.error(err);
  webglOK = false;
  // No WebGL: show the portfolio UI full-screen so nothing is lost.
  document.body.classList.add('no-webgl', 'in-computer');
  osEl.classList.add('mobile', 'live');
  osEl.style.opacity = 1;
  osEl.setAttribute('aria-hidden', 'false');
  os.open('projects');
  $('#loader').remove();
}

function init() {
  const canvas = $('#scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0a0d);
  const FOV = 35;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 40);

  RectAreaLightUniformsLib.init();

  // ───────────────────────── helpers ─────────────────────────
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
  const glow = (color, intensity = 2) =>
    new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: intensity });

  function add(geo, material, x, y, z, parent = scene) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const box = (w, h, d, material, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), material, x, y, z, parent);
  const rbox = (w, h, d, r, material, x, y, z, parent) =>
    add(new RoundedBoxGeometry(w, h, d, 3, r), material, x, y, z, parent);
  const cyl = (rt, rb, h, material, x, y, z, parent, seg = 24) =>
    add(new THREE.CylinderGeometry(rt, rb, h, seg), material, x, y, z, parent);
  const ball = (r, material, x, y, z, parent) => add(new THREE.SphereGeometry(r, 32, 20), material, x, y, z, parent);
  function rod(a, b, r, material, parent = scene) {
    const d = new THREE.Vector3().subVectors(b, a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 12), material);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.redraw = () => { draw(c.getContext('2d'), w, h); tex.needsUpdate = true; };
    tex.redraw();
    return tex;
  }

  // ───────────────────────── materials ─────────────────────────
  const M = {
    black: std(0x101012, { roughness: 0.55 }),
    darkMetal: std(0x1a1a1d, { roughness: 0.4, metalness: 0.7 }),
    walnut: std(0x2a190f, { roughness: 0.5 }),
    slat: std(0x9c6234, { roughness: 0.55 }),
    slatBack: std(0x1d120b, { roughness: 0.9 }),
    white: std(0xe9e4dc, { roughness: 0.6 }),
    fabric: std(0xb9b3aa, { roughness: 0.95 }),
    leaf: std(0x2d5a37, { roughness: 0.55 }),
    brass: std(0xb08a4a, { roughness: 0.35, metalness: 0.9 }),
    silver: std(0xb8bcc2, { roughness: 0.35, metalness: 0.8 }),
  };

  // ───────────────────────── room shell ─────────────────────────
  const floorTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#6f665c'; g.fillRect(0, 0, w, h);
    const planks = 8, pw = w / planks;
    for (let i = 0; i < planks; i++) {
      const offset = (i * 377) % h;
      for (let j = -1; j < 3; j++) {
        const y = offset + j * 512, shade = 34 + ((i * 7 + j * 13) % 5) * 5;
        g.fillStyle = `hsl(28, 14%, ${shade / 2 + 22}%)`;
        g.fillRect(i * pw + 1, y + 1, pw - 2, 510);
      }
      g.strokeStyle = 'rgba(0,0,0,.18)';
      for (let k = 0; k < 26; k++) {
        const x = i * pw + Math.random() * pw;
        g.lineWidth = Math.random() * 1.4;
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (Math.random() - 0.5) * 8, h); g.stroke();
      }
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(5, 6);

  const floor = add(new THREE.PlaneGeometry(7.2, 11), std(0xffffff, { map: floorTex, roughness: 0.45 }), 0, 0, 5.4);
  floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const backWall = add(new THREE.PlaneGeometry(7.2, 3.2), std(0xc9c2b6, { roughness: 0.95 }), 0, 1.6, 0);
  backWall.castShadow = false;
  const leftWall = add(new THREE.PlaneGeometry(11, 3.2), std(0xb5aea3, { roughness: 0.95 }), -3.6, 1.6, 5.4);
  leftWall.rotation.y = Math.PI / 2; leftWall.castShadow = false;
  const rightWall = add(new THREE.PlaneGeometry(11, 3.2), std(0xcdbb9c, { roughness: 0.95 }), 3.6, 1.6, 5.4);
  rightWall.rotation.y = -Math.PI / 2; rightWall.castShadow = false;
  const ceiling = add(new THREE.PlaneGeometry(7.2, 11), std(0x9a938c, { roughness: 1 }), 0, 3.1, 5.4);
  ceiling.rotation.x = Math.PI / 2; ceiling.castShadow = false;
  box(7.2, 0.09, 0.02, M.white, 0, 0.045, 0.01);
  const rug = add(new THREE.PlaneGeometry(3.4, 2.1), std(0xcbc2b3, { roughness: 1 }), 0.9, 0.006, 1.75);
  rug.rotation.x = -Math.PI / 2; rug.castShadow = false;

  // ───────────────────────── window with animated sunset ─────────────────────────
  const WIN = { x: -2.15, y: 1.62, w: 1.8, h: 2.05 };
  const sunset = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `
      varying vec2 vUv; uniform float t;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n1(float x){ float i=floor(x), f=fract(x); f=f*f*(3.-2.*f); return mix(hash(vec2(i,0.)),hash(vec2(i+1.,0.)),f); }
      vec3 sky(float y, float h){
        vec3 low=vec3(1.0,0.74,0.52), mid=vec3(0.90,0.47,0.58), top=vec3(0.30,0.25,0.52);
        vec3 c=mix(low,mid,smoothstep(h,h+0.26,y));
        return mix(c,top,smoothstep(h+0.2,1.05,y));
      }
      void main(){
        vec2 uv=vUv; float h=0.40;
        vec3 col=sky(uv.y,h);
        float cl=n1(uv.x*2.5+uv.y*10.+t*0.015)*n1(uv.y*26.+2.);
        col+=vec3(0.16,0.07,0.05)*smoothstep(0.3,0.75,cl)*smoothstep(h+0.12,0.9,uv.y);
        float m1=h+0.17+0.10*n1(uv.x*2.3+3.)+0.025*n1(uv.x*9.);
        float m2=h+0.07+0.07*n1(uv.x*3.4+11.)+0.02*n1(uv.x*13.);
        col=mix(col,vec3(0.50,0.37,0.58),smoothstep(m1+0.004,m1-0.004,uv.y));
        col=mix(col,vec3(0.26,0.21,0.40),smoothstep(m2+0.004,m2-0.004,uv.y));
        float nx=uv.x-0.73, ny=uv.y-h;
        float needle=step(abs(nx),0.0045-ny*0.012)*step(0.,ny)*step(ny,0.2);
        needle=max(needle,step(length(vec2(nx/0.03,(ny-0.2)/0.008)),1.));
        needle=max(needle,step(abs(nx),0.0016)*step(0.2,ny)*step(ny,0.25));
        col=mix(col,vec3(0.20,0.16,0.32),needle);
        if(uv.y>h && uv.y<h+0.035){
          vec2 cell=vec2(floor(uv.x*110.),floor(uv.y*260.));
          float tw=0.7+0.3*sin(t*2.+hash(cell)*40.);
          col+=vec3(1.,0.82,0.55)*step(0.90,hash(cell))*tw;
        }
        if(uv.y<h){
          float d=(h-uv.y)/h;
          float rip=sin(uv.y*260./(0.25+d)+t*1.4+sin(uv.x*18.)*2.)*0.012*(1.-d*0.6);
          vec3 refl=sky(h+(h-uv.y)*0.95+rip,h);
          col=mix(refl*0.86,vec3(0.36,0.27,0.46),d*0.5);
          col+=vec3(0.3,0.18,0.12)*pow(max(0.,sin(uv.y*340./(0.3+d)+t*1.8+uv.x*9.)),10.)*0.35*(1.-d);
        }
        gl_FragColor=vec4(col*0.95,1.);
      }`,
  });
  add(new THREE.PlaneGeometry(WIN.w, WIN.h), sunset, WIN.x, WIN.y, 0.012).castShadow = false;
  const fr = 0.055;
  box(WIN.w + fr * 2, fr, 0.09, M.black, WIN.x, WIN.y + WIN.h / 2 + fr / 2, 0.045);
  box(WIN.w + fr * 2, fr, 0.09, M.black, WIN.x, WIN.y - WIN.h / 2 - fr / 2, 0.045);
  box(fr, WIN.h, 0.09, M.black, WIN.x - WIN.w / 2 - fr / 2, WIN.y, 0.045);
  box(fr, WIN.h, 0.09, M.black, WIN.x + WIN.w / 2 + fr / 2, WIN.y, 0.045);
  box(0.04, WIN.h, 0.06, M.black, WIN.x, WIN.y, 0.04);
  box(WIN.w + 0.3, 0.04, 0.16, M.white, WIN.x, WIN.y - WIN.h / 2 - fr - 0.02, 0.08);

  // curtain
  const curtainGeo = new THREE.PlaneGeometry(0.75, 2.85, 60, 1);
  const cp = curtainGeo.attributes.position;
  for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin(cp.getX(i) * 46) * 0.035);
  curtainGeo.computeVertexNormals();
  add(curtainGeo, std(0x8b8d95, { roughness: 1, side: THREE.DoubleSide }), -3.22, 1.5, 0.16);

  // floor plant
  {
    const g = new THREE.Group(); g.position.set(-2.2, 0, 1.05); scene.add(g);
    cyl(0.21, 0.15, 0.42, M.white, 0, 0.21, 0, g);
    cyl(0.19, 0.19, 0.02, std(0x2a1d14), 0, 0.414, 0, g); // soil sits just proud of the pot's top face
    rod(V(0, 0.4, 0), V(0.05, 1.95, 0.02), 0.014, std(0x3a2a1c), g);
    const leafGeo = new THREE.SphereGeometry(1, 14, 8);
    leafGeo.scale(0.25, 0.012, 0.085); leafGeo.translate(0.27, 0, 0);
    for (let i = 0; i < 17; i++) {
      const k = i / 16;
      const leaf = add(leafGeo, M.leaf, k * 0.05, 0.62 + k * 1.3, k * 0.02, g);
      leaf.rotation.set(0, i * 2.4, 0.42 - k * 0.5 + Math.sin(i * 1.7) * 0.2);
      leaf.scale.setScalar(1.15 - k * 0.35);
    }
  }

  // ───────────────────────── desk wall: prints + posters ─────────────────────────
  // hotspots: glowing dots anchored to 3D points
  const hotspots = [];
  const hotspotLayer = $('#hotspots');
  function hotspot(id, pos) {
    const info = content.hotspots[id];
    if (!info) return;
    const el = document.createElement('button');
    el.className = 'hotspot';
    el.dataset.label = info.label;
    el.setAttribute('aria-label', info.label);
    el.addEventListener('click', (e) => { e.stopPropagation(); showCard(id, el); });
    hotspotLayer.append(el);
    hotspots.push({ id, pos, el });
  }

  // A framed print: black frame, optional cream mount, painted canvas.
  function framed(x, y, w, h, draw, mount = 0) {
    const tex = canvasTex(Math.round(w * 900), Math.round(h * 900), draw);
    box(w + 0.05, h + 0.05, 0.03, M.black, x, y, 0.016);
    if (mount) box(w + 0.01, h + 0.01, 0.004, std(0xe9dfc4, { roughness: 0.9 }), x, y, 0.032).castShadow = false;
    add(new THREE.PlaneGeometry(w - mount * 2, h - mount * 2), std(0xffffff, { map: tex, roughness: 0.75 }), x, y, 0.036).castShadow = false;
  }

  // Tattoo-flash style dragon print (top left of the monitor).
  framed(0.5, 2.32, 0.4, 0.54, (g, w, h) => {
    g.fillStyle = '#ead9a4'; g.fillRect(0, 0, w, h);
    const pt = (k) => [w * (0.5 + Math.sin(k * 7.2) * 0.26 * (1 - k * 0.25)), h * (0.1 + k * 0.72)];
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [lw, col] of [[w * 0.2, '#16211c'], [w * 0.15, '#2f4a3d'], [w * 0.05, '#b5352b']]) {
      g.strokeStyle = col; g.lineWidth = lw; g.beginPath();
      for (let i = 0; i <= 80; i++) { const [x, y] = pt(i / 80); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    g.strokeStyle = '#16211c'; g.lineWidth = w * 0.012;
    for (let i = 2; i < 80; i += 3) {
      const [x, y] = pt(i / 80);
      g.beginPath(); g.arc(x, y, w * 0.07, 0.3, 2.2); g.stroke();
    }
    const [hx, hy] = pt(0);
    g.fillStyle = '#16211c'; g.beginPath(); g.ellipse(hx, hy, w * 0.14, w * 0.1, -0.5, 0, 7); g.fill();
    g.fillStyle = '#ead9a4'; g.beginPath(); g.arc(hx - w * 0.04, hy - w * 0.02, w * 0.018, 0, 7); g.fill();
    g.fillStyle = '#b5352b';
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(hx + w * 0.1, hy); g.lineTo(hx + w * (0.2 + i * 0.02), hy - w * (0.12 - i * 0.05)); g.lineTo(hx + w * 0.12, hy + w * 0.03); g.fill(); }
    for (const [bx, by] of [[0.2, 0.3], [0.78, 0.42], [0.25, 0.62], [0.72, 0.74], [0.6, 0.16]]) {
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        g.fillStyle = '#f1c7c2'; g.beginPath(); g.arc(w * bx + Math.cos(a) * w * 0.035, h * by + Math.sin(a) * w * 0.035, w * 0.032, 0, 7); g.fill();
      }
      g.fillStyle = '#b5352b'; g.beginPath(); g.arc(w * bx, h * by, w * 0.016, 0, 7); g.fill();
    }
    g.fillStyle = '#16211c'; g.font = `600 ${w * 0.045}px Inter, system-ui, sans-serif`; g.textAlign = 'right';
    g.fillText('SEATTLE, WA', w * 0.93, h * 0.95);
  }, 0.012);

  // Big film poster in red, black and cream: moon, rain, skyline.
  framed(1.5, 2.36, 0.66, 0.96, (g, w, h) => {
    g.fillStyle = '#17110f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8d9a8'; g.beginPath(); g.arc(w * 0.66, h * 0.36, w * 0.36, 0, 7); g.fill();
    g.fillStyle = '#17110f'; g.beginPath(); g.arc(w * 0.44, h * 0.3, w * 0.33, 0, 7); g.fill();
    g.fillStyle = '#c4322b';
    g.beginPath(); g.moveTo(0, h * 0.5); g.lineTo(w * 0.3, h * 0.2); g.lineTo(w * 0.62, h * 0.62); g.lineTo(w * 0.45, h); g.lineTo(0, h); g.fill();
    g.fillStyle = '#17110f';
    for (let i = 0; i < 9; i++) {
      const bw = w * (0.08 + ((i * 37) % 7) * 0.012), bh = h * (0.1 + ((i * 53) % 9) * 0.022);
      g.fillRect(i * w * 0.115 - 4, h - bh, bw, bh);
    }
    g.strokeStyle = 'rgba(232,217,168,.5)'; g.lineWidth = 2;
    for (let i = 0; i < 90; i++) {
      const x = ((i * 97) % 100) / 100 * w, y = ((i * 61) % 100) / 100 * h;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - w * 0.012, y + h * 0.06); g.stroke();
    }
    g.strokeStyle = '#e8d9a8'; g.lineWidth = 5; g.strokeRect(w * 0.035, w * 0.035, w * 0.93, h - w * 0.07);
  });

  // Second film poster on the far right: mint cloud over a little house.
  framed(2.98, 1.95, 0.56, 0.8, (g, w, h) => {
    g.fillStyle = '#231a2b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#6d5a8c'; g.fillRect(0, h * 0.25, w, h * 0.4);
    for (let i = 0; i < 26; i++) {
      const a = i * 2.39996, r = w * (0.06 + (i % 5) * 0.022);
      g.fillStyle = i % 3 ? '#a9d8a4' : '#7fb98a';
      g.beginPath(); g.arc(w * 0.5 + Math.cos(a) * w * 0.3 * (i / 26 + 0.2), h * 0.27 + Math.sin(a) * h * 0.13, r, 0, 7); g.fill();
    }
    g.fillStyle = '#231a2b'; g.beginPath(); g.ellipse(w * 0.5, h * 0.3, w * 0.17, h * 0.035, 0, 0, 7); g.fill();
    g.fillStyle = '#b83a32'; g.fillRect(0, h * 0.7, w, h * 0.3);
    g.fillStyle = '#a9d8a4'; g.fillRect(w * 0.34, h * 0.62, w * 0.32, h * 0.1);
    g.fillStyle = '#231a2b'; g.beginPath(); g.moveTo(w * 0.3, h * 0.62); g.lineTo(w * 0.5, h * 0.54); g.lineTo(w * 0.7, h * 0.62); g.fill();
    for (let i = 0; i < 4; i++) g.fillRect(w * (0.37 + i * 0.07), h * 0.65, w * 0.035, h * 0.04);
    g.strokeStyle = '#b83a32'; g.lineWidth = 4; g.strokeRect(w * 0.04, w * 0.04, w * 0.92, h - w * 0.08);
  });
  hotspot('films', V(1.02, 2.5, 0.05));

  // ───────────────────────── crate bookshelf, left of the desk ─────────────────────────
  {
    const pine = std(0xc49a5e, { roughness: 0.7 });
    const C = { x: -0.95, z: 0.2, w: 0.6, h: 0.34, d: 0.3, t: 0.018 };
    box(C.w, C.t, C.d, pine, C.x, C.t / 2, C.z);
    box(C.w, C.t, C.d, pine, C.x, C.h - C.t / 2, C.z);
    for (const s of [-1, 1]) box(C.t, C.h - C.t * 2, C.d, pine, C.x + s * (C.w - C.t) / 2, C.h / 2, C.z);
    box(C.w - C.t * 2, C.h - C.t * 2, C.t, pine, C.x, C.h / 2, C.z - C.d / 2 + C.t / 2);
    const spines = [0x2c5d8a, 0xe8e2d4, 0x1f1f24, 0x6fa35c, 0xc8553d, 0x3a78b8, 0xd9c7a0, 0x5a2d3a, 0x88a9c4, 0xe9c46a, 0x33405c, 0xb9b3aa, 0x7a4b6a, 0x2f6f5e];
    let bx = C.x - C.w / 2 + C.t + 0.004;
    spines.forEach((c, i) => {
      const bw = 0.022 + ((i * 7) % 5) * 0.005, bh = 0.2 + ((i * 11) % 6) * 0.014;
      if (bx + bw > C.x + C.w / 2 - C.t) return;
      box(bw, bh, 0.17, std(c), bx + bw / 2, C.t + bh / 2 + 0.001, C.z + 0.03);
      bx += bw + 0.002;
    });
    // the reading pile, with the little speaker on top
    const pile = [0xf2efe6, 0xf2efe6, 0xe7dccb, 0xf4f1ea, 0x1d1d22, 0x23232a, 0xf0ede4, 0x2a2420, 0xb9c4cc, 0x3f6b4a, 0x2b4c8c, 0xf3f0e8, 0xe6b422, 0xf1eee6, 0x3a1f2a, 0xc23b32];
    let py = C.h + 0.001;
    pile.forEach((c, i) => {
      const th = 0.016 + ((i * 5) % 4) * 0.004, bw = 0.27 + ((i * 3) % 5) * 0.012;
      const b = box(bw, th, 0.19, std(c, { roughness: 0.7 }), C.x + 0.13 + Math.sin(i * 2.1) * 0.008, py + th / 2, C.z + 0.01);
      b.rotation.y = Math.sin(i * 1.3) * 0.05;
      py += th + 0.0005;
    });
    rbox(0.2, 0.075, 0.085, 0.014, std(0x34383a, { roughness: 0.85 }), C.x + 0.13, py + 0.0375, C.z + 0.01);
    hotspot('experience', V(C.x + 0.13, py + 0.24, C.z));
    // pothos in a black pot
    const px = C.x - 0.16, pz = C.z + 0.01;
    cyl(0.07, 0.055, 0.12, std(0x121214, { roughness: 0.4 }), px, C.h + 0.061, pz);
    const heart = new THREE.SphereGeometry(1, 10, 6); heart.scale(0.055, 0.006, 0.042); heart.translate(0.05, 0, 0);
    const leafA = std(0x3f7a44, { roughness: 0.6 }), leafB = std(0x7fae5a, { roughness: 0.6 });
    for (let i = 0; i < 38; i++) {
      const a = i * 2.39996, r = 0.03 + (i % 7) * 0.02, drop = i > 22 ? (i - 22) * 0.028 : 0;
      const l = add(heart, i % 4 ? leafA : leafB, px + Math.cos(a) * r - drop * 0.25, C.h + 0.15 + (i % 5) * 0.035 - drop, pz + 0.02 + Math.abs(Math.sin(a)) * r);
      l.rotation.set(Math.sin(i) * 0.5, a, 0.5 - drop * 1.2); l.scale.setScalar(0.9 + (i % 3) * 0.25);
    }
    // three little bottles
    [[0x15151a, 0xc9c9cf], [0xb5651d, 0xd9d2c5], [0x1f5f6b, 0xc9a24a]].forEach(([c, cap], i) => {
      const x = C.x - 0.25 + i * 0.075, z = C.z + 0.11;
      rbox(0.05, 0.05, 0.03, 0.006, std(c, { roughness: 0.25, metalness: 0.2 }), x, C.h + 0.026, z);
      cyl(0.012, 0.012, 0.022, std(cap, { roughness: 0.3, metalness: 0.8 }), x, C.h + 0.062, z);
    });
  }

  // ───────────────────────── hanging pothos + air purifier, right corner ─────────────────────────
  {
    const H = { x: 2.52, z: 0.42, pot: 2.22 };
    const rope = std(0xd8c9ae, { roughness: 1 });
    add(new THREE.TorusGeometry(0.022, 0.005, 8, 20), M.silver, H.x, 3.06, H.z);
    rod(V(H.x, 3.04, H.z), V(H.x, 2.78, H.z), 0.008, rope);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.6;
      rod(V(H.x, 2.78, H.z), V(H.x + Math.cos(a) * 0.14, H.pot + 0.05, H.z + Math.sin(a) * 0.14), 0.006, rope);
      rod(V(H.x + Math.cos(a) * 0.14, H.pot + 0.05, H.z + Math.sin(a) * 0.14), V(H.x, H.pot - 0.14, H.z), 0.006, rope);
    }
    rod(V(H.x, H.pot - 0.14, H.z), V(H.x, H.pot - 0.75, H.z), 0.012, rope);
    cyl(0.135, 0.095, 0.15, std(0xb9a98a, { roughness: 0.9 }), H.x, H.pot, H.z);
    const heart = new THREE.SphereGeometry(1, 10, 6); heart.scale(0.065, 0.006, 0.05); heart.translate(0.06, 0, 0);
    const leafA = std(0x3c8a3f, { roughness: 0.55 }), leafB = std(0x8cc152, { roughness: 0.55 });
    for (let i = 0; i < 14; i++) {
      const a = i * 2.39996;
      const l = add(heart, i % 3 ? leafA : leafB, H.x + Math.cos(a) * 0.1, H.pot + 0.1 + (i % 4) * 0.03, H.z + Math.sin(a) * 0.1);
      l.rotation.set(0, -a, 0.5); l.scale.setScalar(1.1);
    }
    for (let v = 0; v < 6; v++) {
      const a = v * 1.05 + 0.4, len = 0.7 + (v % 3) * 0.28;
      let prev = V(H.x + Math.cos(a) * 0.12, H.pot + 0.06, H.z + Math.sin(a) * 0.12);
      const steps = Math.round(len / 0.11);
      for (let k = 1; k <= steps; k++) {
        const sway = Math.sin(k * 1.1 + v) * 0.05;
        const p = V(H.x + Math.cos(a) * (0.17 + k * 0.012) + sway, H.pot + 0.06 - k * 0.11, H.z + Math.sin(a) * (0.17 + k * 0.012));
        rod(prev, p, 0.004, leafA);
        const l = add(heart, (k + v) % 3 ? leafA : leafB, p.x, p.y, p.z);
        l.rotation.set(0.3, k * 2.2 + v, -0.9); l.scale.setScalar(0.9 + (k % 3) * 0.2);
        prev = p;
      }
    }
    // air purifier
    cyl(0.17, 0.17, 0.62, M.white, 2.62, 0.31, 0.36, undefined, 32);
    cyl(0.14, 0.14, 0.012, std(0x55585c, { roughness: 0.5 }), 2.62, 0.625, 0.36, undefined, 32);
  }

  // framed résumé on the wall, left of the panel
  {
    const tex = canvasTex(420, 560, (g, w, h) => {
      g.fillStyle = '#f3efe7'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1b1b1f'; g.font = '44px "Instrument Serif", Georgia, serif';
      g.fillText(content.name, 36, 78);
      g.fillStyle = '#c96f3b'; g.fillRect(36, 98, 90, 5);
      g.fillStyle = '#b9b3a8';
      for (let i = 0; i < 17; i++) {
        if (i % 6 === 0) { g.fillStyle = '#5a5650'; g.fillRect(36, 140 + i * 23, 130, 9); g.fillStyle = '#b9b3a8'; continue; }
        g.fillRect(36, 140 + i * 23, 250 + ((i * 53) % 90), 7);
      }
    });
    scene.userData.resumeTex = tex;
    box(0.44, 0.58, 0.03, M.black, -0.72, 1.78, 0.02);
    add(new THREE.PlaneGeometry(0.38, 0.52), std(0xffffff, { map: tex, roughness: 0.7 }), -0.72, 1.78, 0.037).castShadow = false;
    hotspot('resume', V(-0.72, 2.2, 0.05));
    hotspot('location', V(WIN.x + 0.42, WIN.y + 0.42, 0.05));
  }

  // ───────────────────────── desk + computer ─────────────────────────
  const DESK = { x: 1.0, y: 0.76, z: 0.5, w: 2.4, d: 0.86 };
  const oakTex = canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#b9824a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) {
      g.fillStyle = `hsl(${27 + (i % 3) * 2}, 46%, ${44 + ((i * 7) % 5) * 3}%)`;
      g.fillRect(0, (i * h) / 9, w, h / 9 - 1);
    }
    for (let k = 0; k < 220; k++) {
      const y = Math.random() * h, x = Math.random() * w;
      g.strokeStyle = `rgba(70,38,14,${0.06 + Math.random() * 0.16})`; g.lineWidth = 0.6 + Math.random() * 1.6;
      g.beginPath(); g.moveTo(x, y);
      g.bezierCurveTo(x + 90, y + (Math.random() - 0.5) * 14, x + 190, y + (Math.random() - 0.5) * 14, x + 280 + Math.random() * 200, y + (Math.random() - 0.5) * 8);
      g.stroke();
    }
  });
  rbox(DESK.w, 0.045, DESK.d, 0.012, std(0xffffff, { map: oakTex, roughness: 0.5 }), DESK.x, DESK.y, DESK.z);
  for (const s of [-1, 1]) {
    box(0.08, DESK.y - 0.06, 0.08, M.white, DESK.x + s * 1.02, 0.03 + (DESK.y - 0.06) / 2 - 0.012, DESK.z);
    box(0.08, 0.03, 0.7, M.white, DESK.x + s * 1.02, 0.015, DESK.z);
  }
  box(1.96, 0.05, 0.05, M.white, DESK.x, DESK.y - 0.06, DESK.z);
  const deskTop = DESK.y + 0.0225;

  // white monitor riser
  const RISER = { w: 1.6, d: 0.26, h: 0.11, z: 0.3 };
  box(RISER.w, 0.02, RISER.d, M.white, DESK.x, deskTop + RISER.h - 0.01, RISER.z);
  for (const s of [-1, 1]) box(0.02, RISER.h - 0.021, RISER.d - 0.02, M.white, DESK.x + s * (RISER.w / 2 - 0.05), deskTop + (RISER.h - 0.02) / 2, RISER.z);
  const riserTop = deskTop + RISER.h;

  const SCREEN = { w: 1.36, h: 0.68 };
  const monitor = new THREE.Group(); monitor.position.set(1.0, riserTop, 0.27); scene.add(monitor);
  for (const s of [-1, 1]) rod(V(0, 0.16, -0.01), V(s * 0.27, 0.008, 0.1), 0.008, M.black, monitor);
  box(0.05, 0.2, 0.03, M.black, 0, 0.2, -0.035, monitor);
  const screenY = 0.15 + SCREEN.h / 2 + 0.02;
  const monitorBody = rbox(SCREEN.w + 0.03, SCREEN.h + 0.04, 0.035, 0.012, M.black, 0, screenY, 0, monitor);
  const screenTex = canvasTex(SCREEN_PX.w, SCREEN_PX.h, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#15182f'); gr.addColorStop(0.55, '#3a2a5c'); gr.addColorStop(1, '#b5566c');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(8,8,16,.55)'; g.fillRect(0, 0, w, 30);
    g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = '600 14px Inter, system-ui, sans-serif';
    g.fillText('◆  ' + content.name, 16, 20);
    g.textAlign = 'center';
    g.font = '84px "Instrument Serif", Georgia, serif';
    g.fillText(content.name, w / 2, h / 2 + 4);
    g.font = '500 24px Inter, system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.82)';
    g.fillText('Click to explore my work  →', w / 2, h / 2 + 58);
  });
  const screen = add(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), new THREE.MeshBasicMaterial({ map: screenTex }), 0, screenY, 0.0185, monitor);
  screen.castShadow = screen.receiveShadow = false;
  // webcam
  rbox(0.1, 0.03, 0.035, 0.01, M.black, 0.12, screenY + SCREEN.h / 2 + 0.036, 0.005, monitor);
  cyl(0.009, 0.009, 0.004, std(0x2a2f3a, { roughness: 0.2, metalness: 0.6 }), 0.12, screenY + SCREEN.h / 2 + 0.036, 0.024, monitor).rotation.x = Math.PI / 2;
  const monitorGlow = new THREE.PointLight(0xa9b8ff, 0.5, 2.2);
  monitorGlow.position.set(1.0, riserTop + screenY, 0.75); scene.add(monitorGlow);

  // ── the desk crew, lined up on the riser ──
  const RZ = 0.385;
  const dot = (x, y, z, r = 0.004, m = M.black, parent) => { const b = ball(r, m, x, y, z, parent); b.castShadow = false; return b; };
  {
    // little horned knight
    const k = new THREE.Group(); k.position.set(0.72, riserTop, RZ); k.scale.setScalar(1.35); scene.add(k);
    const cloak = std(0x2b2f3d, { roughness: 0.8 }), bone = std(0xf1efe8, { roughness: 0.5 });
    cyl(0.012, 0.024, 0.04, cloak, 0, 0.021, 0, k, 12);
    ball(0.022, bone, 0, 0.056, 0, k).scale.set(1, 0.9, 0.9);
    for (const s of [-1, 1]) { const hn = cyl(0.001, 0.007, 0.03, bone, s * 0.014, 0.084, 0, k, 8); hn.rotation.z = -s * 0.25; }
    for (const s of [-1, 1]) dot(s * 0.008, 0.054, 0.019, 0.005, M.black, k).scale.set(0.8, 1.3, 0.5);
  }
  {
    // duck in a blue cap
    const d = new THREE.Group(); d.position.set(0.83, riserTop, RZ); d.scale.setScalar(1.35); scene.add(d);
    const yel = std(0xf2c12e, { roughness: 0.5 });
    ball(0.024, yel, 0, 0.022, 0, d).scale.set(1.15, 0.9, 1);
    ball(0.017, yel, 0.004, 0.052, 0.004, d);
    ball(0.016, std(0x2f6fd0, { roughness: 0.5 }), 0.004, 0.062, 0.002, d).scale.set(1, 0.55, 1);
    cyl(0.002, 0.008, 0.014, std(0xe2622b), 0.004, 0.05, 0.022, d, 8).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) dot(0.004 + s * 0.007, 0.056, 0.015, 0.0025, M.black, d);
  }
  {
    // small red friend
    const r = new THREE.Group(); r.position.set(0.915, riserTop, RZ + 0.01); r.scale.setScalar(1.3); scene.add(r);
    const red = std(0xd23a2e, { roughness: 0.55 });
    cyl(0.014, 0.02, 0.028, red, 0, 0.015, 0, r, 12);
    ball(0.016, std(0xf1efe8, { roughness: 0.5 }), 0, 0.04, 0, r);
    for (const s of [-1, 1]) { const hn = cyl(0.001, 0.005, 0.02, std(0xf1efe8), s * 0.011, 0.06, 0, r, 8); hn.rotation.z = -s * 0.3; }
    for (const s of [-1, 1]) dot(s * 0.006, 0.04, 0.014, 0.003, M.black, r);
  }
  cyl(0.036, 0.04, 0.02, std(0x151517, { roughness: 0.35 }), 1.0, riserTop + 0.011, RZ + 0.02); // black puck
  {
    // pine-cone critter
    const p = new THREE.Group(); p.position.set(1.1, riserTop, RZ); p.scale.setScalar(1.3); scene.add(p);
    const brown = std(0x5a3a26, { roughness: 0.9 });
    for (let i = 0; i < 5; i++) cyl(0.006 + (4 - i) * 0.0035, 0.01 + (4 - i) * 0.0035, 0.011, brown, 0, 0.0065 + i * 0.01, 0, p, 9);
  }
  {
    // mushroom plush
    const m = new THREE.Group(); m.position.set(1.21, riserTop, RZ); m.scale.setScalar(1.5); scene.add(m);
    const cream = std(0xf0e6d2, { roughness: 0.95 });
    ball(0.027, cream, 0, 0.027, 0, m).scale.set(1, 1.05, 0.95);
    const cap = add(new THREE.SphereGeometry(0.043, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0x8a5632, { roughness: 0.95, side: THREE.DoubleSide }), 0, 0.044, 0, m);
    cap.scale.set(1, 0.72, 1);
    for (const s of [-1, 1]) dot(s * 0.009, 0.03, 0.025, 0.003, M.black, m);
    hotspot('about', V(1.21, riserTop + 0.15, RZ));
  }
  rbox(0.05, 0.085, 0.05, 0.02, std(0x7d8078, { roughness: 0.7 }), 0.52, riserTop + 0.043, 0.33); // grey cup
  // Mac mini (click → first link, usually GitHub)
  const mini = new THREE.Group(); mini.position.set(1.5, riserTop, 0.36); scene.add(mini);
  rbox(0.13, 0.05, 0.13, 0.016, M.silver, 0, 0.0255, 0, mini);
  dot(0.045, 0.02, 0.066, 0.0025, glow(0xffffff, 3), mini);
  hotspot('ios', V(1.5, riserTop + 0.12, 0.38));

  // small framed photo, propped up left of the riser
  {
    const f = new THREE.Group(); f.position.set(0.1, deskTop, 0.34); f.rotation.set(-0.16, 0.45, 0); scene.add(f);
    box(0.15, 0.2, 0.014, M.black, 0, 0.1, 0, f);
    box(0.12, 0.17, 0.004, M.white, 0, 0.1, 0.0075, f).castShadow = false;
    box(0.085, 0.06, 0.004, std(0x2f9fc4, { roughness: 0.5 }), 0, 0.1, 0.0095, f).castShadow = false;
    hotspot('ai', V(0.1, deskTop + 0.3, 0.34));
  }

  // desk mat: sunrise over mountains, forest and a river
  const matTex = canvasTex(1024, 460, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#f6ead0'); sky.addColorStop(1, '#eccf9a');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff6dc'; g.beginPath(); g.arc(w / 2, h * 0.3, h * 0.22, 0, 7); g.fill();
    const ridge = (base, amp, col, seed) => {
      g.fillStyle = col; g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, h * base - Math.abs(Math.sin(x * 0.006 + seed)) * h * amp - Math.sin(x * 0.03 + seed) * 6);
      g.lineTo(w, h); g.fill();
    };
    ridge(0.5, 0.3, '#d9a98a', 1); ridge(0.6, 0.24, '#b98a6a', 2.4); ridge(0.72, 0.16, '#6f8a52', 4);
    g.fillStyle = '#3f5a36';
    for (let i = 0; i < 70; i++) {
      const x = ((i * 137) % 1000) / 1000 * w, y = h * (0.62 + ((i * 53) % 30) / 100), s = 14 + (i % 5) * 5;
      if (Math.abs(x - w / 2) < 60) continue;
      g.beginPath(); g.moveTo(x, y - s * 2); g.lineTo(x - s * 0.6, y); g.lineTo(x + s * 0.6, y); g.fill();
    }
    g.fillStyle = '#f3dc9a'; g.beginPath(); g.moveTo(w / 2 - 14, h * 0.55); g.lineTo(w / 2 + 14, h * 0.55); g.lineTo(w / 2 + 90, h); g.lineTo(w / 2 - 90, h); g.fill();
    g.fillStyle = '#1e2a22'; g.fillRect(0, h * 0.9, w * 0.34, h * 0.1); g.fillRect(w * 0.66, h * 0.9, w * 0.34, h * 0.1);
  });
  const mat = add(new THREE.PlaneGeometry(0.98, 0.44), std(0xffffff, { map: matTex, roughness: 0.95 }), 1.0, deskTop + 0.002, 0.66);
  mat.rotation.x = -Math.PI / 2; mat.castShadow = false;

  // keyboard (orange escape key), mouse, notebook, pen
  rbox(0.34, 0.02, 0.125, 0.006, std(0x1c1c20, { roughness: 0.5 }), 1.0, deskTop + 0.013, 0.72);
  const keysTex = canvasTex(340, 125, (g, w, h) => {
    g.fillStyle = '#1c1c20'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) {
      if (r === 4 && c > 3 && c < 10) continue;
      g.fillStyle = r === 0 && c === 0 ? '#e8642c' : (c === 14 || (r === 4 && c < 3)) ? '#4a4e55' : '#34353b';
      g.fillRect(6 + c * 22, 6 + r * 23, 19, 19);
    }
    g.fillStyle = '#4a4e55'; g.fillRect(6 + 4 * 22, 6 + 4 * 23, 6 * 22 - 3, 19);
  });
  const keys = add(new THREE.PlaneGeometry(0.33, 0.118), std(0xffffff, { map: keysTex, roughness: 0.6 }), 1.0, deskTop + 0.0238, 0.72);
  keys.rotation.x = -Math.PI / 2; keys.castShadow = false;
  hotspot('skills', V(1.0, deskTop + 0.1, 0.72));
  ball(0.032, std(0x141416, { roughness: 0.4 }), 1.33, deskTop + 0.016, 0.74).scale.set(1, 0.55, 1.7);
  box(0.006, 0.004, 0.05, glow(0xb57bff, 4), 1.33, deskTop + 0.034, 0.75).castShadow = false;
  const note = box(0.13, 0.014, 0.2, std(0x141416, { roughness: 0.6 }), 0.6, deskTop + 0.0095, 0.72); note.rotation.y = 0.12;
  box(0.035, 0.002, 0.03, std(0xe9e4dc), 0.02, 0.0082, -0.04, note).castShadow = false;
  box(0.03, 0.002, 0.03, std(0xd23a2e), -0.015, 0.0082, 0.05, note).castShadow = false;
  rod(V(0.7, deskTop + 0.008, 0.64), V(0.73, deskTop + 0.008, 0.8), 0.004, std(0x2f6fd0));

  // the big blue manual on the right
  {
    const b = new THREE.Group(); b.position.set(1.92, deskTop, 0.6); b.rotation.y = -0.1; scene.add(b);
    const blue = std(0x2a6fb5, { roughness: 0.6 });
    box(0.206, 0.004, 0.27, blue, 0, 0.0025, 0, b);
    box(0.2, 0.06, 0.262, std(0xf2efe8, { roughness: 0.9 }), 0.002, 0.0345, 0, b);
    box(0.004, 0.068, 0.27, blue, -0.101, 0.0345, 0, b);
    const coverTex = canvasTex(412, 540, (g, w, h) => {
      g.fillStyle = '#2a6fb5'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.textAlign = 'center';
      g.font = '600 58px Inter, system-ui, sans-serif'; g.fillText('DSM-5-TR', w / 2, h * 0.48);
      g.fillRect(w * 0.2, h * 0.53, w * 0.6, 4);
    });
    box(0.206, 0.004, 0.27, blue, 0, 0.0665, 0, b);
    const cover = add(new THREE.PlaneGeometry(0.206, 0.27), std(0xffffff, { map: coverTex, roughness: 0.6 }), 0, 0.0692, 0, b);
    cover.rotation.x = -Math.PI / 2; cover.castShadow = false;
    scene.userData.coverTex = coverTex;
    hotspot('education', V(1.92, deskTop + 0.2, 0.6));
  }

  // headphones on a stand
  {
    const hp = new THREE.Group(); hp.position.set(2.05, deskTop, 0.3); scene.add(hp);
    cyl(0.05, 0.05, 0.012, M.black, 0, 0.0065, 0, hp);
    rod(V(0, 0.01, 0), V(0, 0.2, 0), 0.008, M.black, hp);
    add(new THREE.TorusGeometry(0.085, 0.011, 10, 28, Math.PI), M.black, 0, 0.12, 0, hp);
    for (const s of [-1, 1]) cyl(0.042, 0.042, 0.035, std(0x1b1b1f, { roughness: 0.5 }), s * 0.085, 0.1, 0, hp).rotation.z = Math.PI / 2;
  }

  // chair
  {
    const ch = new THREE.Group(); ch.position.set(-0.32, 0, 1.6); ch.rotation.y = 0.55; scene.add(ch);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2, p = V(Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3);
      rod(V(0, 0.09, 0), p, 0.016, M.black, ch);
      ball(0.03, M.black, p.x, 0.03, p.z, ch);
    }
    cyl(0.025, 0.025, 0.34, M.darkMetal, 0, 0.26, 0, ch);
    rbox(0.5, 0.085, 0.48, 0.035, M.fabric, 0, 0.47, 0, ch);
    const back = rbox(0.46, 0.6, 0.06, 0.028, M.fabric, 0, 0.84, 0.26, ch);
    back.rotation.x = 0.13;
    rod(V(0, 0.44, 0.2), V(0, 0.62, 0.29), 0.02, M.black, ch);
    for (const s of [-1, 1]) {
      rod(V(s * 0.27, 0.46, 0.05), V(s * 0.29, 0.66, 0.05), 0.014, M.black, ch);
      rbox(0.06, 0.025, 0.26, 0.01, M.black, s * 0.29, 0.67, 0.02, ch);
    }
  }

  // ───────────────────────── lamps ─────────────────────────
  // key light from the front right (no visible fixture)
  const SB = { head: V(2.78, 2.2, 1.3), aim: V(0.7, 0.9, 1.0) };
  const key = new THREE.SpotLight(0xffe0b5, 22, 9, 0.75, 0.85, 1.6);
  key.position.copy(SB.head); key.target.position.copy(SB.aim);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 6;
  scene.add(key, key.target);

  // globe floor lamp
  const GL = V(3.32, 1.72, 0.42);
  cyl(0.13, 0.13, 0.02, M.brass, GL.x, 0.01, GL.z);
  rod(V(GL.x, 0.02, GL.z), V(GL.x, GL.y - 0.15, GL.z), 0.009, M.brass);
  ball(0.17, glow(0xffd9a8, 2.2), GL.x, GL.y, GL.z).castShadow = false;
  const globeLight = new THREE.PointLight(0xffc58a, 5, 7, 1.8);
  globeLight.position.set(GL.x, GL.y, GL.z + 0.25); scene.add(globeLight);

  // window light spilling pink across the floor
  const dusk = new THREE.SpotLight(0xff9ab0, 14, 8, 0.8, 1, 1.4);
  dusk.position.set(WIN.x, 1.9, 0.25); dusk.target.position.set(-1.3, 0, 2.6);
  scene.add(dusk, dusk.target);
  scene.add(new THREE.HemisphereLight(0x9a8fc4, 0x2a1b14, 0.55));

  // dust motes
  const DUST = 260;
  const dustPos = new Float32Array(DUST * 3), dustSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    dustPos.set([(Math.random() - 0.5) * 7, Math.random() * 3, Math.random() * 5], i * 3);
    dustSeed[i] = Math.random() * 100;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xffe6c7, size: 0.014, transparent: true, opacity: 0.45, depthWrite: false,
  })));

  // ───────────────────────── post-processing ─────────────────────────
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.75, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ───────────────────────── camera rig ─────────────────────────
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const screenCenter = new THREE.Vector3();
  const pointer = { x: 0, y: 0 };
  const cur = { pos: new THREE.Vector3(), tgt: new THREE.Vector3() };
  let mode = 'room'; // room | entering | computer | leaving
  let tween = null;
  let mobile = false;

  function homePose() {
    const a = camera.aspect, tanV = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const wide = a > 1.25;
    const span = wide ? 7.0 : a > 0.8 ? 4.6 : 3.3;      // metres of room visible across
    const cx = wide ? 0 : a > 0.8 ? 0.6 : 1.0;
    const dist = clamp(span / (2 * tanV * a), 4.6, 9.5);
    return { pos: V(cx, 1.58, dist), tgt: V(cx + (wide ? 0.15 : 0), 1.45, 0) };
  }
  function computerPose() {
    screen.getWorldPosition(screenCenter);
    const tanV = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const dW = SCREEN.w / 0.92 / (2 * tanV * camera.aspect), dH = SCREEN.h / 0.8 / (2 * tanV);
    const d = mobile ? dH * 0.8 : Math.max(dW, dH);
    return { pos: screenCenter.clone().add(V(0, 0, d)), tgt: screenCenter.clone() };
  }
  function flyTo(pose, dur, onDone) {
    tween = { t0: performance.now(), dur: reduced ? 1 : dur, fromPos: cur.pos.clone(), fromTgt: cur.tgt.clone(), ...pose, onDone };
  }

  function enterComputer(app) {
    if (mode === 'computer') { if (app) os.open(app); return; }
    if (mode !== 'room') return;
    hideCard();
    mode = 'entering';
    document.body.classList.add('in-computer');
    canvas.style.cursor = '';
    osEl.classList.toggle('mobile', mobile);
    os.open(app || 'projects');
    flyTo(computerPose(), 1700, () => {
      mode = 'computer';
      osEl.classList.add('live');
      osEl.setAttribute('aria-hidden', 'false');
      $('#back').hidden = false;
    });
  }
  function leaveComputer() {
    if (mode !== 'computer') return;
    mode = 'leaving';
    osEl.classList.remove('live');
    osEl.setAttribute('aria-hidden', 'true');
    $('#back').hidden = true;
    flyTo(homePose(), 1400, () => {
      mode = 'room';
      document.body.classList.remove('in-computer');
    });
  }
  $('#back').addEventListener('click', leaveComputer);

  // Keep the HTML desktop glued to the monitor glass.
  const corner = new THREE.Vector3();
  function placeOS() {
    if (mobile) { osEl.style.transform = ''; os.setScale(1); return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity;
    for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1]]) {
      corner.set((sx * SCREEN.w) / 2, (sy * SCREEN.h) / 2, 0);
      screen.localToWorld(corner).project(camera);
      const x = (corner.x * 0.5 + 0.5) * innerWidth, y = (-corner.y * 0.5 + 0.5) * innerHeight;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y);
    }
    const s = (maxX - minX) / SCREEN_PX.w;
    osEl.style.transform = `translate(${minX}px, ${minY}px) scale(${s})`;
    os.setScale(s);
  }

  // ───────────────────────── interaction ─────────────────────────
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const clickable = [monitorBody, screen, ...mini.children];
  function pick(e) {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(clickable, false)[0];
    if (!hit) return null;
    return hit.object === screen || hit.object === monitorBody ? 'monitor' : 'laptop';
  }
  addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
    if (mode === 'room') canvas.style.cursor = pick(e) ? 'pointer' : '';
  });
  canvas.addEventListener('click', (e) => {
    if (mode !== 'room') return;
    if (!$('#card').hidden) { hideCard(); return; }
    const what = pick(e);
    if (what === 'monitor') enterComputer();
    else if (what === 'laptop' && content.links[0]) window.open(content.links[0].url, '_blank', 'noopener');
  });
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('#card').hidden) hideCard(); else leaveComputer();
  });

  // "enter" pill floating above the monitor
  const enterBtn = document.createElement('button');
  enterBtn.className = 'enter-pill';
  enterBtn.textContent = 'Go into the computer';
  enterBtn.addEventListener('click', (e) => { e.stopPropagation(); enterComputer(); });
  hotspotLayer.append(enterBtn);
  const enterAnchor = new THREE.Vector3();

  // hotspot info card
  const card = $('#card');
  function showCard(id, el) {
    const info = content.hotspots[id];
    card.replaceChildren();
    const h = document.createElement('h2'); h.textContent = info.label;
    const p = document.createElement('p'); p.textContent = info.text;
    card.append(h, p);
    if (info.app) {
      const b = document.createElement('button');
      b.textContent = 'Open on the computer →';
      b.addEventListener('click', () => enterComputer(info.app));
      card.append(b);
    }
    if (info.link) {
      const a = document.createElement('a');
      a.textContent = info.link.label + ' →'; a.href = info.link.url; a.target = '_blank'; a.rel = 'noopener';
      card.append(a);
    }
    card.hidden = false;
    const r = el.getBoundingClientRect(), cw = card.offsetWidth, chh = card.offsetHeight;
    card.style.left = clamp(r.right + 14, 12, innerWidth - cw - 12) + 'px';
    card.style.top = clamp(r.top - 10, 12, innerHeight - chh - 12) + 'px';
    hotspots.forEach((hs) => hs.el.classList.toggle('active', hs.id === id));
  }
  function hideCard() {
    card.hidden = true;
    hotspots.forEach((hs) => hs.el.classList.remove('active'));
  }

  // ───────────────────────── resize + loop ─────────────────────────
  function resize() {
    const w = innerWidth, h = innerHeight;
    mobile = w < 760 || w / h < 0.9;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    osEl.classList.toggle('mobile', mobile);
    hideCard();
    if (mode === 'room' && !tween) { const p = homePose(); cur.pos.copy(p.pos); cur.tgt.copy(p.tgt); }
    if (mode === 'computer') { const p = computerPose(); cur.pos.copy(p.pos); cur.tgt.copy(p.tgt); }
  }
  addEventListener('resize', resize);
  resize();

  document.fonts?.ready.then(() => { screenTex.redraw(); scene.userData.resumeTex.redraw(); scene.userData.coverTex.redraw(); });

  const clock = new THREE.Clock();
  const proj = new THREE.Vector3();
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  let first = true;

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;

    // camera
    let k = 1;
    if (tween) {
      k = clamp((performance.now() - tween.t0) / tween.dur, 0, 1);
      const e = ease(k);
      cur.pos.lerpVectors(tween.fromPos, tween.pos, e);
      cur.tgt.lerpVectors(tween.fromTgt, tween.tgt, e);
      if (k >= 1) { const done = tween.onDone; tween = null; done?.(); }
    } else if (mode === 'room') {
      const home = homePose(), f = 1 - Math.exp(-dt * 3.5);
      // Narrow screens only see part of the room, so dragging pans much further.
      const narrow = camera.aspect <= 1.25;
      home.pos.x += pointer.x * (narrow ? 1.2 : 0.55); home.pos.y -= pointer.y * 0.22;
      home.tgt.x += pointer.x * (narrow ? 1.7 : 0.12);
      cur.pos.lerp(home.pos, f); cur.tgt.lerp(home.tgt, f);
    }
    camera.position.copy(cur.pos);
    camera.lookAt(cur.tgt);
    camera.updateMatrixWorld();

    // HTML desktop over the monitor
    if (mode !== 'room') {
      placeOS();
      osEl.style.opacity = mode === 'entering' ? clamp((k - 0.72) / 0.28, 0, 1)
        : mode === 'leaving' ? clamp(1 - k / 0.2, 0, 1) : 1;
      osEl.style.visibility = 'visible';
    } else {
      osEl.style.visibility = 'hidden';
    }

    // hotspots
    if (mode === 'room') {
      for (const hs of hotspots) {
        proj.copy(hs.pos).project(camera);
        hs.el.style.transform = `translate(${(proj.x * 0.5 + 0.5) * innerWidth}px, ${(-proj.y * 0.5 + 0.5) * innerHeight}px)`;
      }
      enterAnchor.set(0, SCREEN.h / 2 + 0.12, 0); screen.localToWorld(enterAnchor).project(camera);
      enterBtn.style.transform =
        `translate(${(enterAnchor.x * 0.5 + 0.5) * innerWidth}px, ${(-enterAnchor.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -50%)`;
    }

    // life
    sunset.uniforms.t.value = t;
    monitorGlow.intensity = 0.5 + Math.sin(t * 1.3) * 0.04;
    for (let i = 0; i < DUST; i++) {
      const s = dustSeed[i];
      dustPos[i * 3] += Math.sin(t * 0.2 + s) * 0.0006;
      dustPos[i * 3 + 1] += 0.012 * dt * (0.4 + (s % 1));
      if (dustPos[i * 3 + 1] > 3) dustPos[i * 3 + 1] = 0;
    }
    dustGeo.attributes.position.needsUpdate = true;

    composer.render();
    if (first) { first = false; $('#loader').classList.add('done'); }
    requestAnimationFrame(frame);
  }
  const p0 = homePose(); cur.pos.copy(p0.pos); cur.tgt.copy(p0.tgt);
  requestAnimationFrame(frame);
}
