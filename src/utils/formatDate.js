const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateOnly(value) {
  if (!value) return "";

  if (typeof value === "string" && DATE_ONLY_PATTERN.test(value)) {
    const [year, month, day] = value.split("-");
    return `${month}/${day}/${year}`;
  }

  const date = toDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  }).format(date);
}

export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}
