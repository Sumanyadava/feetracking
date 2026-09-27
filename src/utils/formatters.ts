import { format, parseISO } from 'date-fns';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy');
  } catch {
    return dateStr;
  }
}

export function formatDateLong(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export function formatMonth(month: number, year: number): string {
  return format(new Date(year, month - 1, 1), 'MMM yyyy');
}

export function formatMonthFull(month: number, year: number): string {
  return format(new Date(year, month - 1, 1), 'MMMM yyyy');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function toISODateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function monthKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthLabel(month: number, year: number): string {
  return format(new Date(year, month - 1, 1), 'MMMM yyyy');
}

export function parseMonthKey(key: string): { month: number; year: number } {
  const [year, month] = key.split('-').map(Number);
  return { month, year };
}
