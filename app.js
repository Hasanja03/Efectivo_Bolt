'use strict';

// Todo el dinero se guarda en céntimos (enteros) para evitar errores de redondeo.
const STORAGE_KEY = 'efectivo-bolt-v1';

const $ = id => document.getElementById(id);

let data = load();
let fechaActual = hoy();
let periodo = 'semana';

/* ---------- Utilidades ---------- */

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.days) return parsed;
    }
  } catch (e) { /* datos corruptos o almacenamiento bloqueado */ }
  return { days: {} };
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    toast('No se pudo guardar en el móvil');
  }
}

function hoy() {
  return isoDate(new Date());
}

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(iso, n) {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

// Acepta "8,70", "8.70", "8", "8,7 €". Devuelve céntimos o null si está vacío/no válido.
function toCents(str) {
  if (str == null) return null;
  const clean = String(str).replace(/[€\s]/g, '').replace(',', '.');
  if (clean === '') return null;
  const n = Number(clean);
  if (!isFinite(n)) return null;
  return Math.round(n * 100);
}

const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
function eur(cents) {
  return fmt.format((cents || 0) / 100);
}
function eurSigned(cents) {
  return (cents > 0 ? '+' : '') + eur(cents);
}
function centsToInput(cents) {
  return cents == null ? '' : (cents / 100).toFixed(2).replace('.', ',');
}

function fechaLarga(iso) {
  return parseDate(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 2200);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- Cálculos ---------- */

function getDay(iso) {
  return data.days[iso] || { fondo: null, contado: null, viajes: [] };
}

function ensureDay(iso) {
  if (!data.days[iso]) data.days[iso] = { fondo: null, contado: null, viajes: [] };
  return data.days[iso];
}

// Lo que se queda en tu bolsillo de un viaje = lo que te dio − lo que devolviste.
// Si no se apuntó lo recibido, se asume que pagó justo.
function netoViaje(v) {
  if (v.recibido == null) return v.precio;
  return v.recibido - (v.cambio || 0);
}

function totalesDia(day) {
  let bolt = 0, total = 0;
  for (const v of day.viajes) {
    bolt += v.precio;
    total += netoViaje(v);
  }
  return { bolt, total, propina: total - bolt, viajes: day.viajes.length };
}

/* ---------- Vista Día ---------- */

function renderDia() {
  $('fecha').value = fechaActual;
  const day = getDay(fechaActual);
  const t = totalesDia(day);

  $('sum-bolt').textContent = eur(t.bolt);
  $('sum-propina').textContent = eur(t.propina);
  $('sum-total').textContent = eur(t.total);
  $('sum-viajes').textContent =
    `${fechaLarga(fechaActual)} · ${t.viajes} ${t.viajes === 1 ? 'viaje' : 'viajes'} en efectivo`;

  const ul = $('lista-viajes');
  if (!day.viajes.length) {
    ul.innerHTML = '<li class="empty">Aún no hay viajes este día.</li>';
  } else {
    ul.innerHTML = day.viajes.map((v, i) => {
      const prop = netoViaje(v) - v.precio;
      const detalle = v.recibido == null
        ? 'Pagó justo'
        : `Dio ${eur(v.recibido)}${v.cambio ? ` · devolví ${eur(v.cambio)}` : ''}`;
      return `<li>
        <div class="main">
          <strong>#${i + 1} · ${v.hora || ''}</strong>
          <small>${detalle}${v.nota ? ' · ' + escapeHtml(v.nota) : ''}</small>
        </div>
        <div class="amt">
          ${eur(v.precio)}
          ${prop ? `<small class="${prop < 0 ? 'neg' : ''}">propina ${eurSigned(prop)}</small>` : ''}
        </div>
        <button class="del" data-id="${v.id}" aria-label="Borrar viaje">✕</button>
      </li>`;
    }).join('');
  }

  // No pisar lo que el usuario está escribiendo
  if (document.activeElement !== $('c-fondo')) $('c-fondo').value = centsToInput(day.fondo);
  if (document.activeElement !== $('c-contado')) $('c-contado').value = centsToInput(day.contado);
  renderCierre();
}

function renderCierre() {
  const day = getDay(fechaActual);
  const t = totalesDia(day);
  const fondo = day.fondo || 0;
  const esperado = fondo + t.total;

  $('c-esperado').textContent = eur(esperado);
  $('c-bolt').textContent = eur(t.bolt);

  const dif = $('c-diferencia');
  const real = $('c-propina-real');
  if (day.contado == null) {
    dif.textContent = '–';
    real.textContent = '–';
    dif.className = real.className = '';
  } else {
    const d = day.contado - esperado;
    const p = day.contado - fondo - t.bolt;
    dif.textContent = d === 0 ? 'Cuadra ✔' : eurSigned(d);
    dif.className = d < 0 ? 'neg' : d > 0 ? 'pos' : '';
    real.textContent = eur(p);
    real.className = p < 0 ? 'neg' : 'pos';
  }
}

function updatePreview() {
  const precio = toCents($('v-precio').value);
  const recibido = toCents($('v-recibido').value);
  const cambio = toCents($('v-cambio').value) || 0;
  const el = $('v-preview');
  if (precio == null) {
    el.textContent = 'Propina: 0,00 €';
    el.className = 'preview';
    return;
  }
  const neto = recibido == null ? precio : recibido - cambio;
  const prop = neto - precio;
  el.textContent = prop < 0
    ? `Faltan ${eur(-prop)} (los pones tú)`
    : `Propina: ${eur(prop)} · Bolt: ${eur(precio)}`;
  el.className = 'preview' + (prop < 0 ? ' neg' : '');
}

function addViaje(e) {
  e.preventDefault();
  const precio = toCents($('v-precio').value);
  if (precio == null || precio <= 0) {
    toast('Pon el precio del viaje');
    $('v-precio').focus();
    return;
  }
  const recibido = toCents($('v-recibido').value);
  const cambio = toCents($('v-cambio').value);
  const now = new Date();
  const day = ensureDay(fechaActual);
  day.viajes.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    precio,
    recibido,
    cambio: recibido == null ? null : (cambio || 0),
    nota: $('v-nota').value.trim(),
    hora: now.toTimeString().slice(0, 5),
  });
  save();
  e.target.reset();
  updatePreview();
  renderDia();
  toast('Viaje guardado');
  $('v-precio').focus();
}

function delViaje(id) {
  const day = getDay(fechaActual);
  const v = day.viajes.find(x => x.id === id);
  if (!v) return;
  if (!confirm(`¿Borrar el viaje de ${eur(v.precio)}?`)) return;
  day.viajes = day.viajes.filter(x => x.id !== id);
  limpiarDia(fechaActual);
  save();
  renderDia();
}

// Elimina días que se han quedado sin nada apuntado
function limpiarDia(iso) {
  const d = data.days[iso];
  if (d && !d.viajes.length && d.fondo == null && d.contado == null) delete data.days[iso];
}

function onCierreInput(campo, input) {
  const day = ensureDay(fechaActual);
  day[campo] = toCents(input.value);
  limpiarDia(fechaActual);
  save();
  renderCierre();
}

/* ---------- Vista Historial ---------- */

function rangoPeriodo() {
  const today = parseDate(hoy());
  if (periodo === 'semana') {
    const dow = (today.getDay() + 6) % 7; // lunes = 0
    const ini = new Date(today); ini.setDate(today.getDate() - dow);
    const fin = new Date(ini); fin.setDate(ini.getDate() + 6);
    return [isoDate(ini), isoDate(fin), 'esta semana'];
  }
  if (periodo === 'mes') {
    const ini = new Date(today.getFullYear(), today.getMonth(), 1);
    const fin = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return [isoDate(ini), isoDate(fin), 'este mes'];
  }
  return ['0000-00-00', '9999-12-31', 'en total'];
}

function renderHistorial() {
  const [ini, fin, nombre] = rangoPeriodo();
  const dias = Object.keys(data.days).filter(d => d >= ini && d <= fin).sort().reverse();

  let bolt = 0, propina = 0, total = 0, viajes = 0;
  const filas = dias.map(iso => {
    const t = totalesDia(data.days[iso]);
    bolt += t.bolt; propina += t.propina; total += t.total; viajes += t.viajes;
    return `<li class="clickable" data-dia="${iso}">
      <div class="main">
        <strong>${fechaLarga(iso)}</strong>
        <small>${t.viajes} ${t.viajes === 1 ? 'viaje' : 'viajes'} · Bolt ${eur(t.bolt)}</small>
      </div>
      <div class="amt">
        ${eur(t.total)}
        <small class="${t.propina < 0 ? 'neg' : ''}">propina ${eur(t.propina)}</small>
      </div>
    </li>`;
  });

  $('h-bolt').textContent = eur(bolt);
  $('h-propina').textContent = eur(propina);
  $('h-total').textContent = eur(total);
  const n = dias.length;
  $('h-resumen').textContent = n
    ? `${viajes} viajes en ${n} ${n === 1 ? 'día' : 'días'} ${nombre} · media propina/día ${eur(Math.round(propina / n))}`
    : `Sin datos ${nombre}`;
  $('lista-dias').innerHTML = filas.join('') || '<li class="empty">No hay días apuntados.</li>';
}

/* ---------- Exportar / importar ---------- */

function descargar(nombre, contenido, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

function exportCSV() {
  const num = c => c == null ? '' : (c / 100).toFixed(2).replace('.', ',');
  const lineas = ['Fecha;Viajes;De Bolt;Propinas;Efectivo total;Cambio inicial;Contado final'];
  for (const iso of Object.keys(data.days).sort()) {
    const d = data.days[iso];
    const t = totalesDia(d);
    lineas.push([iso, t.viajes, num(t.bolt), num(t.propina), num(t.total), num(d.fondo), num(d.contado)].join(';'));
  }
  // BOM para que Excel lea bien los acentos
  descargar(`efectivo-bolt-${hoy()}.csv`, '﻿' + lineas.join('\r\n'), 'text/csv;charset=utf-8');
}

function exportJSON() {
  descargar(`efectivo-bolt-copia-${hoy()}.json`, JSON.stringify(data, null, 2), 'application/json');
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || typeof parsed.days !== 'object') throw new Error('formato');
      if (!confirm('Esto sustituirá los datos actuales por los de la copia. ¿Seguir?')) return;
      data = parsed;
      save();
      renderDia();
      renderHistorial();
      toast('Copia restaurada');
    } catch (err) {
      toast('El archivo no es una copia válida');
    } finally {
      e.target.value = '';
    }
  };
  reader.readAsText(file);
}

/* ---------- Navegación ---------- */

function showView(name) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  if (name === 'historial') renderHistorial();
  if (name === 'hoy') renderDia();
  window.scrollTo(0, 0);
}

function irADia(iso) {
  fechaActual = iso;
  showView('hoy');
}

/* ---------- Eventos ---------- */

document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
$('prev-day').addEventListener('click', () => irADia(addDays(fechaActual, -1)));
$('next-day').addEventListener('click', () => irADia(addDays(fechaActual, 1)));
$('fecha').addEventListener('change', e => { if (e.target.value) irADia(e.target.value); });

$('form-viaje').addEventListener('submit', addViaje);
['v-precio', 'v-recibido', 'v-cambio'].forEach(id => $(id).addEventListener('input', updatePreview));
$('lista-viajes').addEventListener('click', e => {
  const btn = e.target.closest('.del');
  if (btn) delViaje(btn.dataset.id);
});

$('c-fondo').addEventListener('input', e => onCierreInput('fondo', e.target));
$('c-contado').addEventListener('input', e => onCierreInput('contado', e.target));

$('periodo').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  periodo = b.dataset.p;
  document.querySelectorAll('#periodo button').forEach(x => x.classList.toggle('active', x === b));
  renderHistorial();
});
$('lista-dias').addEventListener('click', e => {
  const li = e.target.closest('[data-dia]');
  if (li) irADia(li.dataset.dia);
});

$('exp-csv').addEventListener('click', exportCSV);
$('exp-json').addEventListener('click', exportJSON);
$('imp-json').addEventListener('change', importJSON);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

renderDia();
