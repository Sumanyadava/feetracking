import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from "react";
import type {
  AppState,
  Batch,
  Student,
  FeeRecord,
  Payment,
  Adjustment,
  Settings,
} from "../types";
import { defaultSettings, updateBatchStudentCounts } from "./seedData";
import { recalculateFeeStatus, generateFeeRecords } from "../utils/feeEngine";
import { generateId } from "../utils/formatters";

const STORAGE_KEY = "feetrack_v1";

function emptyAppState(): AppState {
  return {
    batches: [],
    students: [],
    feeRecords: [],
    payments: [],
    adjustments: [],
    settings: defaultSettings,
    isAuthenticated: false,
  };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && Array.isArray(parsed.batches)) {
        return {
          ...parsed,
          settings: { ...defaultSettings, ...parsed.settings },
          isAuthenticated: false,
        };
      }
    }
  } catch {
    /* ignore */
  }

  return emptyAppState();
}

function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

type Action =
  | { type: "LOGIN" }
  | { type: "LOGOUT" }
  // Batches
  | { type: "ADD_BATCH"; payload: Batch }
  | { type: "UPDATE_BATCH"; payload: Batch }
  | { type: "DELETE_BATCH"; payload: string }
  // Students
  | {
      type: "ADD_STUDENT";
      payload: { student: Student; feeRecords: FeeRecord[] };
    }
  | { type: "UPDATE_STUDENT"; payload: Student }
  | { type: "DELETE_STUDENT"; payload: string }
  // Fee Records
  | { type: "UPDATE_FEE_RECORD"; payload: FeeRecord }
  | { type: "ADD_FEE_RECORDS"; payload: FeeRecord[] }
  | {
      type: "UPDATE_FEE_RECORD_EXPECTED";
      payload: { id: string; expectedAmount: number };
    }
  | { type: "WAIVE_FEE"; payload: { feeRecordId: string; reason: string } }
  // Payments
  | {
      type: "ADD_PAYMENT";
      payload: { payment: Payment; updatedFeeRecords: FeeRecord[] };
    }
  | {
      type: "DELETE_PAYMENT";
      payload: { paymentId: string; updatedFeeRecords: FeeRecord[] };
    }
  // Adjustments
  | { type: "ADD_ADJUSTMENT"; payload: Adjustment }
  // Settings
  | { type: "UPDATE_SETTINGS"; payload: Settings }
  // Import
  | { type: "IMPORT_DATA"; payload: AppState }
  // Reset
  | { type: "RESET_TO_DEMO" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "LOGIN":
      return { ...state, isAuthenticated: true };
    case "LOGOUT":
      return { ...state, isAuthenticated: false };

    case "ADD_BATCH": {
      const batches = [...state.batches, action.payload];
      return { ...state, batches };
    }
    case "UPDATE_BATCH": {
      const batches = state.batches.map((b) =>
        b.id === action.payload.id ? action.payload : b,
      );
      return { ...state, batches };
    }
    case "DELETE_BATCH": {
      const batches = state.batches.filter((b) => b.id !== action.payload);
      return { ...state, batches };
    }

    case "ADD_STUDENT": {
      const students = [...state.students, action.payload.student];
      const feeRecords = [...state.feeRecords, ...action.payload.feeRecords];
      // Update batch student count
      const batches = state.batches.map((b) =>
        b.id === action.payload.student.batchId
          ? { ...b, totalStudents: b.totalStudents + 1 }
          : b,
      );
      return { ...state, students, feeRecords, batches };
    }
    case "UPDATE_STUDENT": {
      const students = state.students.map((s) =>
        s.id === action.payload.id ? action.payload : s,
      );
      return { ...state, students };
    }
    case "DELETE_STUDENT": {
      const students = state.students.filter((s) => s.id !== action.payload);
      const feeRecords = state.feeRecords.filter(
        (r) => r.studentId !== action.payload,
      );
      const payments = state.payments.filter(
        (p) => p.studentId !== action.payload,
      );
      const adjustments = state.adjustments.filter(
        (a) => a.studentId !== action.payload,
      );
      // Recalculate batch counts
      const batches = updateBatchStudentCounts(state.batches, students);
      return { ...state, students, feeRecords, payments, adjustments, batches };
    }

    case "UPDATE_FEE_RECORD": {
      const feeRecords = state.feeRecords.map((r) =>
        r.id === action.payload.id ? action.payload : r,
      );
      return { ...state, feeRecords };
    }
    case "ADD_FEE_RECORDS": {
      const feeRecords = [...state.feeRecords, ...action.payload];
      return { ...state, feeRecords };
    }
    case "WAIVE_FEE": {
      const feeRecords = state.feeRecords.map((r) =>
        r.id === action.payload.feeRecordId
          ? { ...r, status: "Waived" as const, dueAmount: 0 }
          : r,
      );
      const adj: Adjustment = {
        id: generateId(),
        studentId:
          state.feeRecords.find((r) => r.id === action.payload.feeRecordId)
            ?.studentId ?? "",
        feeRecordId: action.payload.feeRecordId,
        type: "Discount",
        amount:
          state.feeRecords.find((r) => r.id === action.payload.feeRecordId)
            ?.dueAmount ?? 0,
        reason: action.payload.reason,
        appliedAt: new Date().toISOString(),
      };
      return { ...state, feeRecords, adjustments: [...state.adjustments, adj] };
    }

    case "ADD_PAYMENT": {
      const payments = [...state.payments, action.payload.payment];
      const feeRecords = state.feeRecords.map((r) => {
        const updated = action.payload.updatedFeeRecords.find(
          (u) => u.id === r.id,
        );
        return updated ?? r;
      });
      return { ...state, payments, feeRecords };
    }
    case "DELETE_PAYMENT": {
      const payments = state.payments.filter(
        (p) => p.id !== action.payload.paymentId,
      );
      const feeRecords = state.feeRecords.map((r) => {
        const updated = action.payload.updatedFeeRecords.find(
          (u) => u.id === r.id,
        );
        return updated ?? r;
      });
      return { ...state, payments, feeRecords };
    }

    case "ADD_ADJUSTMENT": {
      return { ...state, adjustments: [...state.adjustments, action.payload] };
    }

    case "UPDATE_SETTINGS":
      return { ...state, settings: action.payload };

    case "IMPORT_DATA":
      return {
        batches: action.payload.batches,
        students: action.payload.students,
        feeRecords: action.payload.feeRecords,
        payments: action.payload.payments,
        adjustments: action.payload.adjustments,
        settings: { ...defaultSettings, ...action.payload.settings },
        isAuthenticated: true,
      };

    case "RESET_TO_DEMO": {
      return {
        ...emptyAppState(),
        settings: { ...defaultSettings, ...state.settings },
        isAuthenticated: true,
      };
    }

    default:
      return state;
  }
}

interface StoreContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Helper actions
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addBatch: (batch: Omit<Batch, "id" | "createdAt" | "totalStudents">) => Batch;
  updateBatch: (batch: Batch) => void;
  deleteBatch: (id: string) => void;
  addStudent: (student: Omit<Student, "id" | "createdAt">) => Student;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;
  recordPayment: (
    payment: Omit<Payment, "id" | "createdAt" | "receiptNumber">,
  ) => Payment;
  deletePayment: (paymentId: string) => void;
  updateSettings: (settings: Settings) => void;
  waiveFee: (feeRecordId: string, reason: string) => void;
  resetToDemo: () => void;
  importData: (raw: string) => boolean;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const login = useCallback(
    (username: string, password: string): boolean => {
      if (
        username === state.settings.adminUsername &&
        password === state.settings.adminPassword
      ) {
        dispatch({ type: "LOGIN" });
        return true;
      }
      return false;
    },
    [state.settings.adminUsername, state.settings.adminPassword],
  );

  const logout = useCallback(() => dispatch({ type: "LOGOUT" }), []);

  const addBatch = useCallback(
    (data: Omit<Batch, "id" | "createdAt" | "totalStudents">): Batch => {
      const batch: Batch = {
        ...data,
        id: generateId(),
        totalStudents: 0,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: "ADD_BATCH", payload: batch });
      return batch;
    },
    [],
  );

  const updateBatch = useCallback(
    (batch: Batch) => dispatch({ type: "UPDATE_BATCH", payload: batch }),
    [],
  );
  const deleteBatch = useCallback(
    (id: string) => dispatch({ type: "DELETE_BATCH", payload: id }),
    [],
  );

  const addStudent = useCallback(
    (data: Omit<Student, "id" | "createdAt">): Student => {
      const student: Student = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      // Generate fee records
      const batch = state.batches.find((b) => b.id === student.batchId);
      let feeRecords: FeeRecord[] = [];
      if (batch) {
        feeRecords = generateFeeRecords(
          student,
          batch,
          state.settings,
          state.feeRecords,
        );
      }
      dispatch({ type: "ADD_STUDENT", payload: { student, feeRecords } });
      return student;
    },
    [state.batches, state.settings, state.feeRecords],
  );

  const updateStudent = useCallback(
    (student: Student) =>
      dispatch({ type: "UPDATE_STUDENT", payload: student }),
    [],
  );
  const deleteStudent = useCallback(
    (id: string) => dispatch({ type: "DELETE_STUDENT", payload: id }),
    [],
  );

  const recordPayment = useCallback(
    (data: Omit<Payment, "id" | "createdAt" | "receiptNumber">): Payment => {
      const receiptNumber = `REC-${Date.now().toString().slice(-4)}`;
      const payment: Payment = {
        ...data,
        id: generateId(),
        receiptNumber,
        createdAt: new Date().toISOString(),
      };

      // Update fee records: distribute payment across months
      const updatedFeeRecords: FeeRecord[] = [];
      let remaining = payment.amount;

      for (const monthKey of payment.feeMonths) {
        const [yearStr, monthStr] = monthKey.split("-");
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const record = state.feeRecords.find(
          (r) =>
            r.studentId === payment.studentId &&
            r.month === month &&
            r.year === year,
        );
        if (record && remaining > 0) {
          const toApply = Math.min(
            remaining,
            record.expectedAmount - record.paidAmount,
          );
          const updated = recalculateFeeStatus({
            ...record,
            paidAmount: record.paidAmount + toApply,
          });
          updatedFeeRecords.push(updated);
          remaining -= toApply;
        }
      }

      dispatch({
        type: "ADD_PAYMENT",
        payload: { payment, updatedFeeRecords },
      });
      return payment;
    },
    [state.feeRecords],
  );

  const deletePayment = useCallback(
    (paymentId: string) => {
      const payment = state.payments.find((p) => p.id === paymentId);
      if (!payment) return;

      // Recalculate fee records from scratch for this student
      const studentPayments = state.payments.filter(
        (p) => p.id !== paymentId && p.studentId === payment.studentId,
      );
      const studentFeeRecords: FeeRecord[] = state.feeRecords
        .filter((r) => r.studentId === payment.studentId)
        .map((r) => ({
          ...r,
          paidAmount: 0,
          dueAmount: r.expectedAmount,
          status: "Unpaid",
        }));

      // Reapply remaining payments
      const updatedMap = new Map<string, FeeRecord>(
        studentFeeRecords.map((r) => [r.id, { ...r }]),
      );
      for (const p of studentPayments) {
        for (const monthKey of p.feeMonths) {
          const [yearStr, monthStr] = monthKey.split("-");
          const year = parseInt(yearStr, 10);
          const month = parseInt(monthStr, 10);
          const recId = `fee-${p.studentId}-${yearStr}-${monthStr}`;
          const rec =
            updatedMap.get(recId) ??
            studentFeeRecords.find((r) => r.month === month && r.year === year);
          if (rec) {
            const toApply = Math.min(
              p.amount,
              rec.expectedAmount - rec.paidAmount,
            );
            const updated = recalculateFeeStatus({
              ...rec,
              paidAmount: rec.paidAmount + Math.max(0, toApply),
            });
            updatedMap.set(rec.id, updated);
          }
        }
      }

      dispatch({
        type: "DELETE_PAYMENT",
        payload: {
          paymentId,
          updatedFeeRecords: Array.from(updatedMap.values()),
        },
      });
    },
    [state.payments, state.feeRecords],
  );

  const updateSettings = useCallback(
    (settings: Settings) =>
      dispatch({ type: "UPDATE_SETTINGS", payload: settings }),
    [],
  );
  const waiveFee = useCallback(
    (feeRecordId: string, reason: string) =>
      dispatch({ type: "WAIVE_FEE", payload: { feeRecordId, reason } }),
    [],
  );
  const resetToDemo = useCallback(
    () => dispatch({ type: "RESET_TO_DEMO" }),
    [],
  );
  const importData = useCallback(
    (raw: string): boolean => {
      try {
        const parsed = JSON.parse(raw) as AppState;
        const newState: AppState = {
          batches: Array.isArray(parsed.batches) ? parsed.batches : [],
          students: Array.isArray(parsed.students) ? parsed.students : [],
          feeRecords: Array.isArray(parsed.feeRecords)
            ? parsed.feeRecords
            : [],
          payments: Array.isArray(parsed.payments) ? parsed.payments : [],
          adjustments: Array.isArray(parsed.adjustments)
            ? parsed.adjustments
            : [],
          settings: { ...defaultSettings, ...parsed.settings },
          isAuthenticated: true,
        };
        dispatch({ type: "IMPORT_DATA", payload: newState });
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const value: StoreContextType = {
    state,
    dispatch,
    login,
    logout,
    addBatch,
    updateBatch,
    deleteBatch,
    addStudent,
    updateStudent,
    deleteStudent,
    recordPayment,
    deletePayment,
    updateSettings,
    waiveFee,
    resetToDemo,
    importData,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreContextType {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
