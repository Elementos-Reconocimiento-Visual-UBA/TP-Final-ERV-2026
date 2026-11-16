/*
   banners.js 
   ---------------------------------------------------------------------
   Cada entrada de BANNERS es una función que recibe el mail (el objeto
   de data/mails.json) y devuelve el HTML de adentro del cartel.
   La clave (ej. "hough") es lo que va en "banner.tipo" del JSON, y el
   cartel recibe la clase CSS "b-hough" (estilos en css/banners.css).
   */

(function () {
  'use strict';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));


  function pixelArt(rows, palette, w, h) {
    let rects = '';
    rows.forEach((row, y) => [...row].forEach((c, x) => {
      if (palette[c]) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${palette[c]}"/>`;
    }));
    return `<svg viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  }

  const PAISAJE = ['bbbbbbbbbbbb', 'bbbbbbbbbyyb', 'bbbbbbbbbyyb', 'bbbwwbbbbbbb', 'bbwwwwbbbbbb', 'bwwggwwbbbbb', 'wwgggggwbgbb', 'gggggggggggg', 'gggggggggggg', 'dddddddddddd'];
  const CARA = ['...hhhhhh...', '..hhhhhhhh..', '.hhssssssshh', '.hsssssssssh', '.hseesssees.', '.hseesssees.', '.hssssssssss', '..ssmssssms.', '..sssmmmmss.', '...ssssssss.', '....ssssss..', '...pppppppp.'];

  const BANNERS = {

    generico: (m) => {
      const b = m.banner || {};
      return `<div class="h">${esc(b.linea1 || m.paper?.titulo || 'NUEVO PAPER')}</div>` +
        (b.linea2 ? `<div class="h ac">${esc(b.linea2)}</div>` : '') +
        (b.pie ? `<div class="band s">${esc(b.pie)}</div>` : '');
    },

    hough: () =>
      `<div class="h">CADA PÍXEL<br>UN VOTO</div>
       <div class="band s">ACUMULADOR: <b class="votes">0000</b><br>DEEP HOUGH · ZHAO 2020</div>`,

    selective: () => {
      const colores = ['#7cffa1', '#ff9f1c', '#5ef0ff', '#ff5ec4', '#fff36b', '#b36bff'];
      const cajas = [[6, 10, 40, 30], [50, 20, 30, 50], [20, 48, 60, 30], [64, 8, 28, 40], [4, 30, 30, 46], [40, 55, 52, 28], [70, 50, 24, 34], [12, 6, 70, 60]];
      const bx = cajas.map((r, i) =>
        `<span class="bx" style="left:${r[0]}%;top:${r[1]}%;width:${r[2]}%;height:${r[3]}%;border-color:${colores[i % 6]};animation-delay:${i * 0.4}s"></span>`).join('');
      return bx +
        `<div class="h"><span class="cajas">0000</span> CAJAS</div>
         <div class="h o">0 COMPROMISO</div>
         <div class="band s">SELECTIVE SEARCH · UIJLINGS 2013</div>`;
    },

    spoofing: () =>
      `<div class="face">${pixelArt(CARA, { h: '#ff7ab8', s: '#ffd9b8', e: '#2a1b4d', m: '#c0392b', p: '#6d4bd1' }, 12, 12)}<span class="scan"></span></div>
       <div>
         <div class="h">¿SOS VOS</div><div class="h g">O TU FOTO?</div>
         <div class="st"><span>LBP ANALIZANDO...</span><span>VEREDICTO: FOTO</span></div>
       </div>
       <div class="s s-abajo">FACE SPOOFING · MÄÄTTÄ 2011</div>`,

    gan: () =>
      `<span class="stamp">FAKE</span>
       <div class="row">
         <svg viewBox="0 0 80 60" aria-hidden="true">
           <rect x="2" y="12" width="76" height="46" fill="#111"/><rect x="14" y="4" width="22" height="10" fill="#111"/>
           <circle cx="40" cy="35" r="17" fill="#333" stroke="#ffd000" stroke-width="3"><animate attributeName="fill" values="#333;#333;#fff;#333" dur="3s" repeatCount="indefinite"/></circle>
           <circle cx="40" cy="35" r="7" fill="#777"/>
         </svg>
         <div class="h">¿REAL<br>O GAN?</div>
       </div>
       <div class="band s">LA CO-OCURRENCIA NO MIENTE<br><span style="color:#fff">NATARAJ ET AL. 2019</span></div>`,

    correlograma: () => {
      let celdas = '';
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
        celdas += `<i style="background:hsl(${((i + j) * 22 + Math.sin((i - j) * 0.7) * 40 + 360) % 360},85%,55%)"></i>`;
      }
      return `<div class="pal" aria-hidden="true">${celdas}</div>
        <div><div class="h">BUSCADOR<br>DE IMÁGENES</div><div class="s">AÑO: 1997<br>IA: CERO</div>
        <div class="s" style="margin-top:10px">CORRELOGRAMS · HUANG 1997</div></div>`;
    },

    paris: () => {
      const lineas = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
        const a = k * Math.PI / 8, m = 0.4 + 0.6 * Math.abs(Math.sin(k * 1.3));
        return `<line x1="${-Math.cos(a) * 22 * m}" y1="${-Math.sin(a) * 22 * m}" x2="${Math.cos(a) * 22 * m}" y2="${Math.sin(a) * 22 * m}" stroke="#b8892b" stroke-width="2"/>`;
      }).join('');
      return `<svg viewBox="-25 -25 50 50" aria-hidden="true">${lineas}</svg>
        <div class="h">¿Qué hace a París<br>ser París?</div>
        <div class="m">acá: ¿los balcones?</div>
        <div class="s">HOG · DOERSCH ET AL. 2012</div>`;
    },

    crossdomain: () =>
      `<div class="h">ESTE CUADRO</div><div class="h y">= ESTA FOTO</div>
       <div class="pics">
         <span class="paint">${pixelArt(PAISAJE, { b: '#6a7fd1', y: '#ffd43b', w: '#e6d6b8', g: '#5d8a3a', d: '#7a5a2e' }, 12, 10)}</span>
         <span class="arr"></span>
         <span class="photo">${pixelArt(PAISAJE, { b: '#8ec5ff', y: '#ffffff', w: '#9aa3ad', g: '#3f7d2f', d: '#5b4a35' }, 12, 10)}</span>
       </div>
       <div class="s">HOG · SHRIVASTAVA 2011</div>`,

    copymove: () =>
      `<div class="top"><span class="h">ZONA CLONADA</span><span class="siren" aria-hidden="true"></span></div>
       <div class="keys"><span class="key">CTRL+C</span><span class="key">CTRL+V</span><span class="key">SIFT</span></div>
       <div class="ok">¡DETECTADO!</div>
       <div class="s">COPY-MOVE · AMERINI 2011</div>`,

    videogoogle: () =>
      `<div class="bar"><span class="typed"></span></div>
       <div class="q">Buscando en 500 h de video… 37 tomas</div>
       <div class="h">SIFT = PALABRAS <span>VISUALES</span></div>
       <div class="s">VIDEO GOOGLE · SIVIC &amp; ZISSERMAN 2003</div>`,

    fourier: () => {
      const estrella = Array.from({ length: 10 }, (_, i) => {
        const r = i % 2 ? 14 : 34, a = -Math.PI / 2 + i * Math.PI / 5;
        return (r * Math.cos(a)).toFixed(1) + ',' + (r * Math.sin(a)).toFixed(1);
      }).join(' ');
      return `<div class="img"><svg viewBox="-48 -48 96 96" aria-hidden="true">
          <rect x="-48" y="-48" width="96" height="96" fill="#14285a"/>
          ${[40, 30, 20].map((r) => `<circle r="${r}" fill="none" stroke="#28a0c8" stroke-width="5"/>`).join('')}
          <polygon points="${estrella}" fill="#ffd23c"/><circle r="8" fill="#e63c5a"/>
        </svg></div>
        <div><div class="h">UN MLP</div><div class="h y">TE DIBUJA</div>
        <div class="xy">(x,y) → color</div><div class="ep">ÉPOCA <span class="epoch">0000</span></div></div>
        <div class="s s-abajo">FOURIER FEATURES · TANCIK 2020</div>`;
    },

    siren: () => {
      const onda = (amp, ciclos, fase) => {
        let d = 'M0 40';
        for (let x = 0; x <= 800; x += 8) d += ` L${x} ${(40 + amp * Math.sin(x / 400 * ciclos * Math.PI + fase)).toFixed(1)}`;
        return d;
      };
      return `<div class="wave" aria-hidden="true"><svg viewBox="0 0 800 80" preserveAspectRatio="none">
          <path d="${onda(26, 4, 0)}" fill="none" stroke="#ff5ec4" stroke-width="4"/>
          <path d="${onda(34, 2, 1)}" fill="none" stroke="#3a2f7a" stroke-width="4"/>
        </svg></div>
        <div class="sin">sin(x)</div><div class="h">ES TODO LO QUE</div><div class="h c">NECESITÁS</div>
        <div class="s">SIREN · SITZMANN ET AL. 2020</div>`;
    },

    gatys: () =>
      `<span class="swirl" aria-hidden="true"></span>
       <div class="h">TU FOTO</div><div class="h y">× VAN GOGH</div>
       <div class="band s">LA ÚNICA CNN PERMITIDA<br><span style="color:#fff">STYLE TRANSFER · GATYS 2016</span></div>`,

    harris: () => {
      
      const esq = [[22, 18], [70, 12], [96, 40], [62, 50], [40, 62]];
      const marcas = esq.map(([x, y], i) =>
        `<ellipse cx="${x}" cy="${y}" rx="4" ry="4" fill="none" stroke="#ffd23f" stroke-width="2">
           <animate attributeName="rx" values="3;11;6;3" dur="3s" begin="${-i * 0.6}s" repeatCount="indefinite"/>
           <animate attributeName="ry" values="3;6;11;3" dur="3s" begin="${-i * 0.6}s" repeatCount="indefinite"/>
         </ellipse><circle cx="${x}" cy="${y}" r="1.8" fill="#fff"/>`).join('');
      return `<svg viewBox="0 0 120 80" aria-hidden="true">
          <g class="zoom">
            <polygon points="22,18 70,12 96,40 62,50 40,62" fill="#2f6b4a" stroke="#9fe0b0" stroke-width="2"/>
            <line x1="46" y1="15" x2="79" y2="45" stroke="#9fe0b0" stroke-width="1.5"/>
            ${marcas}
          </g>
        </svg>
        <div><div class="h">ESQUINAS</div><div class="h y">A CUALQUIER ESCALA</div>
        <div class="zm">ALTURA DEL DRON <span class="escala">x1.0</span></div></div>
        <div class="s s-abajo">HARRIS-AFFINE · MIKOLAJCZYK 2004</div>`;
    },

    cancha: () => {
      
      const L = [
        [12, 68, 108, 68], [32, 6, 88, 6], [12, 68, 32, 6], [108, 68, 88, 6],   
        [24, 68, 39, 6], [96, 68, 81, 6],                                      
        [28.1, 51.3, 92, 51.3], [35, 22.7, 85, 22.7], [60, 51.3, 60, 22.7],   
      ];
      const lineas = L.map(([x1, y1, x2, y2], i) =>
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="animation-delay:${i * 0.15}s"/>`).join('');
      return `<svg viewBox="0 0 120 72" aria-hidden="true">
          <polygon points="12,68 108,68 88,6 32,6" fill="#c4643a"/>
          <g class="lineas" fill="none" stroke-width="1.6" stroke-linecap="round">${lineas}</g>
          <line x1="22" y1="37" x2="98" y2="37" stroke="#222" stroke-width="2.5" stroke-dasharray="2 1"/>
          <circle r="2.6" fill="#e6ff3a" stroke="#556b00" stroke-width=".6">
            <animate attributeName="cx" values="30;52;74;74" keyTimes="0;.5;.8;1" dur="2.4s" repeatCount="indefinite"/>
            <animate attributeName="cy" values="60;20;14;14" keyTimes="0;.5;.8;1" dur="2.4s" repeatCount="indefinite"/>
          </circle>
        </svg>
        <div class="h">LA CANCHA SE ENCUENTRA SOLA</div>
        <div class="st"><span>¿PICÓ AFUERA?</span><span>ADENTRO ✓</span></div>
        <div class="band s">HOUGH · FARIN ET AL. 2004</div>`;
    },

    letra: () =>
      `<svg class="tinta" viewBox="0 0 200 50" aria-hidden="true">
         <path d="M6 34 c8 -26 18 -26 16 2 s10 -22 18 -4 s8 -18 16 0 c6 -26 14 -26 12 3 s12 -20 20 -2 s10 -16 18 0 c8 -24 16 -24 14 4 s14 -20 22 -4 s10 -14 20 2"
               fill="none" stroke="#1f2a44" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
       </svg>
       <span class="lupa" aria-hidden="true"></span>
       <div class="h">LA LETRA</div><div class="h r">NO MIENTE</div>
       <div class="lbp">LBP: <span class="bits">00000000</span></div>
       <div class="s">WRITER ID · BERTOLINI ET AL. 2013</div>`,
  };

  window.BANNERS = BANNERS;
  window.escHTML = esc;
})();
