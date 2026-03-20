# Absence Tracker

A web application to track attendance absences by subject. It reads a `.txt` file containing subject names, counts the occurrences, and calculates the percentage of absences consumed relative to the total hours of each module.

---

## Project structure

```
absence-tracker/
├── index.html          # User interface
├── style.css           # Styles
├── main.js             # Application logic
└── ejemplo_faltas.txt  # Sample file for testing
```

---

## How to use

1. Open `index.html` in a browser.
2. Upload a `.txt` file with one subject per line (see format below).
3. The app displays the statistics for each subject automatically.

> The `.txt` file must be saved in **UTF-8** or **Windows-1252** encoding (see encoding section).

---

## TXT file format

One subject name per line. Repeated lines count as additional absences.

```
Programación
Bases de Datos
Programación
Sistemas informáticos
```

Lines that do not match any configured subject are silently ignored.

---

## Configured subjects

| Subject | Total hours |
|---|---|
| Bases de Datos | 96 h |
| Programación | 224 h |
| Entornos de Desarrollo | 96 h |
| Sistemas informáticos | 160 h |
| Lenguajes de marcas y sistemas de gestión de información | 128 h |
| Itinerario Personal para la Empleabilidad I | 96 h |

To update the hours, edit the `SUBJECT_CONFIG` object in `main.js`.

---

## What it calculates

For each subject the app displays:

- **Absences** — number of times the subject appears in the file.
- **Absence percentage** — `(absences / total hours) * 100`.
- **Allowed limit** — 15% of total hours (configurable via `MAX_ABSENCE_PERCENT`).
- **Remaining absences** — how many more hours can be missed before hitting the limit.

Risk level is shown with colors:

- 🟢 **Green** — below 70% of the limit.
- 🟡 **Yellow** — between 70% and 100% of the limit.
- 🔴 **Red** — limit exceeded.

---

## Encoding issue (broken accents)

If the `.txt` was created on Windows and accented characters appear as `â€™` or `ï¿½`, change this line in `main.js`:

```js
// Before
reader.readAsText(file, "UTF-8");

// After
reader.readAsText(file, "windows-1252");
```

The permanent fix is to save the `.txt` as UTF-8 from Notepad (Save as → Encoding: UTF-8).

---

## Technologies

- HTML5
- CSS3
- JavaScript (ES6+) — no frameworks or external dependencies.
