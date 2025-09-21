import { config } from "../config.js";
import {
  parseDate,
  filterByDateRange,
  calculateStats,
  groupByCategory,
  calculateStreak,
  formatDate,
  debounce,
  toNumber
} from "./utils.js";
import { renderNumericChart, renderCategoricalChart, destroyCharts } from "./charts.js";

const dom = {
  sheetIdInput: document.getElementById("sheetIdInput"),
  sheetNameInput: document.getElementById("sheetNameInput"),
  dateRangeSelect: document.getElementById("dateRangeSelect"),
  reloadBtn: document.getElementById("reloadBtn"),
  csvUpload: document.getElementById("csvUpload"),
  statusMessage: document.getElementById("statusMessage"),
  summary: document.getElementById("summary"),
  numericCharts: document.getElementById("numericCharts"),
  categoricalCharts: document.getElementById("categoricalCharts"),
  textFilter: document.getElementById("textFilter"),
  textGroups: document.getElementById("textGroups")
};

const state = {
  sheetId: config.sheetId?.trim() ?? "",
  sheetName: config.sheetName?.trim() ?? "",
  rawRows: [],
  filteredRows: []
};

function init() {
  dom.sheetIdInput.value = state.sheetId;
  dom.sheetNameInput.value = state.sheetName;

  dom.reloadBtn.addEventListener("click", () => {
    state.sheetId = dom.sheetIdInput.value.trim();
    state.sheetName = dom.sheetNameInput.value.trim();
    if (!state.sheetId) {
      setStatus("Enter the Google Sheet ID to fetch responses.", "warn");
      return;
    }
    loadFromGoogle();
  });

  dom.csvUpload.addEventListener("change", handleCsvUpload, { passive: true });
  dom.dateRangeSelect.addEventListener("change", () => applyFilters());

  dom.textFilter.addEventListener(
    "input",
    debounce(() => renderTextResponses(), 150)
  );

  if (state.sheetId) {
    loadFromGoogle();
  } else {
    setStatus("Paste your Google Sheet ID above or upload a CSV export to begin.");
  }
}

document.addEventListener("DOMContentLoaded", init);

async function loadFromGoogle() {
  setStatus("Fetching responses from Google Sheets…");
  destroyCharts();
  try {
    const url = buildSheetCsvUrl(state.sheetId, state.sheetName);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Google responded with ${response.status}`);
    }
    const csvText = await response.text();
    const rows = parseCsv(csvText);
    if (!rows.length) {
      setStatus("The sheet was loaded but contains no responses yet.");
      state.rawRows = [];
      renderEverything();
      return;
    }
    state.rawRows = enrichRows(rows);
    applyFilters();
    setStatus(`Loaded ${state.rawRows.length} responses from Google Sheets.`, "success");
  } catch (error) {
    console.error(error);
    state.rawRows = [];
    renderEverything();
    setStatus(
      "Unable to load the Google Sheet. Double-check the ID, sharing permissions, or try exporting a CSV manually.",
      "error"
    );
  }
}

function handleCsvUpload(event) {
  const [file] = event.target.files ?? [];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rows = parseCsv(reader.result);
      state.rawRows = enrichRows(rows);
      applyFilters();
      setStatus(`Loaded ${state.rawRows.length} responses from CSV upload.`, "success");
    } catch (error) {
      console.error(error);
      setStatus("Could not parse the CSV file. Please export using Google Sheets' CSV option.", "error");
    }
  };
  reader.readAsText(file);
}

function buildSheetCsvUrl(sheetId, sheetName) {
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  if (config.sheetGid) {
    return `${base}&gid=${encodeURIComponent(config.sheetGid)}`;
  }
  if (sheetName) {
    return `${base}&sheet=${encodeURIComponent(sheetName)}`;
  }
  return base;
}

function parseCsv(csvText) {
  const parsed = window.Papa.parse(csvText, {
    header: true,
    skipEmptyLines: "greedy"
  });
  if (parsed.errors?.length) {
    throw new Error(parsed.errors[0].message);
  }
  return parsed.data.filter((row) => Object.values(row).some((value) => value !== null && value !== ""));
}

function enrichRows(rows) {
  return rows
    .map((row, index) => {
      const clone = { ...row };
      const dateValue = parseDate(row[config.dateColumn]);
      clone.__parsedDate__ = dateValue;
      clone.__rowIndex__ = index;
      return clone;
    })
    .filter((row) => row.__parsedDate__ instanceof Date && !Number.isNaN(row.__parsedDate__.valueOf()))
    .sort((a, b) => a.__parsedDate__ - b.__parsedDate__);
}

function applyFilters() {
  const rangeValue = dom.dateRangeSelect.value;
  state.filteredRows = filterByDateRange(state.rawRows, config.dateColumn, rangeValue);
  renderEverything();
}

function renderEverything() {
  renderSummary();
  renderNumericCharts();
  renderCategoricalCharts();
  renderTextResponses();
}

function renderSummary() {
  dom.summary.innerHTML = "";

  const totalCard = createSummaryCard("Responses", `${state.filteredRows.length}`);
  const firstDate = state.filteredRows[0]?.__parsedDate__;
  const lastDate = state.filteredRows[state.filteredRows.length - 1]?.__parsedDate__;
  totalCard.appendChild(createSummaryDetail(`Range: ${formatDate(firstDate)} → ${formatDate(lastDate)}`));
  dom.summary.appendChild(totalCard);

  if (state.filteredRows.length) {
    const streak = calculateStreak(state.filteredRows, config.dateColumn);
    dom.summary.appendChild(createSummaryCard("Current streak", `${streak} days`));
  }

  for (const question of config.numericQuestions ?? []) {
    const stats = calculateStats(state.filteredRows, question.column);
    if (!stats) continue;
    const card = createSummaryCard(question.label, formatNumber(stats.average));
    card.appendChild(createSummaryDetail(`Min ${formatNumber(stats.min)} · Max ${formatNumber(stats.max)}`));
    if (stats.latest !== null && stats.latest !== undefined) {
      card.appendChild(createSummaryDetail(`Latest: ${formatNumber(stats.latest)}`));
    }
    dom.summary.appendChild(card);
  }
}

function renderNumericCharts() {
  dom.numericCharts.innerHTML = "";
  for (const question of config.numericQuestions ?? []) {
    const card = createChartCard(question);
    const canvas = card.querySelector("canvas");
    const rowsWithValue = state.filteredRows.filter((row) => toNumber(row[question.column]) !== null);
    if (!rowsWithValue.length) {
      card.classList.add("empty");
      card.querySelector(".empty-message").textContent = "No data points available in the selected range.";
    } else {
      card.classList.remove("empty");
      renderNumericChart(canvas, question, rowsWithValue);
    }
    dom.numericCharts.appendChild(card);
  }
}

function renderCategoricalCharts() {
  dom.categoricalCharts.innerHTML = "";
  for (const question of config.categoricalQuestions ?? []) {
    const card = createChartCard(question);
    const canvas = card.querySelector("canvas");
    const dataset = groupByCategory(state.filteredRows, question.column);
    if (!dataset.length) {
      card.classList.add("empty");
      card.querySelector(".empty-message").textContent = "No responses recorded for this question.";
    } else {
      card.classList.remove("empty");
      renderCategoricalChart(canvas, question, dataset);
    }
    dom.categoricalCharts.appendChild(card);
  }
}

function renderTextResponses() {
  dom.textGroups.innerHTML = "";
  const searchTerm = dom.textFilter.value.trim().toLowerCase();

  for (const question of config.textQuestions ?? []) {
    const entries = state.filteredRows
      .map((row) => ({
        text: row[question.column],
        date: row.__parsedDate__
      }))
      .filter((entry) => entry.text && (!searchTerm || entry.text.toLowerCase().includes(searchTerm)));

    if (!entries.length) continue;

    const section = document.createElement("section");
    section.className = "text-question";

    const heading = document.createElement("h3");
    heading.textContent = question.label;

    const list = document.createElement("ul");
    for (const entry of entries.sort((a, b) => b.date - a.date)) {
      const item = document.createElement("li");
      item.innerHTML = `<strong>${formatDate(entry.date)}</strong>\n${escapeHtml(entry.text)}`;
      list.appendChild(item);
    }

    section.appendChild(heading);
    section.appendChild(list);
    dom.textGroups.appendChild(section);
  }

  if (!dom.textGroups.childElementCount) {
    const empty = document.createElement("p");
    empty.className = "status";
    empty.textContent = searchTerm
      ? "No reflections match your search."
      : "No open-ended responses found for the selected time range.";
    dom.textGroups.appendChild(empty);
  }
}

function createSummaryCard(title, value) {
  const card = document.createElement("article");
  card.className = "card";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const valueEl = document.createElement("p");
  valueEl.className = "value";
  valueEl.textContent = value;
  card.appendChild(heading);
  card.appendChild(valueEl);
  return card;
}

function createSummaryDetail(text) {
  const detail = document.createElement("p");
  detail.className = "status";
  detail.textContent = text;
  return detail;
}

function createChartCard(question) {
  const card = document.createElement("article");
  card.className = "card";
  const title = document.createElement("h3");
  title.textContent = question.label;
  const canvas = document.createElement("canvas");
  const emptyMessage = document.createElement("p");
  emptyMessage.className = "status empty-message";
  emptyMessage.textContent = "";
  card.appendChild(title);
  card.appendChild(canvas);
  card.appendChild(emptyMessage);
  return card;
}

function setStatus(message, level = "info") {
  dom.statusMessage.textContent = message;
  dom.statusMessage.dataset.level = level;
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  if (Math.abs(value) >= 100 || Number.isInteger(value)) {
    return String(Math.round(value));
  }
  return value.toFixed(1);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
