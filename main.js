/**
 * @file main.js
 * @description Absence Tracker — lógica principal.
 *
 * Flujo:
 *   1. El usuario sube un .txt con nombres de asignaturas (uno por línea).
 *   2. Se parsea el texto y se cuenta cada asignatura.
 *   3. Se calculan estadísticas: faltas, porcentaje y faltas restantes.
 *   4. Se renderiza la UI con los resultados.
 *
 * Para cambiar las horas totales de cada asignatura edita SUBJECT_CONFIG.
 * Las asignaturas no listadas usarán DEFAULT_TOTAL_HOURS.
 */

"use strict";

/* ─────────────────────────────────────────
   CONFIGURACIÓN  ← edita aquí tus horas
───────────────────────────────────────── */

/**
 * Horas totales por asignatura.
 * Cambia los valores según tu horario real.
 * Las claves son los nombres exactos (la comparación es case-insensitive).
 * @type {Object.<string, number>}
 */
const SUBJECT_CONFIG = {
  "Bases de Datos": 192,
  Programación: 256,
  "Entornos de Desarrollo": 96,
  "Sistemas informáticos": 192,
  "Lenguajes de marcas y sistemas de gestión de información": 128,
  "Itinerario Personal para la Empleabilidad I": 96,
};

/** Horas por defecto para asignaturas no listadas en SUBJECT_CONFIG. */
const DEFAULT_TOTAL_HOURS = 80;

/**
 * Set con los nombres válidos en minúsculas, generado desde SUBJECT_CONFIG.
 * Permite filtrar líneas del archivo de forma case-insensitive.
 * @type {Set<string>}
 */
const VALID_SUBJECTS_LOWER = new Set(
  Object.keys(SUBJECT_CONFIG).map((s) => s.toLowerCase()),
);

/**
 * Devuelve el nombre canónico de la asignatura (con tildes y mayúsculas correctas)
 * a partir de una línea del archivo, o null si no es una asignatura válida.
 * @param {string} line - Línea leída del .txt.
 * @returns {string|null}
 */
const resolveSubjectName = (line) => {
  const lower = line.toLowerCase();
  if (!VALID_SUBJECTS_LOWER.has(lower)) return null;
  return (
    Object.keys(SUBJECT_CONFIG).find((k) => k.toLowerCase() === lower) ?? line
  );
};

/** Porcentaje máximo de faltas permitido antes de perder la convocatoria. */
const MAX_ABSENCE_PERCENT = 20;

/* ─────────────────────────────────────────
   ELEMENTOS DEL DOM
───────────────────────────────────────── */
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const uploadSection = document.getElementById("uploadSection");
const resultsSection = document.getElementById("resultsSection");
const subjectList = document.getElementById("subjectList");
const summaryBar = document.getElementById("summaryBar");
const resetBtn = document.getElementById("resetBtn");

/* ─────────────────────────────────────────
   LECTURA DEL ARCHIVO
───────────────────────────────────────── */

/**
 * Lee el contenido de un File como texto plano.
 * @param {File} file - El archivo .txt seleccionado por el usuario.
 * @returns {Promise<string>} Contenido del archivo.
 */
const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsText(file, "windows-1252");
  });
};

/* ─────────────────────────────────────────
   PARSEO Y CONTEO
───────────────────────────────────────── */

/**
 * Convierte el texto del archivo en un array de nombres de asignatura válidos,
 * eliminando líneas vacías, espacios sobrantes y cualquier línea que no coincida
 * con alguna de las asignaturas definidas en SUBJECT_CONFIG.
 * La comparación es case-insensitive; el nombre canónico (con tildes) se preserva.
 * @param {string} rawText - Contenido crudo del .txt.
 * @returns {string[]} Array de nombres de asignatura filtrados y normalizados.
 */
const parseSubjectLines = (rawText) => {
  const resolved = [];

  for (const line of rawText.split("\n")) {
    const name = resolveSubjectName(line.trim());
    if (name !== null) resolved.push(name);
  }

  return resolved;
};

/**
 * Cuenta cuántas veces aparece cada asignatura en el array.
 * @param {string[]} subjects - Array con nombres (pueden repetirse).
 * @returns {Map<string, number>} Mapa { asignatura → nº de faltas }.
 */
const countAbsences = (subjects) => {
  const absenceMap = new Map();

  for (const subject of subjects) {
    const current = absenceMap.get(subject) ?? 0;
    absenceMap.set(subject, current + 1);
  }

  return absenceMap;
};

/* ─────────────────────────────────────────
   CÁLCULO DE ESTADÍSTICAS
───────────────────────────────────────── */

/**
 * Obtiene las horas totales configuradas para una asignatura.
 * Si no está en SUBJECT_CONFIG usa DEFAULT_TOTAL_HOURS.
 * @param {string} subjectName - Nombre de la asignatura.
 * @returns {number} Horas totales.
 */
const getTotalHours = (subjectName) => {
  return SUBJECT_CONFIG[subjectName] ?? DEFAULT_TOTAL_HOURS;
};

/**
 * Calcula las horas máximas que se pueden faltar (según MAX_ABSENCE_PERCENT).
 * @param {number} totalHours - Horas totales de la asignatura.
 * @returns {number} Máximo de horas que se pueden faltar (redondeado hacia abajo).
 */
const calcMaxAllowedAbsences = (totalHours) => {
  return Math.floor((totalHours * MAX_ABSENCE_PERCENT) / 100);
};

/**
 * Calcula el porcentaje de faltas llevadas.
 * @param {number} absences  - Número de faltas actuales.
 * @param {number} totalHours - Horas totales de la asignatura.
 * @returns {number} Porcentaje con 1 decimal.
 */
const calcAbsencePercent = (absences, totalHours) => {
  return parseFloat(((absences / totalHours) * 100).toFixed(1));
};

/**
 * Calcula cuántas faltas más se pueden tener antes de superar el límite.
 * Un resultado negativo significa que ya se ha superado el límite.
 * @param {number} absences    - Faltas actuales.
 * @param {number} maxAllowed  - Máximo de faltas permitidas.
 * @returns {number} Faltas restantes (puede ser negativo).
 */
const calcRemainingAbsences = (absences, maxAllowed) => {
  return maxAllowed - absences;
};

/**
 * Determina el estado de riesgo según el porcentaje de faltas.
 * @param {number} percent  - Porcentaje actual de faltas.
 * @returns {"safe"|"warn"|"danger"} Estado de riesgo.
 */
const getRiskLevel = (percent) => {
  if (percent >= MAX_ABSENCE_PERCENT) return "danger";
  if (percent >= MAX_ABSENCE_PERCENT * 0.7) return "warn";
  return "safe";
};

/**
 * Construye el objeto de estadísticas completo para una asignatura.
 * @param {string} name      - Nombre de la asignatura.
 * @param {number} absences  - Número de faltas contadas.
 * @returns {{
 *   name: string,
 *   absences: number,
 *   totalHours: number,
 *   maxAllowed: number,
 *   percent: number,
 *   remaining: number,
 *   risk: string
 * }}
 */
const buildSubjectStats = (name, absences) => {
  const totalHours = getTotalHours(name);
  const maxAllowed = calcMaxAllowedAbsences(totalHours);
  const percent = calcAbsencePercent(absences, totalHours);
  const remaining = calcRemainingAbsences(absences, maxAllowed);
  const risk = getRiskLevel(percent);

  return { name, absences, totalHours, maxAllowed, percent, remaining, risk };
};

/**
 * Transforma el mapa de conteo en un array de objetos de estadísticas,
 * ordenado de mayor a menor porcentaje de faltas.
 * @param {Map<string, number>} absenceMap - Mapa { asignatura → nº de faltas }.
 * @returns {Array<object>} Array de stats ordenado por riesgo.
 */
const buildAllStats = (absenceMap) => {
  const stats = [];

  for (const [name, absences] of absenceMap) {
    stats.push(buildSubjectStats(name, absences));
  }

  return stats.sort((a, b) => b.percent - a.percent);
};

/* ─────────────────────────────────────────
   RENDER
───────────────────────────────────────── */

/**
 * Etiqueta visible y clase CSS según el nivel de riesgo.
 * @param {string} risk - "safe" | "warn" | "danger"
 * @param {number} remaining - Faltas restantes.
 * @returns {{ label: string, cls: string }}
 */
const getBadgeInfo = (risk, remaining) => {
  if (risk === "danger")
    return { label: "⚠ Límite superado", cls: "badge--danger" };
  if (risk === "warn") return { label: "Casi al límite", cls: "badge--warn" };
  return { label: `${remaining} restantes`, cls: "badge--safe" };
};

/**
 * Crea el HTML de una tarjeta de asignatura.
 * @param {object} stats - Objeto de estadísticas de la asignatura.
 * @returns {string} HTML como string.
 */
const createSubjectCardHTML = (stats) => {
  const { name, absences, totalHours, maxAllowed, percent, remaining, risk } =
    stats;
  const badge = getBadgeInfo(risk, remaining);
  const barWidth = Math.min((percent / MAX_ABSENCE_PERCENT) * 100, 100).toFixed(
    1,
  );
  const remainText =
    remaining <= 0
      ? `<span class="stat__value stat__value--danger">0 (superado por ${Math.abs(remaining)})</span>`
      : `<span class="stat__value stat__value--${risk}">${remaining} h</span>`;

  return `
    <li class="subject-card">
      <div class="subject-card__top">
        <span class="subject-card__name">${name}</span>
        <span class="subject-card__badge ${badge.cls}">${badge.label}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar__fill fill--${risk}" style="width: ${barWidth}%"></div>
      </div>
      <div class="subject-card__stats">
        <div class="stat">
          <span class="stat__label">Faltas</span>
          <span class="stat__value">${absences} h</span>
        </div>
        <div class="stat">
          <span class="stat__label">Total horas</span>
          <span class="stat__value">${totalHours} h</span>
        </div>
        <div class="stat">
          <span class="stat__label">% de faltas</span>
          <span class="stat__value stat__value--${risk}">${percent}%</span>
        </div>
        <div class="stat">
          <span class="stat__label">Puedo faltar aún</span>
          ${remainText}
        </div>
        <div class="stat">
          <span class="stat__label">Límite (${MAX_ABSENCE_PERCENT}%)</span>
          <span class="stat__value">${maxAllowed} h</span>
        </div>
      </div>
    </li>
  `;
};

/**
 * Renderiza las tarjetas de resumen (total faltas, asignaturas en riesgo).
 * @param {Array<object>} allStats - Array de stats de todas las asignaturas.
 */
const renderSummaryBar = (allStats) => {
  const totalAbsences = allStats.reduce((sum, s) => sum + s.absences, 0);
  const atRisk = allStats.filter((s) => s.risk !== "safe").length;
  const overLimit = allStats.filter((s) => s.risk === "danger").length;

  summaryBar.innerHTML = `
    <div class="summary-card">
      <div class="summary-card__label">Total faltas</div>
      <div class="summary-card__value">${totalAbsences}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card__label">Asignaturas</div>
      <div class="summary-card__value">${allStats.length}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card__label">En riesgo</div>
      <div class="summary-card__value" style="color: var(--warn)">${atRisk}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card__label">Límite superado</div>
      <div class="summary-card__value" style="color: var(--danger)">${overLimit}</div>
    </div>
  `;
};

/**
 * Renderiza toda la sección de resultados con los datos del archivo.
 * @param {Array<object>} allStats - Array de stats de todas las asignaturas.
 */
const renderResults = (allStats) => {
  renderSummaryBar(allStats);
  subjectList.innerHTML = allStats.map(createSubjectCardHTML).join("");
};

/* ─────────────────────────────────────────
   CONTROL DE VISTAS
───────────────────────────────────────── */

/** Muestra la sección de resultados y oculta el uploader. */
const showResults = () => {
  uploadSection.classList.add("hidden");
  resultsSection.classList.remove("hidden");
};

/** Muestra el uploader y oculta los resultados. */
const showUploader = () => {
  resultsSection.classList.add("hidden");
  uploadSection.classList.remove("hidden");
  fileInput.value = "";
};

/* ─────────────────────────────────────────
   PIPELINE PRINCIPAL
───────────────────────────────────────── */

/**
 * Orquesta el flujo completo: leer → parsear → contar → calcular → renderizar.
 * @param {File} file - Archivo .txt subido por el usuario.
 */
const processFile = async (file) => {
  if (!file || !file.name.endsWith(".txt")) {
    alert("Por favor sube un archivo .txt válido.");
    return;
  }

  try {
    const rawText = await readFileAsText(file);
    const lines = parseSubjectLines(rawText);

    if (lines.length === 0) {
      alert("El archivo está vacío o no tiene asignaturas reconocibles.");
      return;
    }

    const absenceMap = countAbsences(lines);
    const allStats = buildAllStats(absenceMap);

    renderResults(allStats);
    showResults();
  } catch (error) {
    alert(`Error al procesar el archivo: ${error.message}`);
  }
};

/* ─────────────────────────────────────────
   EVENT LISTENERS
───────────────────────────────────────── */

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) processFile(file);
});

resetBtn.addEventListener("click", showUploader);

// Drag & drop
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragging");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragging");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragging");
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
});
