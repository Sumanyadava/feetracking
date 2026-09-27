import type {
  Batch,
  Student,
  FeeRecord,
  Payment,
  Adjustment,
  Settings,
} from "../types";

export const defaultSettings: Settings = {
  instituteName: "",
  instituteAddress: "",
  institutePhone: "",
  instituteEmail: "",
  logoUrl: "",
  adminUsername: "admin",
  adminPassword: "admin123",
  feeDueDayOfMonth: 5,
  lateFeeEnabled: false,
  lateFeeAmount: 100,
  lateFeeType: "fixed",
  currency: "INR",
};

export const seedBatches: Batch[] = [];
export const seedStudents: Student[] = [];
export const seedFeeRecords: FeeRecord[] = [];
export const seedPayments: Payment[] = [];
export const seedAdjustments: Adjustment[] = [];

export function updateBatchStudentCounts(
  batches: Batch[],
  students: Student[],
): Batch[] {
  return batches.map((b) => ({
    ...b,
    totalStudents: students.filter((s) => s.batchId === b.id).length,
  }));
}
