export function parseDate(value) {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.valueOf())) {
    return direct;
  }

  const normalized = value.replace(/\u202f|\u00a0/g, " ").trim();
  const isoMatch = normalized.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (isoMatch) {
    const [, y, m, d, hh = "0", mm = "0"] = isoMatch;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm));
  }

  const mdYMatch = normalized.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (mdYMatch) {
    const [, mm, dd, year, hh = "0", min = "0", sec = "0"] = mdYMatch;
    const y = Number(year.length === 2 ? `20${year}` : year);
    return new Date(y, Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(sec));
  }

  return null;
}

export function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.valueOf())) {
    return "-";
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export function filterByDateRange(rows, dateColumn, rangeValue) {
  if (!rows.length || !dateColumn) return rows;
  if (rangeValue === "all") return rows;
  const days = Number(rangeValue);
  if (!Number.isFinite(days)) return rows;
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);
  return rows.filter((row) => {
    const date = row.__parsedDate__;
    return date && date >= threshold;
  });
}

export function toNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  const normalized = String(value).replace(/[^0-9+\-.,]/g, "").replace(/,/g, ".");
  const numeric = Number.parseFloat(normalized);
  return Number.isNaN(numeric) ? null : numeric;
}

export function calculateStats(rows, column) {
  const values = rows
    .map((row) => toNumber(row[column]))
    .filter((value) => typeof value === "number");
  if (!values.length) {
    return null;
  }
  const sum = values.reduce((acc, value) => acc + value, 0);
  const average = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const latestRow = [...rows].sort((a, b) => {
    const da = a.__parsedDate__?.valueOf() ?? 0;
    const db = b.__parsedDate__?.valueOf() ?? 0;
    return db - da;
  })[0];
  return {
    average,
    min,
    max,
    latest: latestRow ? toNumber(latestRow[column]) : null
  };
}

export function groupByCategory(rows, column) {
  const counts = new Map();
  for (const row of rows) {
    const rawValue = row[column];
    if (!rawValue) continue;
    const parts = String(rawValue)
      .split(/[,;\n]/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.length) continue;
    for (const value of parts) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries()).map(([label, value]) => ({ label, value }));
}

export function calculateStreak(rows, dateColumn) {
  if (!rows.length || !dateColumn) return 0;
  const sorted = [...rows]
    .map((row) => row.__parsedDate__)
    .filter(Boolean)
    .sort((a, b) => b - a);
  if (!sorted.length) return 0;
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (const date of sorted) {
    const candidate = new Date(date);
    candidate.setHours(0, 0, 0, 0);
    if (candidate.getTime() === cursor.getTime()) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (candidate.getTime() === cursor.getTime() - 24 * 60 * 60 * 1000) {
      streak += 1;
      cursor = candidate;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    break;
  }
  return streak;
}

export function debounce(fn, delay = 250) {
  let handle;
  return (...args) => {
    clearTimeout(handle);
    handle = setTimeout(() => fn(...args), delay);
  };
}

export function downloadBlob(content, filename, type = "text/plain") {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
