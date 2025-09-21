export const config = {
  /**
   * Google Sheet identifier from the sharing URL.
   * Example: https://docs.google.com/spreadsheets/d/{sheetId}/edit
   */
  sheetId: "1GrJ0LOo4b8kkZ5Np1ov9t3Y7HAIeNR-oUxUEmdNELa0",

  /** Optional tab name inside the spreadsheet. Leave blank for the first sheet. */
  sheetName: "Form Responses 1",

  /** Optional sheet GID (string). Set this if the first sheet isn't the response tab. */
  sheetGid: "0",

  /** Column name that holds the timestamp or date of each response. */
  dateColumn: "Timestamp",

  /**
   * Configure which questions should appear as numeric time-series charts.
   * The column names must match the headers from the Google Sheet exactly.
   */
  numericQuestions: [
    {
      column: "How would you rate your motivation level for the day?",
      label: "Motivation Level (1-10)",
      chart: "line",
      color: "#f97316"
    },
    {
      column: "How do you feel you slept?",
      label: "Sleep Quality (1-10)",
      chart: "line",
      color: "#a855f7"
    },
    {
      column: "How long did you sleep according to your Google watch",
      label: "Sleep Duration (hrs)",
      chart: "line",
      color: "#38bdf8"
    },
    {
      column: "How do you feel physically today?",
      label: "Physical Wellbeing (1-10)",
      chart: "line",
      color: "#22d3ee"
    },
    {
      column: "How do I feel mentally today?",
      label: "Mental Wellbeing (1-10)",
      chart: "line",
      color: "#f43f5e"
    }
  ],

  /**
   * Configure categorical questions. These are aggregated into counts.
   */
  categoricalQuestions: [
    {
      column: "Did you exercise today?",
      label: "Exercise Today",
      chart: "doughnut",
      color: "#34d399"
    },
    {
      column: "Which of the following emotions best describes how you are feeling right now?",
      label: "Current Emotion",
      chart: "bar",
      color: "#fde047"
    }
  ],

  /** Columns that contain open-ended reflections to list and search. */
  textQuestions: [
    {
      column: "What are you grateful for today?",
      label: "Gratitude"
    },
    {
      column: "What is one thing you are looking forward to accomplishing today?",
      label: "Today's Focus"
    },
    {
      column: "Any other issues?",
      label: "Other Notes"
    },
    {
      column: "What time did I get up today?",
      label: "Wake-up Time"
    },
    {
      column: "When did I go to sleep last night?",
      label: "Bedtime"
    }
  ]
};
