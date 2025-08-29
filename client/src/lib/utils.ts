import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
}

const CENTRAL_TZ = 'America/Chicago';

export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: CENTRAL_TZ,
  }).format(date);
}

export function formatTime(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    timeZone: CENTRAL_TZ,
  }).format(date);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  
  return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${remainingMinutes} min`;
}

export function getInitials(firstName?: string, lastName?: string): string {
  if (!firstName && !lastName) return '??';
  
  let initials = '';
  if (firstName) initials += firstName[0].toUpperCase();
  if (lastName) initials += lastName[0].toUpperCase();
  
  return initials;
}

export function getFullName(firstName?: string, lastName?: string, username?: string): string {
  if (!firstName && !lastName) return username || 'Unknown User';
  return [firstName, lastName].filter(Boolean).join(' ');
}

export function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<F>): Promise<ReturnType<F>> => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    return new Promise(resolve => {
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
  };
}

// Convert a Date or ISO string to a Date that reflects the same wall-clock time in Central Time.
export function toCentralWallTime(input: Date | string): Date {
  const date = typeof input === 'string' ? new Date(input) : input;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CENTRAL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(p => p.type === type)?.value || 0);
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour');
  const minute = get('minute');
  const second = get('second');
  return new Date(year, month - 1, day, hour, minute, second, 0);
}
