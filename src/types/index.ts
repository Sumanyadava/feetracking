export type BatchStatus = 'Active' | 'Completed' | 'Archived';
export type StudentStatus = 'Active' | 'Inactive' | 'Completed' | 'Dropped';
export type FeeStatus = 'Paid' | 'Partial' | 'Unpaid' | 'Waived';
export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Card';
export type AdjustmentType = 'Discount' | 'Scholarship' | 'Late Fee';
export type UserRole = 'Admin' | 'Accountant' | 'Teacher' | 'Viewer';

export interface Batch {
  id: string;
  name: string;
  code: string;
  courseName: string;
  startDate: string; // ISO date string
  endDate: string;
  totalStudents: number;
  monthlyFee: number;
  admissionFee: number;
  status: BatchStatus;
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  phone: string;
  email: string;
  guardianName: string;
  guardianPhone: string;
  address: string;
  batchId: string;
  joiningDate: string; // ISO date string
  course: string;
  status: StudentStatus;
  profilePhoto?: string;
  notes: string;
  createdAt: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  batchId: string;
  month: number; // 1-12
  year: number;
  expectedAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: FeeStatus;
  dueDate: string; // ISO date string
  generatedAt: string;
}

export interface Payment {
  id: string;
  studentId: string;
  batchId: string;
  amount: number;
  paymentDate: string; // ISO date string
  method: PaymentMethod;
  transactionId: string;
  receiptNumber: string;
  feeMonths: string[]; // e.g. ['2026-09', '2026-10']
  notes: string;
  createdAt: string;
}

export interface Adjustment {
  id: string;
  studentId: string;
  feeRecordId: string;
  type: AdjustmentType;
  amount: number;
  reason: string;
  appliedAt: string;
}

export interface Settings {
  instituteName: string;
  instituteAddress: string;
  institutePhone: string;
  instituteEmail: string;
  logoUrl: string;
  adminUsername: string;
  adminPassword: string;
  feeDueDayOfMonth: number; // default 5
  lateFeeEnabled: boolean;
  lateFeeAmount: number;
  lateFeeType: 'fixed' | 'percentage';
  currency: string;
}

export interface AppState {
  batches: Batch[];
  students: Student[];
  feeRecords: FeeRecord[];
  payments: Payment[];
  adjustments: Adjustment[];
  settings: Settings;
  isAuthenticated: boolean;
}

// Computed / derived types
export interface StudentFeeSummary {
  student: Student;
  batch: Batch | undefined;
  totalExpected: number;
  totalPaid: number;
  totalDue: number;
  overdueDays: number;
  monthlyBreakdown: MonthlyStatus[];
}

export interface MonthlyStatus {
  month: number;
  year: number;
  monthKey: string;
  feeRecord: FeeRecord | undefined;
  expected: number;
  paid: number;
  due: number;
  status: FeeStatus | 'Not Generated';
  overdueDays: number;
}

export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  activeBatches: number;
  collectedThisMonth: number;
  pendingFees: number;
  overdueStudents: number;
  monthlyCollection: { month: string; collected: number; expected: number }[];
  batchWiseCollection: { batch: string; collected: number; pending: number }[];
  paymentMethodBreakdown: { method: string; amount: number }[];
}
