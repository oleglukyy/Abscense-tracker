"use strict";
 
const SUBJECT_CONFIG = {
  "Acceso a Datos": 105,
  "Desarrollo de Interfaces": 147,
  "Programación Multimedia y Dispositivos Móviles": 84,
  "Programación de Servicios y Procesos": 63,
  "Sistemas de Gestión Empresarial": 84,
  "Empresa e Iniciativa Emprendedora": 84,
  "Proyecto de Desarrollo de Aplicaciones Multiplataforma": 40,
};
 
const DEFAULT_TOTAL_HOURS = 80;
const MAX_ABSENCE_PERCENT = 20;
 
const VALID_SUBJECTS_LOWER = new Set(
  Object.keys(SUBJECT_CONFIG).map((s) => s.toLowerCase()),
);
 
const resolveSubjectName = (line) => {
  const lower = line.toLowerCase();
  if (!VALID_SUBJECTS_LOWER.has(lower)) return null;
  return (
    Object.keys(SUBJECT_CONFIG).find((k) => k.toLowerCase() === lower) ?? line
  );
};
 
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const uploadSection = document.getElementById("uploadSection");
const resultsSection = document.getElementById("resultsSection");
const subjectList = document.getElementById("subjectList");
const summaryBar = document.getElementById("summaryBar");
const resetBtn = document.getElementById("resetBtn");
 
const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsText(file, "windows-1252");
  });
};
 
const parseSubjectLines = (rawText) => {
  const resolved = [];
 
  for (const line of rawText.split("\n")) {
    const name = resolveSubjectName(line.trim());
    if (name !== null) resolved.push(name);
  }
 
  return resolved;
};
 
const countAbsences = (subjects) => {
  const absenceMap = new Map();
 
  for (const subject of subjects) {
    const current = absenceMap.get(subject) ?? 0;
    absenceMap.set(subject, current + 1);
  }
 
  return absenceMap;
};
 
const getTotalHours = (subjectName) => {
  return SUBJECT_CONFIG[subjectName] ?? DEFAULT_TOTAL_HOURS;
};
 
const calcMaxAllowedAbsences = (totalHours) => {
  return Math.floor((totalHours * MAX_ABSENCE_PERCENT) / 100);
};
 
const calcAbsencePercent = (absences, totalHours) => {
  return parseFloat(((absences / totalHours) * 100).toFixed(1));
};
 
const calcRemainingAbsences = (absences, maxAllowed) => {
  return maxAllowed - absences;
};
 
const getRiskLevel = (percent) => {
  if (percent >= MAX_ABSENCE_PERCENT) return "danger";
  if (percent >= MAX_ABSENCE_PERCENT * 0.7) return "warn";
  return "safe";
};
 
const buildSubjectStats = (name, absences) => {
  const totalHours = getTotalHours(name);
  const maxAllowed = calcMaxAllowedAbsences(totalHours);
  const percent = calcAbsencePercent(absences, totalHours);
  const remaining = calcRemainingAbsences(absences, maxAllowed);
  const risk = getRiskLevel(percent);
 
  return { name, absences, totalHours, maxAllowed, percent, remaining, risk };
};
 
const buildAllStats = (absenceMap) => {
  const stats = [];
 
  for (const [name, absences] of absenceMap) {
    stats.push(buildSubjectStats(name, absences));
  }
 
  return stats.sort((a, b) => b.percent - a.percent);
};
 
const getStatusText = (risk, remaining) => {
  if (risk === "danger") return `Límite superado por ${Math.abs(remaining)} h`;
  if (risk === "warn") return "Casi al límite";
  return `${remaining} h restantes`;
};
 
const createSubjectCardHTML = (stats) => {
  const { name, absences, totalHours, maxAllowed, percent, remaining, risk } =
    stats;
  const barWidth = Math.min((percent / MAX_ABSENCE_PERCENT) * 100, 100).toFixed(1);
 
  return `
    <li class="subject-card subject-card--${risk}">
      <div class="subject-card__top">
        <span class="subject-card__name">${name}</span>
        <span class="subject-card__status status--${risk}">${getStatusText(risk, remaining)}</span>
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
          <span class="stat__label">Límite (${MAX_ABSENCE_PERCENT}%)</span>
          <span class="stat__value">${maxAllowed} h</span>
        </div>
      </div>
    </li>
  `;
};
 
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
 
const renderResults = (allStats) => {
  renderSummaryBar(allStats);
  subjectList.innerHTML = allStats.map(createSubjectCardHTML).join("");
};
 
const showResults = () => {
  uploadSection.classList.add("hidden");
  resultsSection.classList.remove("hidden");
};
 
const showUploader = () => {
  resultsSection.classList.add("hidden");
  uploadSection.classList.remove("hidden");
  fileInput.value = "";
};
 
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
 
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) processFile(file);
});
 
resetBtn.addEventListener("click", showUploader);
 
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
