/* Ilustrações vetoriais do protótipo: óculos, cenas e ícones (sem imagens externas). */
window.JR = window.JR || {};
(function () {
  let uid = 0;
  const nid = p => `${p}${++uid}`;

  function rng(seed) {
    let s = seed % 2147483647 || 1;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  function shade(hex, amt) {
    let c = hex.replace("#", "");
    if (c.length === 3) c = c.split("").map(x => x + x).join("");
    const n = parseInt(c, 16);
    const f = v => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v * amt : (255 - v) * amt))));
    return "#" + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, "0")).join("");
  }
  const isLight = hex => {
    const n = parseInt(hex.replace("#", ""), 16);
    return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 165;
  };

  function lensDefs(id, lens) {
    const c = JR.LENS[lens] || JR.LENS["Preta"];
    return `
      <linearGradient id="${id}" x1="0" y1="0" x2=".35" y2="1">
        <stop offset="0" stop-color="${c[0]}"/><stop offset=".48" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/>
      </linearGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="1" y2=".6">
        <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".35" stop-color="#fff" stop-opacity=".08"/>
        <stop offset=".62" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".18"/>
      </linearGradient>`;
  }
  JR.lensCss = lens => {
    const c = JR.LENS[lens] || JR.LENS["Preta"];
    return `linear-gradient(160deg, ${c[0]} 0%, ${c[1]} 50%, ${c[2]} 100%)`;
  };

  /* ---------- Óculos (produto, vista 3/4) ---------- */
  const SHAPES = {
    shield: {
      lens: ["M14 42 C16 27 54 18 126 18 C192 18 222 22 228 32 C234 42 228 58 214 67 C198 77 170 79 156 67 C147 59 138 54 128 54 C117 54 108 60 100 69 C88 83 48 85 29 73 C17 64 12 54 14 42 Z"],
      bar: "M8 40 C10 22 56 11 126 11 C196 11 230 16 240 30 L236 37 C224 24 192 20 126 20 C58 20 22 28 16 44 Z",
      pads: "M120 56 C124 50 132 50 136 56 L134 64 C130 60 126 60 122 64 Z",
      shine: "M24 40 C30 30 64 25 112 25 L104 34 C72 33 42 36 28 46 Z"
    },
    dual: {
      lens: [
        "M16 36 C18 24 52 19 104 21 C119 22 124 31 120 46 C114 66 90 79 61 77 C36 75 14 60 16 36 Z",
        "M140 23 C186 18 216 21 224 31 C230 41 222 61 205 71 C188 80 160 77 148 65 C137 54 132 40 140 23 Z"
      ],
      bar: "M8 34 C10 18 60 11 122 15 C172 11 222 12 238 27 L234 34 C218 21 174 20 130 24 C80 19 22 22 16 38 Z",
      pads: "M120 34 C126 28 136 28 142 34 L138 46 C132 40 128 40 124 46 Z",
      shine: "M26 34 C34 26 66 23 102 25 L96 33 C70 32 46 34 30 42 Z"
    },
    wrap: {
      lens: [
        "M20 42 C20 24 52 18 84 20 C110 22 118 34 114 52 C110 72 86 81 61 79 C36 77 20 63 20 42 Z",
        "M142 30 C144 20 172 17 198 21 C217 25 222 40 215 57 C207 73 182 79 163 73 C146 67 138 49 142 30 Z"
      ],
      rim: true,
      bar: "M10 38 C12 18 54 9 88 12 C112 14 122 24 128 26 C136 20 172 9 206 15 C226 19 236 26 240 31 L236 38 C226 30 214 24 200 23 C170 20 146 26 134 36 L120 36 C114 26 104 22 84 21 C54 19 24 25 18 44 Z",
      pads: "M118 40 C124 34 134 34 140 40 L136 52 C130 46 126 46 122 52 Z",
      shine: "M30 38 C38 28 64 25 92 27 L86 35 C64 34 44 37 34 46 Z"
    }
  };

  JR.glasses = function ({ shape = "shield", frame = "#16181c", lens = "Preta", cls = "prod", shadow = true, angle = 0 } = {}) {
    const s = SHAPES[shape] || SHAPES.shield;
    const id = nid("l");
    const light = isLight(frame);
    const edge = light ? "rgba(0,0,0,.28)" : "rgba(255,255,255,.10)";
    const frameHi = shade(frame, light ? -.18 : .28);
    const grip = light ? "#1a1c20" : shade(frame, -.35);
    const lenses = s.lens.map((d, n) => `
      <clipPath id="${id}c${n}"><path d="${d}"/></clipPath>
      <path d="${d}" fill="url(#${id})"/>
      <g clip-path="url(#${id}c${n})">
        <path d="M0 52 C60 46 140 44 300 50 L300 120 L0 120 Z" fill="#000" opacity=".22"/>
        <path d="M0 52 C60 46 140 44 300 50" stroke="#fff" stroke-opacity=".45" stroke-width=".8" fill="none"/>
        <ellipse cx="${n ? 180 : 70}" cy="44" rx="18" ry="7" fill="#fff" opacity=".28"/>
      </g>
      <path d="${d}" fill="url(#${id}s)"/>
      ${s.rim ? `<path d="${d}" fill="none" stroke="${frame}" stroke-width="7" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${edge}" stroke-width="1"/>` : `<path d="${d}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1"/>`}`).join("");
    return `<svg class="${cls}" viewBox="0 0 300 118" role="img" aria-label="Óculos" xmlns="http://www.w3.org/2000/svg">
      <defs>${lensDefs(id, lens)}
        <radialGradient id="${id}g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
        <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${frameHi}"/><stop offset=".55" stop-color="${frame}"/><stop offset="1" stop-color="${shade(frame, -.3)}"/></linearGradient>
      </defs>
      ${shadow ? `<ellipse cx="140" cy="104" rx="128" ry="9" fill="url(#${id}g)"/>` : ""}
      <g transform="rotate(${angle} 150 55)">
        <path d="M226 26 C252 25 276 30 292 40 C295 43 294 47 290 47 C274 41 252 37 228 38 Z" fill="url(#${id}f)" stroke="${edge}"/>
        <path d="M262 33 C274 35 284 39 292 42 C295 44 294 47 290 47 C282 44 272 41 262 40 Z" fill="${grip}"/>
        ${lenses}
        <path d="${s.bar}" fill="url(#${id}f)" stroke="${edge}" stroke-width="1"/>
        <path d="M14 36 C40 22 90 17 124 17" stroke="#fff" stroke-opacity="${light ? .6 : .22}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
        <path d="${s.pads}" fill="${grip}"/>
        <path d="${s.shine}" fill="#fff" opacity=".28"/>
        <path d="M8 38 C6 44 6 50 10 54 L14 50 C12 46 12 42 14 40 Z" fill="${shade(frame, -.25)}"/>
      </g>
    </svg>`;
  };

  /* ---------- Cenas ---------- */
  const SKIES = {
    sunset:   { top: "#151a26", mid: "#5d3f4f", low: "#ff9445", sun: "#ffd28a", ground: "#0c0d10", rim: "#ffb36b" },
    dusk:     { top: "#0f1424", mid: "#3a3a63", low: "#e07a5f", sun: "#ffc59a", ground: "#0b0c10", rim: "#ff9f80" },
    golden:   { top: "#2a2a30", mid: "#a2643a", low: "#ffc070", sun: "#fff0c0", ground: "#17120d", rim: "#ffcf8a" },
    day:      { top: "#4f86c6", mid: "#8fb8e2", low: "#dde9f3", sun: "#ffffff", ground: "#2b2f2a", rim: "#eaf3ff" },
    overcast: { top: "#4b525c", mid: "#7c848e", low: "#b3b9c0", sun: "#e6e9ec", ground: "#22252a", rim: "#d9dee4" },
    night:    { top: "#05070b", mid: "#0d1420", low: "#1d2a3c", sun: "#8fb4ff", ground: "#040506", rim: "#7fb0ff" },
    forest:   { top: "#0f1a14", mid: "#24402c", low: "#6f8f5a", sun: "#f3e9b0", ground: "#0b120d", rim: "#ffe3a0" },
    studio:   { top: "#1a1d22", mid: "#121418", low: "#0b0c0e", sun: "#ffffff", ground: "#08090a", rim: "#e8ecf2" }
  };

  function backdrop(sky, setting, seed, id) {
    const r = rng(seed);
    let out = `
      <linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${sky.top}"/><stop offset=".45" stop-color="${sky.mid}"/><stop offset=".7" stop-color="${sky.low}"/>
      </linearGradient>
      <radialGradient id="${id}sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${sky.sun}" stop-opacity=".95"/><stop offset=".25" stop-color="${sky.sun}" stop-opacity=".45"/><stop offset="1" stop-color="${sky.sun}" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(sky.ground, .12)}"/><stop offset="1" stop-color="${sky.ground}"/></linearGradient>`;
    let body = `<rect width="400" height="500" fill="url(#${id}sky)"/>`;
    const sx = 80 + r() * 260;
    body += `<circle cx="${sx}" cy="300" r="190" fill="url(#${id}sun)"/>`;
    // nuvens
    for (let i = 0; i < 5; i++) {
      const y = 70 + r() * 170, x = r() * 400, w = 80 + r() * 160;
      body += `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${6 + r() * 10}" fill="${sky.low}" opacity="${.08 + r() * .12}"/>`;
    }
    const horizon = 318;
    if (setting === "city" || setting === "bridge") {
      let x = -10;
      while (x < 410) {
        const w = 18 + r() * 36, h = 30 + r() * 120;
        body += `<rect x="${x}" y="${horizon - h}" width="${w}" height="${h + 4}" fill="${shade(sky.ground, .06)}" opacity=".85"/>`;
        for (let k = 0; k < 4; k++) if (r() > .55) body += `<rect x="${x + 4 + r() * (w - 8)}" y="${horizon - h + 8 + r() * (h - 16)}" width="2" height="3" fill="${sky.sun}" opacity=".5"/>`;
        x += w + 2;
      }
    }
    if (setting === "trees" || setting === "forest") {
      for (let i = 0; i < 18; i++) {
        const x = r() * 420 - 10, h = 70 + r() * 150, w = 30 + r() * 50;
        body += `<ellipse cx="${x}" cy="${horizon - h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${shade(sky.ground, .1 + r() * .1)}" opacity=".9"/>`;
      }
    }
    if (setting === "mountains") {
      body += `<path d="M0 ${horizon} L60 250 L120 290 L190 220 L260 285 L320 240 L400 300 L400 ${horizon} Z" fill="${shade(sky.mid, -.45)}" opacity=".85"/>`;
    }
    body += `<rect y="${horizon}" width="400" height="${500 - horizon}" fill="url(#${id}gr)"/>`;
    out += `<linearGradient id="${id}hz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky.low}" stop-opacity="0"/><stop offset=".5" stop-color="${sky.low}" stop-opacity=".22"/><stop offset="1" stop-color="${sky.ground}" stop-opacity="0"/></linearGradient>`;
    body += `<rect y="${horizon - 30}" width="400" height="70" fill="url(#${id}hz)"/>`;
    if (setting === "bridge") {
      body += `<g stroke="${shade(sky.ground, .02)}" stroke-width="5" opacity=".95">
        <line x1="-10" y1="236" x2="410" y2="262"/><line x1="-10" y1="276" x2="410" y2="288"/>
        ${Array.from({ length: 11 }, (_, i) => `<line x1="${i * 40}" y1="${238 + i * 2.4}" x2="${i * 40}" y2="${horizon}"/>`).join("")}
      </g>`;
    }
    if (setting === "track") {
      body += `<rect y="${horizon}" width="400" height="${500 - horizon}" fill="#7a2e22" opacity=".85"/>`;
      for (let i = 0; i < 7; i++) body += `<path d="M${-200 + i * 110} 500 L${150 + i * 18} ${horizon}" stroke="#fff" stroke-opacity=".55" stroke-width="2"/>`;
    }
    if (setting === "road" || setting === "city" || setting === "bridge") {
      body += `<path d="M150 500 L196 ${horizon} L204 ${horizon} L250 500 Z" fill="#fff" opacity=".05"/>`;
      for (let i = 0; i < 6; i++) { const y = horizon + 10 + i * i * 6; body += `<rect x="${198 - i}" y="${y}" width="${4 + i * 2}" height="${4 + i * 3}" fill="#fff" opacity=".18"/>`; }
    }
    if (setting === "rocks") {
      body += `<path d="M-20 500 L-20 380 C40 340 110 330 170 352 C230 330 300 336 420 372 L420 500 Z" fill="#14110f"/>
        <path d="M60 372 C120 350 180 356 240 370 C200 364 140 364 70 384 Z" fill="${sky.rim}" opacity=".18"/>`;
      for (let i = 0; i < 26; i++) body += `<circle cx="${r() * 400}" cy="${380 + r() * 120}" r="${1 + r() * 4}" fill="#2a231d"/>`;
    }
    return { defs: out, body };
  }

  /* Conceito: "Sua corrida como você nunca viu" — o mundo refletido dentro da lente. */
  const LENS_D = "M126 210 C128 194 160 186 200 187 C240 186 272 194 274 210 C276 228 262 244 244 246 C228 248 214 240 206 230 C202 226 198 226 194 230 C186 240 172 248 156 246 C138 244 124 228 126 210 Z";
  function bust(o, id, sky) {
    const s = o.s ?? 1, k = s * 2.05;
    const cx = (o.x ?? 0) + 200 * s, cy = (o.y ?? 0) + 214 * s;
    const lensId = id + "ln", frame = o.frame || "#0d0e10";
    const c = JR.LENS[o.lens || "Preta"];
    const sunX = o.light === "left" ? 168 : 236;
    const r = rng((o.seed || 3) * 7);
    let streaks = "";
    for (let i = 0; i < 9; i++) {
      const y = 40 + r() * 420, w = 60 + r() * 200, x = r() * 400 - 40;
      streaks += `<rect x="${x}" y="${y}" width="${w}" height="${.8 + r() * 1.6}" rx="1" fill="${sky.rim}" opacity="${.08 + r() * .22}"/>`;
    }
    let rings = "";
    for (let i = 1; i <= 6; i++) rings += `<ellipse cx="${cx}" cy="${cy}" rx="${70 * i * s}" ry="${26 * i * s}" fill="none" stroke="${sky.rim}" stroke-opacity="${.13 - i * .016}" stroke-width="1"/>`;
    return `
      <defs>
        ${lensDefs(lensId, o.lens || "Preta")}
        <clipPath id="${id}lc"><path d="${LENS_D}"/></clipPath>
        <linearGradient id="${id}rs" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${c[2]}"/><stop offset=".55" stop-color="${c[1]}"/><stop offset=".8" stop-color="${c[0]}"/>
        </linearGradient>
        <radialGradient id="${id}sg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".3" stop-color="${c[0]}" stop-opacity=".6"/><stop offset="1" stop-color="${c[0]}" stop-opacity="0"/></radialGradient>
        <radialGradient id="${id}glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${c[1]}" stop-opacity=".55"/><stop offset="1" stop-color="${c[1]}" stop-opacity="0"/></radialGradient>
        <filter id="${id}bl" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
      </defs>
      <rect width="400" height="500" fill="#000" opacity=".38"/>
      ${streaks}${rings}
      <ellipse cx="${cx}" cy="${cy + 6 * s}" rx="${190 * s}" ry="${80 * s}" fill="url(#${id}glow)"/>
      <g transform="translate(${cx} ${cy}) scale(${k}) translate(-200 -214)" class="${o.anim ? "runner-anim" : ""}">
        <path d="M128 204 C96 198 60 200 10 214 L10 218 C60 206 98 206 128 212 Z" fill="${frame}"/>
        <path d="M272 204 C304 198 340 200 390 214 L390 218 C340 206 302 206 272 212 Z" fill="${shade(frame, .08)}"/>
        <path d="${LENS_D}" fill="#000" opacity=".5" filter="url(#${id}bl)" transform="translate(0 6)"/>
        <g clip-path="url(#${id}lc)">
          <rect x="120" y="180" width="160" height="70" fill="url(#${id}rs)"/>
          <circle cx="${sunX}" cy="224" r="16" fill="url(#${id}sg)"/>
          <rect x="120" y="225" width="160" height="30" fill="${shade(c[2], -.35)}"/>
          <path d="M120 225 L280 225" stroke="#fff" stroke-opacity=".55" stroke-width=".6"/>
          <path d="M${sunX - 4} 225 L${sunX - 40} 252 L${sunX + 32} 252 L${sunX + 4} 225 Z" fill="#fff" opacity=".12"/>
          ${[0, 1, 2, 3].map(i => `<rect x="${sunX - .6 - i * .5}" y="${228 + i * i * 1.6}" width="${1.2 + i}" height="${1.4 + i * 1.2}" fill="#fff" opacity=".35"/>`).join("")}
          ${[0, 1, 2, 3, 4].map(i => `<path d="M${130 + i * 34} 225 l${2 + i} -${4 + (i % 3) * 3} l${3} ${4 + (i % 3) * 3} Z" fill="${shade(c[2], -.5)}" opacity=".6"/>`).join("")}
          <path d="${LENS_D}" fill="url(#${lensId}s)"/>
          <path d="M130 196 C150 190 180 189 198 190 L190 199 C168 198 148 200 134 207 Z" fill="#fff" opacity=".5"/>
        </g>
        <path d="M120 206 C128 186 164 180 200 181 C236 180 272 186 280 206 L276 211 C266 196 238 191 200 192 C162 191 136 196 126 212 Z" fill="${frame}"/>
        <path d="M124 204 C134 190 166 185 200 186" stroke="#fff" stroke-opacity=".35" stroke-width=".8" fill="none"/>
        <path d="M194 230 C196 226 204 226 206 230 L204 236 C202 233 198 233 196 236 Z" fill="${shade(frame, .15)}"/>
      </g>`;
  }

  /* Corredor com rastro de movimento. */
  function runner(o, sky) {
    const c = o.color || "#07080a";
    const x = o.x ?? 120, y = o.y ?? 180, s = o.s ?? 1;
    const lens = JR.LENS[o.lens || "Ruby"];
    const fid = nid("rb");
    const L = (pts, w, col = c) => `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const flip = o.flip ? `scale(-1 1) translate(-200 0)` : "";
    const body = col => `
      ${L("108,74 134,104 152,88", 12, col)}
      ${L("118,140 142,190 182,196", 18, col)}${L("182,196 194,192", 9, col)}
      ${L("104,64 118,140", 30, col)}
      ${L("118,140 90,186 74,236", 18, col)}${L("74,236 54,233", 10, col)}
      ${L("104,74 80,104 62,92", 12, col)}
      <circle cx="100" cy="40" r="17" fill="${col}"/>`;
    const trails = [3, 2, 1].map(i => `<g transform="translate(${i * 26} 0)" opacity="${.12 + (3 - i) * .08}" filter="url(#${fid})">${body(sky.rim)}</g>`).join("");
    const lines = [60, 96, 132, 170, 206].map((yy, i) => `<rect x="${130 + i * 8}" y="${yy}" width="${120 - i * 12}" height="2" rx="1" fill="${sky.rim}" opacity="${.35 - i * .04}"/>`).join("");
    return `<defs><filter id="${fid}" x="-30%" y="-10%" width="160%" height="120%"><feGaussianBlur stdDeviation="4 1"/></filter></defs>
      <g transform="translate(${x} ${y}) scale(${s})"><g transform="${flip}" class="${o.anim ? "runner-anim" : ""}">
      ${lines}${trails}${body(c)}
      <path d="M82 35 C90 30 104 30 112 33 L110 43 C100 43 90 45 82 45 Z" fill="${lens[1]}"/>
      <path d="M85 36 L97 33" stroke="#fff" stroke-opacity=".8" stroke-width="1.6"/>
      <path d="M118 30 C116 46 112 56 104 62" stroke="${sky.rim}" stroke-opacity=".7" stroke-width="2.2" fill="none"/>
      <path d="M118 72 L130 136" stroke="${sky.rim}" stroke-opacity=".45" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </g></g>`;
  }

  /* opts: { sky, setting, figure: 'bust'|'runner'|'none'|'glasses', seed, ...figura } */
  JR.scene = function (opts = {}) {
    /* Tema: se houver foto cadastrada para o slot (JR.SITE_IMAGES), ela substitui a ilustração */
    const photo = opts.slot && JR.SITE_IMAGES && JR.SITE_IMAGES[opts.slot];
    if (photo) return `<div class="scene photo" data-slot="${opts.slot}"><img src="${photo.src || photo}" alt="${photo.alt || ""}" loading="${opts.eager ? "eager" : "lazy"}" ${opts.eager ? 'fetchpriority="high"' : 'decoding="async"'}></div>`;
    const id = nid("s");
    const sky = SKIES[opts.sky || "sunset"];
    const bd = backdrop(sky, opts.setting || "city", opts.seed || 7, id);
    let fig = "";
    if (opts.figure === "bust") fig = bust(opts, id, sky);
    if (opts.figure === "runner") fig = runner(opts, sky);
    if (opts.figure === "runners") fig = (opts.list || []).map(r => runner(r, sky)).join("");
    const extra = opts.extra || "";
    const vig = `<radialGradient id="${id}v" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>`;
    return `<div class="scene" aria-hidden="true"><svg viewBox="0 0 400 500" preserveAspectRatio="${opts.align || "xMidYMid"} slice" xmlns="http://www.w3.org/2000/svg">
      <defs>${bd.defs}${vig}</defs>${bd.body}${fig}${extra}<rect width="400" height="500" fill="url(#${id}v)"/></svg></div>`;
  };

  /* ---------- Ícones ---------- */
  const I = (d, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
  JR.icon = {
    arrow: I('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    left: I('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    search: I('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>'),
    user: I('<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1.4-3.6 4.2-5.4 7.5-5.4s6.1 1.8 7.5 5.4"/>'),
    bag: I('<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>'),
    menu: I('<path d="M4 7h16M4 12h16M4 17h10"/>'),
    close: I('<path d="M6 6l12 12M18 6 6 18"/>'),
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
    uv: I('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>'),
    feather: I('<path d="M20 4C11 4 6 9.5 6 17v3"/><path d="M6 17c7 0 12-4.5 14-13"/><path d="M10 13.5h5.5"/>'),
    grip: I('<path d="M4 15c3-4 6-6 9-6.5"/><path d="M13 8.5c2.4-.3 4.8.3 7 1.5"/><path d="M8 12.3l1.4 2.2M11 10.4l1.2 2.4M14.2 9.6l.8 2.5M17.2 9.9l.4 2.6"/>'),
    shield: I('<path d="M12 3 19 6v5.5c0 4.4-3 7.8-7 9.5-4-1.7-7-5.1-7-9.5V6z"/><path d="m9 12 2 2 4-4"/>'),
    polar: I('<circle cx="12" cy="12" r="8"/><path d="M12 4v16M8 5.2v13.6M16 5.2v13.6" opacity=".6"/>'),
    lens: I('<path d="M3 10c0-2 2.5-3 9-3s9 1 9 3-1.5 6-5 6c-2.2 0-3-2-4-2s-1.8 2-4 2c-3.5 0-5-4-5-6z"/>'),
    truck: I('<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>'),
    swap: I('<path d="M4 9h13l-3.5-3.5M20 15H7l3.5 3.5"/>'),
    lock: I('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
    card: I('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h3"/>'),
    nose: I('<path d="M7 9c2 0 3 2 3 5M17 9c-2 0-3 2-3 5"/><path d="M10 14c.6 1 1.2 1.4 2 1.4s1.4-.4 2-1.4"/>'),
    headphones: I('<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3.5" y="14" width="4" height="6" rx="1.5"/><rect x="16.5" y="14" width="4" height="6" rx="1.5"/>'),
    mail: I('<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>'),
    like: I('<path d="M7 11v9H4v-9z"/><path d="M7 11l4-7c1.4 0 2.3 1 2 2.5L12.5 10H18a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7"/>'),
    help: I('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6"/><circle cx="12" cy="17" r=".5" fill="currentColor"/>'),
    clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    box: I('<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>'),
    check: I('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
    pin: I('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'),
    refund: I('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/><path d="M12 8.5v7M14 10c0-.8-.9-1.3-2-1.3s-2 .6-2 1.4c0 1.9 4 1 4 2.9 0 .8-.9 1.4-2 1.4s-2-.5-2-1.3"/>'),
    doc: I('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>'),
    cookie: I('<path d="M20.5 12.5A8.5 8.5 0 1 1 11.5 3.5a3 3 0 0 0 4 3.6 3 3 0 0 0 5 5.4z"/><circle cx="9" cy="10" r=".7" fill="currentColor"/><circle cx="14.5" cy="14.5" r=".7" fill="currentColor"/><circle cx="9.5" cy="15.5" r=".7" fill="currentColor"/>'),
    eye: I('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
    chat: I('<path d="M5 5h14v10H9l-4 4z"/><path d="M9 10h6"/>'),
    star: I('<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>'),
    insta: I('<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><circle cx="17" cy="7" r=".6" fill="currentColor"/>')
  };
})();
