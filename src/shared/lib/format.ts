import dayjs from "dayjs";

export const formatDate = (value?: string | null, withTime = false) => {
  if (!value) return "—";
  return dayjs(value).format(withTime ? "DD.MM.YYYY HH:mm" : "DD.MM.YYYY");
};

const normalizeKgPhoneInline = (value?: string) => {
  const raw = String(value || "");
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("996")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, 9);

  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 9);
  return `+996${p1 ? ` ${p1}` : ""}${p2 ? ` ${p2}` : ""}${p3 ? ` ${p3}` : ""}`;
};

export const formatPhone = (value?: string | null) => {
  if (!value) return "—";
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("996")) {
    return normalizeKgPhoneInline(value);
  }
  if (digits.length === 9) return normalizeKgPhoneInline(value);
  if (digits.length === 11 && digits.startsWith("7")) {
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  }
  return value;
};

export const formatBirthDate = (
  manager?: { birthDate?: string; birthYear?: number } | null,
) => {
  if (!manager) return "—";
  if (manager.birthDate) return formatDate(manager.birthDate);
  if (manager.birthYear) return `01.01.${manager.birthYear}`;
  return "—";
};
