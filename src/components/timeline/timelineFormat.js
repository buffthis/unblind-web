const MINUTE = 60 * 1000;
const HOUR_MINUTES = 60;
const DAY_MINUTES = 24 * HOUR_MINUTES;

// An event's moment may come as a Date, epoch milliseconds or an ISO string. Anything
// that does not make a valid date counts as no moment at all.
export function parseAt(at) {
  if (at == null || at === '') return null;
  const date = at instanceof Date ? at : new Date(at);
  return Number.isNaN(date.getTime()) ? null : date;
}

const pad = (number) => String(number).padStart(2, '0');

// The clock time in the reader's own time zone, which is what a Date prints with.
export function formatClock(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Whole minutes from one moment to the next, or null when either is missing.
export function minutesBetween(from, to) {
  if (!from || !to) return null;
  return Math.round((to.getTime() - from.getTime()) / MINUTE);
}

// "45분 뒤", "2시간 30분 뒤", "1일 3시간 뒤". The smaller unit is left out when it is zero.
export function formatGap(minutes) {
  if (minutes < HOUR_MINUTES) return `${minutes}분 뒤`;
  if (minutes < DAY_MINUTES) {
    const hours = Math.floor(minutes / HOUR_MINUTES);
    const rest = minutes % HOUR_MINUTES;
    return rest ? `${hours}시간 ${rest}분 뒤` : `${hours}시간 뒤`;
  }
  const days = Math.floor(minutes / DAY_MINUTES);
  const hours = Math.floor((minutes % DAY_MINUTES) / HOUR_MINUTES);
  return hours ? `${days}일 ${hours}시간 뒤` : `${days}일 뒤`;
}
