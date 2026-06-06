/**
 * Returns today's date in YYYY-MM-DD format using LOCAL time.
 * IMPORTANT: Do NOT use new Date().toISOString().split('T')[0] — that uses UTC
 * and will give the wrong date for users in timezones ahead of UTC (e.g. IST).
 */
export function getLocalTodayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns the YYYY-MM-DD for the start of the current week (Sunday) in LOCAL time.
 */
export function getLocalWeekStartStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // Go back to Sunday
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns the YYYY-MM-DD for the start of the current month in LOCAL time.
 */
export function getLocalMonthStartStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/**
 * Strips "Dr." or "Dr " prefix from a name to keep database entries clean.
 */
export function normalizeDoctorName(name: string): string {
  if (!name) return "";
  return name.replace(/^(Dr\.\s*|Dr\s+)/i, "").trim();
}

/**
 * Safely adds "Dr. " prefix to a name only if it's missing.
 */
export function displayDoctorName(name: string): string {
  if (!name) return "Consultant";
  if (name.toLowerCase().startsWith("dr.")) return name;
  if (name.toLowerCase().startsWith("dr "))
    return `Dr. ${name.substring(3).trim()}`;
  return `Dr. ${name.trim()}`;
}
