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

/* ---------- Cálculos ---------- */

// Un día guarda los importes en efectivo que marca Bolt, el cambio con el que
// se empezó (fondo) y el efectivo contado al final de la jornada.
function getDay(iso) {
  return data.days[iso] || { importes: [], fondo: null, contado: null };
}

function ensureDay(iso) {
  if (!data.days[iso]) {
    data.days[iso] = { importes: [], fondo: data.fondoHabitual ?? null, contado: null };
  }
  return data.days[iso];
}

// Versión anterior: se apuntaba viaje por viaje. Nos quedamos con el precio de cada uno.
function migrar() {
  for (const d of Object.values(data.days)) {
    if (Array.isArray(d.viajes)) {
      d.importes = (d.importes || []).concat(d.viajes.map(v => v.precio));
      delete d.viajes;
    }
    if (!Array.isArray(d.importes)) d.importes = [];
  }
}

function fondoDe(iso) {
  const d = data.days[iso];
  if (d && d.fondo != null) return d.fondo;
  return d ? 0 : (data.fondoHabitual || 0);
}

// cobrado = lo que tengo − el cambio con el que empecé
// propina = cobrado − lo que es de Bolt
// Mientras no se haya contado el dinero, cobrado y propina son null.
function totalesDia(day) {
  const bolt = day.importes.reduce((a, b) => a + b, 0);
  if (day.contado == null) return { bolt, total: null, propina: null, viajes: day.importes.length };
  const total = day.contado - (day.fondo || 0);
  return { bolt, total, propina: total - bolt, viajes: day.importes.length };
}

/* ---------- Vista Día ---------- */

function renderDia() {
  $('fecha').value = fechaActual;
  const day = getDay(fechaActual);

  const ul = $('lista-importes');
  ul.innerHTML = day.importes.length
    ? day.importes.map((c, i) =>
        `<li>${eur(c)}<button class="del" data-i="${i}" aria-label="Quitar ${eur(c)}">✕</button></li>`).join('')
    : '<li class="empty">Aún no has metido ningún importe.</li>';

  // No pisar lo que el usuario está escribiendo
  if (document.activeElement !== $('c-fondo')) $('c-fondo').value = centsToInput(fondoDe(fechaActual));
  if (document.activeElement !== $('c-contado')) $('c-contado').value = centsToInput(day.contado);
  renderResultado();
}

function renderResultado() {
  const day = getDay(fechaActual);
  const t = totalesDia(day);
  const n = t.viajes;

  $('i-total').textContent = eur(t.bolt);
  $('i-count').textContent = n ? `(${n} ${n === 1 ? 'viaje' : 'viajes'})` : '';
  $('sum-bolt').textContent = eur(t.bolt);

  const prop = $('sum-propina');
  if (t.total == null) {
    prop.textContent = '–';
    prop.className = '';
    $('sum-total').textContent = '–';
    $('sum-texto').textContent = `${fechaLarga(fechaActual)} · cuenta tu dinero para ver la propina`;
    return;
  }
  prop.textContent = eur(t.propina);
  prop.className = t.propina < 0 ? 'neg' : '';
  $('sum-total').textContent = eur(t.total);
  $('sum-texto').textContent = t.propina < 0
    ? `Te faltan ${eur(-t.propina)} para cubrir lo de Bolt`
    : `Aparta ${eur(t.bolt)} para Bolt · ${eur(t.propina)} son tuyos`;
}

function addImportes(e) {
  e.preventDefault();
  const input = $('i-importe');
  const partes = input.value.split(/[\s+;]+/).filter(Boolean);
  const nuevos = partes.map(toCents);
  if (!nuevos.length || nuevos.some(c => c == null || c <= 0)) {
    toast('Escribe importes válidos, ej: 7,50');
    input.focus();
    return;
  }
  ensureDay(fechaActual).importes.push(...nuevos);
  save();
  input.value = '';
  input.focus();
  renderDia();
}

function delImporte(i) {
  const day = getDay(fechaActual);
  day.importes.splice(i, 1);
  limpiarDia(fechaActual);
  save();
  renderDia();
}

// Elimina días que se han quedado sin nada apuntado
function limpiarDia(iso) {
  const d = data.days[iso];
  if (d && !d.importes.length && d.contado == null) delete data.days[iso];
}

function onCuentaInput(campo, input) {
  const valor = toCents(input.value);
  const day = ensureDay(fechaActual);
  day[campo] = valor;
  if (campo === 'fondo') data.fondoHabitual = valor;
  limpiarDia(fechaActual);
  save();
  renderResultado();
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

  let bolt = 0, propina = 0, total = 0, viajes = 0, contados = 0;
  const filas = dias.map(iso => {
    const t = totalesDia(data.days[iso]);
    bolt += t.bolt; viajes += t.viajes;
    if (t.total != null) { propina += t.propina; total += t.total; contados++; }
    return `<li class="clickable" data-dia="${iso}">
      <div class="main">
        <strong>${fechaLarga(iso)}</strong>
        <small>${t.viajes} ${t.viajes === 1 ? 'viaje' : 'viajes'} · Bolt ${eur(t.bolt)}</small>
      </div>
      <div class="amt">
        ${t.total == null ? 'Sin contar' : eur(t.total)}
        ${t.total == null ? '' : `<small class="${t.propina < 0 ? 'neg' : ''}">propina ${eur(t.propina)}</small>`}
      </div>
    </li>`;
  });

  $('h-bolt').textContent = eur(bolt);
  $('h-propina').textContent = eur(propina);
  $('h-total').textContent = eur(total);
  const n = dias.length;
  let resumen = n
    ? `${viajes} viajes en ${n} ${n === 1 ? 'día' : 'días'} ${nombre}`
    : `Sin datos ${nombre}`;
  if (contados) resumen += ` · media propina/día ${eur(Math.round(propina / contados))}`;
  if (n > contados) resumen += ` · ${n - contados} sin contar el dinero`;
  $('h-resumen').textContent = resumen;
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
  const lineas = ['Fecha;Viajes;Para Bolt;Propina;Efectivo cobrado;Cambio inicial;Efectivo contado'];
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
      migrar();
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

$('form-importe').addEventListener('submit', addImportes);
$('lista-importes').addEventListener('click', e => {
  const btn = e.target.closest('.del');
  if (btn) delImporte(Number(btn.dataset.i));
});

$('c-fondo').addEventListener('input', e => onCuentaInput('fondo', e.target));
$('c-contado').addEventListener('input', e => onCuentaInput('contado', e.target));

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

migrar();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

renderDia();
