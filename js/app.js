/* 
   app.js — Lógica de la página
     1. Carga config.json, mails.json y ads.json
     2. Completa los textos generales (título, marquesina, intro, pie)
     3. Arma la grilla de carteles (usa window.BANNERS de banners.js)
     4. Pone las publicidades
     5. Abre y cierra la ventana de cada mail
     6. Muestra el aviso de chat (PíxelMessenger)
     7. Recuerda qué mails se leyeron (solo en este navegador)
     8. Links directos: index.html#copy-move abre ese mail
     9. Anima los contadores de los carteles
    10. Cuenta regresiva a la entrega del TP
*/

(function () {
  'use strict';

  const RUTAS = {
    config: 'data/config.json',
    mails: 'data/mails.json',
    ads: 'data/ads.json',
  };

  const esc = window.escHTML;
  const $ = (sel) => document.querySelector(sel);

  const estado = {
    config: null,
    mails: [],     // solo los mails con visible !== false
    comun: {},     // mails.json > comun (títulos, entrega, despedida, firma, regla de librerías)
    actual: -1,    // índice del mail abierto (-1 = ninguno)
    leidos: new Set(),
  };

  /* ---- 1. Carga de datos ------------------------------------------ */
  async function cargarJSON(ruta) {
    const r = await fetch(ruta, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`No se pudo leer ${ruta} (HTTP ${r.status})`);
    try { return await r.json(); }
    catch (e) { throw new Error(`${ruta} tiene un error de formato JSON: ${e.message}`); }
  }

  async function iniciar() {
    try {
      const [config, mailsData, adsData] = await Promise.all([
        cargarJSON(RUTAS.config), cargarJSON(RUTAS.mails), cargarJSON(RUTAS.ads),
      ]);
      estado.config = config;
      estado.mails = (mailsData.mails || []).filter((m) => m.visible !== false);
      estado.comun = mailsData.comun || {};
      cargarLeidos();
      pintarTextos(config);
      iniciarCuenta(config);
      pintarGrilla();
      pintarPublicidades(adsData.publicidades || []);
      conectarBotones();
      leerHash();
      window.addEventListener('hashchange', leerHash);
      setInterval(animarContadores, 100);
    } catch (err) {
      mostrarError(err);
    }
  }

  function mostrarError(err) {
    const local = location.protocol === 'file:';
    $('#error').hidden = false;
    $('#error').innerHTML =
      `<b>No se pudieron cargar los datos.</b><br>${esc(err.message)}<br><br>` +
      (local
        ? 'Abriste el archivo con doble clic. El navegador no deja leer los JSON así: corré <code>python -m http.server</code> en la carpeta del sitio y entrá a <code>http://localhost:8000</code>, o subilo a GitHub Pages.'
        : 'Revisá que los archivos de <code>data/</code> existan y sean JSON válidos (podés pegarlos en jsonlint.com).');
  }

  /* ---- 2. Textos generales ---------------------------------------- */
  function pintarTextos(c) {
    const s = c.sitio || {};
    document.title = s.titulo_pestana || document.title;
    $('#tituloVentana').textContent = s.titulo_ventana || '';
    $('#urlFalsa').textContent = s.url_falsa || '';
    $('#marquesina').textContent = s.marquesina || '';
    $('#intro').innerHTML = s.intro_html || '';       
    $('#pie').textContent = s.pie || '';
    $('#carpeta').textContent = s.carpeta || 'Papers';
    $('#tituloBandeja').textContent = `${s.carpeta || 'Papers'} · ${estado.mails.length} mensajes de clientes`;
    $('#contador').innerHTML = [...String(s.contador_visitas || '0001337')].map((d) => `<b>${esc(d)}</b>`).join('');
    const b = c.banner_superior || {};
    $('#bsTitulo').textContent = b.titulo || '';
    $('#bsTexto').textContent = b.texto || '';
    $('#azar').textContent = b.boton || 'Abrir uno al azar';
    actualizarNoLeidos();
  }

  /* ---- 3. Grilla de carteles -------------------------------------- */
  function pintarGrilla() {
    const grid = $('#grid');
    grid.innerHTML = '';
    estado.mails.forEach((m, i) => {
      const tipo = window.BANNERS[m.banner?.tipo] ? m.banner.tipo : 'generico';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tile b-${tipo}` + (estado.leidos.has(m.id) ? ' read' : '');
      btn.setAttribute('aria-label', `Abrir mail ${i + 1}: ${m.paper?.titulo || m.asunto}`);
      if (tipo === 'generico') {
        const b = m.banner || {};
        if (b.fondo) btn.style.setProperty('--bg', b.fondo);
        if (b.texto) btn.style.setProperty('--fg', b.texto);
        if (b.acento) btn.style.setProperty('--ac', b.acento);
        if (b.borde) btn.style.setProperty('--bd', b.borde);
      }
      btn.innerHTML = `<span class="num">#${String(i + 1).padStart(2, '0')}</span><span class="new">NUEVO</span>` + window.BANNERS[tipo](m);
      btn.addEventListener('click', () => abrirMail(i));
      grid.appendChild(btn);
    });
  }

  /* ---- 4. Publicidades -------------------------------------------- */
  function pintarPublicidades(lista) {
    const zonas = { lateral: $('#adsLateral'), inferior: $('#adsInferior') };
    lista.filter((a) => a.visible !== false).forEach((a) => {
      const zona = zonas[a.lugar] || zonas.lateral;
      const img = `<img src="${esc(a.imagen)}" alt="${esc(a.alt || 'Publicidad')}" loading="lazy">`;
      let el;
      if (a.link && a.link.startsWith('#')) {
        // Link a un mail del sitio (#id)
        el = document.createElement('a');
        el.href = a.link;
      } else if (a.link) {
        el = document.createElement('a');
        el.href = a.link; el.target = '_blank'; el.rel = 'noopener';
      } else {
        el = document.createElement('div');
      }
      el.className = 'ad' + (a.link ? ' ad--link' : '');
      el.innerHTML = img;
      zona.appendChild(el);
    });
  }

  /* ---- 5. Ventana del mail ---------------------------------------- */
  let focoAnterior = null;

  /** Link al paper: el que diga el JSON o una búsqueda en Google Scholar. */
  const linkPaper = (p) => p.url || `https://scholar.google.com/scholar?q=${encodeURIComponent('"' + p.titulo + '"')}`;

  /** HTML de un recurso (dataset, código, adjunto...). */
  function htmlRecurso(r) {
    const tipo = (r.tipo || 'link').toLowerCase();
    const esImagen = /\.(png|jpe?g|gif|webp)$/i.test(r.url || '');
    const esExterno = /^https?:\/\//i.test(r.url || '');
    const titulo = r.url
      ? `<a class="tit" href="${esc(r.url)}" ${esExterno ? 'target="_blank" rel="noopener"' : 'target="_blank"'}>${esc(r.titulo)}</a>`
      : `<span class="tit">${esc(r.titulo)}</span>`;
    return `<li class="recurso">
        <span class="tipo tipo--${esc(tipo)}">${esc(tipo.toUpperCase())}</span>
        <span>${titulo}${r.nota ? `<span class="nota">${esc(r.nota)}</span>` : ''}
        ${tipo === 'adjunto' && esImagen ? `<img class="thumb" src="${esc(r.url)}" alt="Vista previa de ${esc(r.titulo)}">` : ''}</span>
      </li>`;
  }

  /** Etiquetas de cada tipo de dificultad (ficha.dificultades[].tipo). */
  const DIFICULTADES = {
    paper: 'PAPER DIFÍCIL',
    codigo: 'MUCHO CÓDIGO',
    tiempo: 'TARDA EN CORRER',
    gpu: 'NECESITA GPU',
    'dataset-conseguir': 'DATASET DIFÍCIL DE CONSEGUIR',
    'dataset-armar': 'HAY QUE ARMAR EL DATASET',
  };

  /** HTML de la ficha técnica. Los campos viejos (nucleo, extra) se muestran solo si están. */
  function htmlFicha(f, com) {
    const nivel = String(f.dificultad || '').trim();
    const claves = Array.isArray(f.palabras_clave) ? f.palabras_clave : [];
    const difs = Array.isArray(f.dificultades) ? f.dificultades : [];
    const item = (d) => {
      const tipo = String(d.tipo || '').toLowerCase();
      return `<li><span class="tag tag--${esc(tipo)}">${esc(DIFICULTADES[tipo] || tipo.toUpperCase())}</span><span>${esc(d.nota || '')}</span></li>`;
    };
    return `<dt>Tema de la materia</dt><dd>${esc(f.tema)}</dd>` +
      (claves.length ? `<dt>Palabras clave</dt><dd><ul class="chips">${claves.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></dd>` : '') +
      (f.nucleo ? `<dt>Núcleo mínimo</dt><dd>${esc(f.nucleo)}</dd>` : '') +
      `<dt>Pueden usar librería para</dt><dd>${f.librerias || ''}` +                 // admite <code>
      (com.reglas_librerias ? `<span class="regla">${esc(com.reglas_librerias)}</span>` : '') + `</dd>` +
      `<dt>Datos sugeridos</dt><dd>${esc(f.datos)}</dd>` +
      (f.extra ? `<dt>Ejercicio extra (+1)</dt><dd>${esc(f.extra)}</dd>` : '') +
      `<dt>Dificultad</dt><dd><span class="dif dif--${esc(nivel.toLowerCase())}">${esc(nivel)}</span>` +
      (difs.length ? `<ul class="difs">${difs.map(item).join('')}</ul>` : '') + `</dd>`;
  }

  function abrirMail(i, desdeHash) {
    const n = estado.mails.length;
    estado.actual = ((i % n) + n) % n;
    const m = estado.mails[estado.actual];
    const cm = estado.config.mail || {};
    const ov = $('#overlay');
    if (ov.hidden) focoAnterior = document.activeElement;

    $('#mTitulo').textContent = `Mensaje ${estado.actual + 1} de ${n} · ${m.cliente?.alias || m.cliente?.nombre || ''}`;
    $('#mDe').textContent = `${m.cliente?.nombre || ''} <${m.cliente?.email || ''}>`;
    $('#mPara').textContent = cm.para || '';
    $('#mFecha').textContent = m.fecha || '';
    $('#mTema').textContent = `#${String(estado.actual + 1).padStart(2, '0')} · ${m.ficha?.tema || ''}`;
    $('#mAsunto').textContent = m.asunto || '';

    // Lo común a todos los mails sale de mails.json > comun; si falta, de config.json > mail
    const com = estado.comun;
    const tit = com.titulos || {};
    const entrega = com.entrega || cm.entregables_html || [];
    const despedida = m.despedida || com.despedida || cm.despedida || '';
    const ola = esc(com.separador_firma || '~*~*~*~*~*~*~*~*~*~');
    const recursos = (m.recursos || []);
    $('#mCuerpo').innerHTML =
      `<p>${esc(cm.saludo || '')}</p>` +
      (m.cuerpo || []).map((p) => `<p>${p}</p>`).join('') +                        // admite HTML simple
      `<h4>${esc(tit.averiguar || cm.titulo_pedidos || '')}</h4><ol class="pedidos">${(m.pedidos || []).map((x) => `<li><span>${x}</span></li>`).join('')}</ol>` +
      `<h4>${esc(tit.paper || cm.titulo_paper || '')}</h4>
       <div class="paper"><div class="t"><a href="${esc(linkPaper(m.paper))}" target="_blank" rel="noopener">${esc(m.paper.titulo)}</a></div>
       <div class="a">${esc(m.paper.autores)}. <i>${esc(m.paper.publicacion)}</i>.</div></div>` +
      (recursos.length ? `<h4>${esc(tit.recursos || cm.titulo_recursos || '')}</h4><ul class="recursos">${recursos.map(htmlRecurso).join('')}</ul>` : '') +
      `<h4>${esc(tit.entrega || cm.titulo_entregables || '')}</h4><ul class="stars">${entrega.map((x) => `<li><span>${x}</span></li>`).join('')}</ul>` +
      `<p>${esc(despedida)}</p>
       <div class="sig"><div class="wave">${ola}</div>${esc(m.cliente?.firma || '')}<div class="wave">${ola}</div></div>`;

    $('#mFicha').innerHTML = htmlFicha(m.ficha || {}, com);
    $('#mPie').textContent = cm.pie || '';

    ov.hidden = false;
    ov.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    $('#cerrar').focus({ preventScroll: true });
    if (!desdeHash && location.hash !== '#' + m.id) history.replaceState(null, '', '#' + m.id);

    marcarLeido(m.id);
    avisoChat(m);
  }

  function cerrarMail() {
    $('#overlay').hidden = true;
    document.body.style.overflow = '';
    ocultarChat();
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    if (focoAnterior) focoAnterior.focus({ preventScroll: true });
  }

  /* ---- 6. Aviso de chat ------------------------------------------- */
  let timerChat;
  let ultimoMensaje = -1;


  function elegirMensaje(m, c) {
    if (m.chat) return m.chat;
    const lista = Array.isArray(c.mensajes) && c.mensajes.length ? c.mensajes : [c.mensaje || '¡¡ZUMBIDO!!'];
    let i = Math.floor(Math.random() * lista.length);
    if (lista.length > 1 && i === ultimoMensaje) i = (i + 1) % lista.length; 
    ultimoMensaje = i;
    return lista[i];
  }

  function avisoChat(m) {
    const c = estado.config.messenger || {};
    ocultarChat();
    if (c.activo === false) return;
    $('#chatQuien').textContent = m.cliente?.alias || m.cliente?.nombre || '';
    $('#chatMsg').textContent = elegirMensaje(m, c);
    timerChat = setTimeout(() => {
      $('#toast').classList.add('show');
      const w = $('#win');
      w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake');
      timerChat = setTimeout(ocultarChat, c.duracion_ms || 4500);
    }, c.demora_ms || 1400);
  }
  function ocultarChat() { clearTimeout(timerChat); $('#toast').classList.remove('show'); }

  /* ---- 7. Leídos (localStorage) ----------- */
  const CLAVE_LEIDOS = 'pixelmail-leidos';
  function cargarLeidos() {
    try { estado.leidos = new Set(JSON.parse(localStorage.getItem(CLAVE_LEIDOS) || '[]')); } catch (e) { /* sin storage: no pasa nada */ }
  }
  function guardarLeidos() {
    try { localStorage.setItem(CLAVE_LEIDOS, JSON.stringify([...estado.leidos])); } catch (e) { /* idem */ }
  }
  function marcarLeido(id) {
    estado.leidos.add(id); guardarLeidos(); actualizarNoLeidos();
    const i = estado.mails.findIndex((m) => m.id === id);
    if (i >= 0) $('#grid').children[i].classList.add('read');
  }
  function actualizarNoLeidos() {
    const n = estado.mails.filter((m) => !estado.leidos.has(m.id)).length;
    $('#noLeidos').textContent = n;
  }

  /* ---- 8. Links directos (#id) ------------------------------------ */
  function leerHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    const i = estado.mails.findIndex((m) => m.id === id);
    if (i >= 0) abrirMail(i, true);
    else if (!$('#overlay').hidden) { $('#overlay').hidden = true; document.body.style.overflow = ''; ocultarChat(); }
  }

  /* ---- Botones ---------------------------------------------------- */
  function conectarBotones() {
    const azar = () => abrirMail(Math.floor(Math.random() * estado.mails.length));
    $('#azar').addEventListener('click', azar);
    $('#sorprendeme').addEventListener('click', azar);
    $('#abrirPrimero').addEventListener('click', () => abrirMail(0));
    $('#resetLeidos').addEventListener('click', () => {
      estado.leidos.clear(); guardarLeidos(); actualizarNoLeidos();
      [...$('#grid').children].forEach((t) => t.classList.remove('read'));
    });
    $('#cerrar').addEventListener('click', cerrarMail);
    $('#cerrarX').addEventListener('click', cerrarMail);
    $('#anterior').addEventListener('click', () => abrirMail(estado.actual - 1));
    $('#siguiente').addEventListener('click', () => abrirMail(estado.actual + 1));
    $('#overlay').addEventListener('click', (e) => { if (e.target.id === 'overlay') cerrarMail(); });
    document.addEventListener('keydown', (e) => {
      if ($('#overlay').hidden) return;
      if (e.key === 'Escape') cerrarMail();
      if (e.key === 'ArrowRight') abrirMail(estado.actual + 1);
      if (e.key === 'ArrowLeft') abrirMail(estado.actual - 1);
    });
    $('#copiarLink').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const url = location.href.split('#')[0] + '#' + estado.mails[estado.actual].id;
      try { await navigator.clipboard.writeText(url); btn.textContent = '¡Copiado!'; }
      catch (err) { btn.textContent = 'No se pudo copiar'; }
      setTimeout(() => { btn.textContent = 'Copiar link'; }, 1600);
    });
  }

  /* ---- 9. Contadores animados de los carteles --------------------- */
  let tick = 0;
  const FRASE = 'dónde aparece el reloj de pared';
  function animarContadores() {
    tick++;
    const pad = (x) => String(x).padStart(4, '0');
    document.querySelectorAll('.votes').forEach((e) => { e.textContent = pad((tick * 137) % 10000); });
    document.querySelectorAll('.cajas').forEach((e) => { e.textContent = pad(Math.min(2000, (tick * 53) % 2400)); });
    document.querySelectorAll('.epoch').forEach((e) => { e.textContent = pad(Math.min(2000, (tick * 25) % 2600)); });
    const n = tick % (FRASE.length + 12);
    document.querySelectorAll('.typed').forEach((e) => { e.textContent = FRASE.slice(0, Math.min(n, FRASE.length)); });
    // harris: zoom que va de x0.5 a x4.0 y vuelve
    const z = 0.5 + 3.5 * (0.5 - 0.5 * Math.cos(tick / 12));
    document.querySelectorAll('.escala').forEach((e) => { e.textContent = 'x' + z.toFixed(1); });
    // letra: código LBP de 8 bits que cambia cada 0,3 s
    if (tick % 3 === 0) {
      const bits = (((tick / 3) * 2654435761) >>> 24).toString(2).padStart(8, '0');
      document.querySelectorAll('.bits').forEach((e) => { e.textContent = bits; });
    }
  }

  /* ---- 10. Cuenta regresiva a la entrega ------------------------------
     Se configura en config.json > cuenta_regresiva:
       { "fecha": "2026-12-14T23:59:00-03:00", "texto": "Lunes 14 de diciembre, 23:59",
         "mensaje_fin": "¡Se terminó el plazo!" }
     Si no está, usa los valores de abajo. */
  const ENTREGA_DEFECTO = {
    fecha: '2026-12-14T23:59:00-03:00',
    texto: 'Lunes 14 de diciembre, 23:59',
    mensaje_fin: '¡Se terminó el plazo!',
  };

  function iniciarCuenta(c) {
    const e = Object.assign({}, ENTREGA_DEFECTO, c.cuenta_regresiva || {});
    const fin = new Date(e.fecha).getTime();
    if (e.activo === false || isNaN(fin)) { $('#cuenta').hidden = true; return; }
    $('#cuentaFecha').textContent = e.texto;
    const dos = (n) => String(n).padStart(2, '0');
    const caja = (n, u) => `<span class="u"><b>${dos(n)}</b><small>${u}</small></span>`;
    let timer;
    const paso = () => {
      const ms = fin - Date.now();
      const panel = $('#cuenta');
      if (ms <= 0) {
        clearInterval(timer);
        panel.classList.add('vencida');
        $('#cuentaDigitos').innerHTML = caja(0, 'DÍAS') + caja(0, 'HS') + caja(0, 'MIN') + caja(0, 'SEG');
        $('#cuentaMsg').textContent = e.mensaje_fin;
        $('#faltaChip').textContent = '⏰ ' + e.mensaje_fin;
        return;
      }
      const s = Math.floor(ms / 1000);
      const d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60;
      $('#cuentaDigitos').innerHTML = caja(d, 'DÍAS') + caja(h, 'HS') + caja(m, 'MIN') + caja(s % 60, 'SEG');
      panel.classList.toggle('urgente', d < 3);
      $('#cuentaMsg').textContent = d < 1 ? '¡¡ES HOY!! ¡¡A SUBIR TODO!!' : d < 3 ? '¡¡ÚLTIMOS DÍAS!!' : d < 7 ? '¡Última semana!' : '';
      $('#faltaChip').textContent = d >= 1 ? `⏰ Faltan ${d} ${d === 1 ? 'día' : 'días'} para la entrega` : '⏰ ¡La entrega es hoy!';
    };
    paso();
    timer = setInterval(paso, 1000);
  }

  iniciar();
})();
