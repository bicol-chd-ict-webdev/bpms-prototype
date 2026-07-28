import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
}

export function formatBloodType(group: string, rh: '+' | '-'): string {
  return `${group}${rh}`;
}

export function formatRequestDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function getBloodGroupBadgeColor(group: string): string {
  switch (group) {
    case 'O-':
      return 'bg-red-600 text-white border-red-700 dark:bg-red-700';
    case 'O+':
      return 'bg-red-500 text-white border-red-600 dark:bg-red-600';
    case 'A-':
      return 'bg-rose-600 text-white border-rose-700 dark:bg-rose-700';
    case 'A+':
      return 'bg-rose-500 text-white border-rose-600 dark:bg-rose-600';
    case 'B-':
      return 'bg-amber-600 text-white border-amber-700 dark:bg-amber-700';
    case 'B+':
      return 'bg-amber-500 text-white border-amber-600 dark:bg-amber-600';
    case 'AB-':
      return 'bg-purple-600 text-white border-purple-700 dark:bg-purple-700';
    case 'AB+':
      return 'bg-purple-500 text-white border-purple-600 dark:bg-purple-600';
    default:
      return 'bg-slate-500 text-white';
  }
}

export function getStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case 'available':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
    case 'quarantine':
    case 'testing':
      return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
    case 'reserved':
      return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
    case 'crossmatched':
      return 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800';
    case 'uncrossmatched':
      return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
    case 'in_transit':
    case 'in transit':
      return 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800';
    case 'transfused':
      return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800';
    case 'expired':
    case 'discarded':
      return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300';
  }
}
