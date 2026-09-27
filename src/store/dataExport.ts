import type { AppState } from "../types";
import { defaultSettings } from "./seedData";

export function exportData(state: AppState): string {
  return JSON.stringify(
    {
      ...state,
      isAuthenticated: false,
    },
    null,
    2,
  );
}

export function importData(raw: string): AppState {
  const parsed = JSON.parse(raw) as AppState;

  return {
    batches: Array.isArray(parsed.batches) ? parsed.batches : [],
    students: Array.isArray(parsed.students) ? parsed.students : [],
    feeRecords: Array.isArray(parsed.feeRecords) ? parsed.feeRecords : [],
    payments: Array.isArray(parsed.payments) ? parsed.payments : [],
    adjustments: Array.isArray(parsed.adjustments) ? parsed.adjustments : [],
    settings: { ...defaultSettings, ...parsed.settings },
    isAuthenticated: true,
  };
}