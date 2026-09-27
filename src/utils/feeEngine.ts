import { format, differenceInDays, parseISO } from 'date-fns';
import type { FeeRecord, Student, Batch, Settings, MonthlyStatus } from '../types';

/** Generate fee records for a student from joining month to batch end month */
export function generateFeeRecords(
  student: Student,
  batch: Batch,
  settings: Settings,
  existingRecords: FeeRecord[]
): FeeRecord[] {
  const generated: FeeRecord[] = [];
  const joining = parseISO(student.joiningDate);
  const end = parseISO(batch.endDate);

  let current = new Date(joining.getFullYear(), joining.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= endMonth) {
    const month = current.getMonth() + 1;
    const year = current.getFullYear();
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    const alreadyExists = existingRecords.some(
      r => r.studentId === student.id && r.month === month && r.year === year
    );

    if (!alreadyExists) {
      const dueDate = new Date(year, month - 1, settings.feeDueDayOfMonth);
      const record: FeeRecord = {
        id: `fee-${student.id}-${monthKey}`,
        studentId: student.id,
        batchId: batch.id,
        month,
        year,
        expectedAmount: batch.monthlyFee,
        paidAmount: 0,
        dueAmount: batch.monthlyFee,
        status: 'Unpaid',
        dueDate: dueDate.toISOString(),
        generatedAt: new Date().toISOString(),
      };
      generated.push(record);
    }

    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }

  return generated;
}

/** Calculate overdue days for a fee record */
export function getOverdueDays(record: FeeRecord): number {
  if (record.status === 'Paid' || record.status === 'Waived') return 0;
  const today = new Date();
  const due = parseISO(record.dueDate);
  const diff = differenceInDays(today, due);
  return Math.max(0, diff);
}

/** Build monthly status breakdown for a student */
export function buildMonthlyStatus(
  student: Student,
  batch: Batch,
  feeRecords: FeeRecord[],
  _settings?: Settings
): MonthlyStatus[] {
  const studentRecords = feeRecords.filter(r => r.studentId === student.id);
  const joining = parseISO(student.joiningDate);
  const end = parseISO(batch.endDate);

  const statuses: MonthlyStatus[] = [];
  let current = new Date(joining.getFullYear(), joining.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= endMonth) {
    const month = current.getMonth() + 1;
    const year = current.getFullYear();
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    const record = studentRecords.find(r => r.month === month && r.year === year);

    statuses.push({
      month,
      year,
      monthKey,
      feeRecord: record,
      expected: record?.expectedAmount ?? batch.monthlyFee,
      paid: record?.paidAmount ?? 0,
      due: record?.dueAmount ?? batch.monthlyFee,
      status: record?.status ?? 'Unpaid',
      overdueDays: record ? getOverdueDays(record) : 0,
    });

    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }

  return statuses;
}

/** Update fee record status based on paid vs expected */
export function recalculateFeeStatus(record: FeeRecord): FeeRecord {
  let status: FeeRecord['status'];
  if (record.paidAmount >= record.expectedAmount) {
    status = 'Paid';
  } else if (record.paidAmount > 0) {
    status = 'Partial';
  } else {
    status = 'Unpaid';
  }
  return {
    ...record,
    dueAmount: Math.max(0, record.expectedAmount - record.paidAmount),
    status,
  };
}

/** Get month label from month number and year */
export function getMonthLabel(month: number, year: number): string {
  return format(new Date(year, month - 1, 1), 'MMMM yyyy');
}

/** Parse monthKey string like '2026-09' to {month, year} */
export function parseMonthKey(key: string): { month: number; year: number } {
  const [year, month] = key.split('-').map(Number);
  return { month, year };
}

/** Generate receipt number */
export function generateReceiptNumber(existingPayments: { receiptNumber: string }[]): string {
  const nums = existingPayments
    .map(p => parseInt(p.receiptNumber.replace('REC-', ''), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1001;
  return `REC-${next}`;
}

/** Get overdue level for styling */
export function getOverdueLevel(days: number): 'none' | 'warning' | 'danger' {
  if (days <= 0) return 'none';
  if (days <= 7) return 'warning';
  return 'danger';
}
