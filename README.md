# Morning Questionnaire Visualizer

A lightweight, configuration-driven dashboard that turns your Morning Questionnaire Google Form submissions into interactive charts and summaries.

## Features

- Fetches responses directly from the linked Google Sheet (or accepts manual CSV uploads)
- Highlights streaks, averages, and recent values for your key numeric questions
- Generates time-series charts for numbers (sleep, energy, anxiety, etc.)
- Aggregates categorical answers into bar or doughnut charts
- Lists open-ended reflections with quick keyword search
- Works entirely client-side – just open `index.html`

## 1. Prepare your Google Sheet

1. Open the response spreadsheet created by Google Forms.
2. Ensure anyone with the link can view: `Share → General access → Anyone with the link`.
3. (Optional) Publish a dedicated tab if you use different sheet names.
4. Copy the sheet ID from the URL: `https://docs.google.com/spreadsheets/d/<sheet-id>/edit`.

### CSV fallback

If you prefer not to expose the sheet publicly, export a CSV (`File → Download → Comma separated values`) and use the upload control in the app.

## 2. Configure question mappings

Edit [`config.js`](./config.js) to match the exact column headers in your sheet. Example structure:

```js
export const config = {
  sheetId: "YOUR_SHEET_ID",
  sheetName: "Form Responses 1", // optional tab name
  dateColumn: "Timestamp",       // must match your sheet header
  numericQuestions: [
    { column: "Hours of sleep", label: "Sleep Duration (hrs)", chart: "line", color: "#38bdf8" }
  ],
  categoricalQuestions: [
    { column: "Workout planned?", label: "Workout Planned", chart: "doughnut", color: "#34d399" }
  ],
  textQuestions: [
    { column: "What are you grateful for today?", label: "Gratitude" }
  ]
};
```

- `numericQuestions`: renders line (default) or bar charts over time.
- `categoricalQuestions`: renders bar (default) or doughnut charts with counts.
- `textQuestions`: surfaces free-form responses with date stamps.

> Tip: Copy column titles straight from Google Sheets to avoid typos.

## 3. View the dashboard

Open `index.html` in a modern browser (Chrome, Edge, Firefox, Safari). No build step required.

- Enter your sheet ID (and tab name if needed) then click **Reload from Google Sheet**.
- Adjust the **Date Range** selector to focus on recent entries.
- Use **Upload CSV export** if you saved a local copy instead.
- Search within reflections using the keyword field.

## Development notes

- The project intentionally avoids a bundler; scripts use CDN builds of [PapaParse](https://www.papaparse.com/) and [Chart.js](https://www.chartjs.org/).
- All logic lives in vanilla JavaScript modules within [`src/`](./src).
- No backend is required; everything runs client-side.

Feel free to tweak the layout or extend the configuration to match new questions you add to the form.
