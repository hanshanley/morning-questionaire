import { formatDate, toNumber } from "./utils.js";

const chartRegistry = new Map();

function getChartKey(kind, column) {
  return `${kind}:${column}`;
}

function ensureChart(kind, canvas, configFactory) {
  const key = getChartKey(kind, canvas.dataset.column);
  const existing = chartRegistry.get(key);
  if (existing) {
    existing.config.data = configFactory().data;
    existing.config.options = {
      ...existing.config.options,
      ...configFactory().options
    };
    existing.update();
    return existing;
  }
  const chart = new Chart(canvas.getContext("2d"), configFactory());
  chartRegistry.set(key, chart);
  return chart;
}

export function renderNumericChart(canvas, question, rows) {
  canvas.dataset.column = question.column;
  const sorted = rows
    .filter((row) => row.__parsedDate__ && toNumber(row[question.column]) !== null)
    .sort((a, b) => a.__parsedDate__ - b.__parsedDate__);
  const labels = sorted.map((row) => formatDate(row.__parsedDate__));
  const data = sorted.map((row) => toNumber(row[question.column]));

  return ensureChart("numeric", canvas, () => ({
    type: question.chart === "bar" ? "bar" : "line",
    data: {
      labels,
      datasets: [
        {
          label: question.label,
          data,
          tension: question.chart === "line" ? 0.35 : 0,
          fill: false,
          borderColor: question.color ?? "#38bdf8",
          backgroundColor: (question.color ?? "#38bdf8") + "33",
          pointRadius: 3,
          pointHoverRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: "#cbd5f5" },
          grid: { color: "rgba(148, 163, 184, 0.15)" }
        },
        y: {
          ticks: { color: "#cbd5f5" },
          grid: { color: "rgba(148, 163, 184, 0.12)" },
          beginAtZero: false
        }
      },
      plugins: {
        legend: {
          labels: { color: "#cbd5f5" }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const value = ctx.parsed.y;
              return `${question.label}: ${Number.parseFloat(value).toFixed(2)}`;
            }
          }
        }
      }
    }
  }));
}

export function renderCategoricalChart(canvas, question, dataset) {
  canvas.dataset.column = question.column;
  const labels = dataset.map((entry) => entry.label);
  const values = dataset.map((entry) => entry.value);
  const palette = buildPalette(labels.length, question.color);

  return ensureChart("categorical", canvas, () => ({
    type: question.chart === "doughnut" ? "doughnut" : "bar",
    data: {
      labels,
      datasets: [
        {
          label: question.label,
          data: values,
          backgroundColor: palette,
          borderColor: palette.map((color) => color.replace(/\d?\.?\d+\)$/u, "1)")),
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#cbd5f5" }
        }
      },
      scales: question.chart === "doughnut"
        ? {}
        : {
            x: {
              ticks: { color: "#cbd5f5" },
              grid: { color: "rgba(148, 163, 184, 0.15)" }
            },
            y: {
              beginAtZero: true,
              ticks: { color: "#cbd5f5" },
              grid: { color: "rgba(148, 163, 184, 0.12)" }
            }
          }
    }
  }));
}

export function destroyCharts() {
  chartRegistry.forEach((chart) => chart.destroy());
  chartRegistry.clear();
}

function buildPalette(count, base) {
  if (!count) return [];
  if (count === 1 && base) {
    return [withAlpha(base, 0.6)];
  }
  const colors = [];
  const startHue = Math.random() * 360;
  for (let index = 0; index < count; index += 1) {
    const hue = (startHue + index * (360 / count)) % 360;
    if (base) {
      colors.push(withAlpha(base, 0.6));
    } else {
      colors.push(`hsla(${hue}, 65%, 55%, 0.7)`);
    }
  }
  return colors;
}

function withAlpha(hexColor, alpha) {
  if (!hexColor) {
    return `rgba(56, 189, 248, ${alpha})`;
  }
  const hex = hexColor.replace("#", "");
  const bigint = Number.parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
