const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function parseLocalDate(value: string | number | Date): Date {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (typeof value === "number") {
    return new Date(value);
  }

  if (DATE_ONLY_REGEX.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(value);
}

export function getTodayLocalIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
