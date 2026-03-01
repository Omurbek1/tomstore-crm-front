import dayjs from "dayjs";
import { normalizeIntlPhone } from "./phone";

export const formatDate = (value?: string | null, withTime = false) => {
  if (!value) return "—";
  return dayjs(value).format(withTime ? "DD.MM.YYYY HH:mm" : "DD.MM.YYYY");
};

export const formatPhone = (value?: string | null) => {
  if (!value) return "—";
  return normalizeIntlPhone(value);
};

export const formatBirthDate = (
  manager?: { birthDate?: string; birthYear?: number } | null,
) => {
  if (!manager) return "—";
  if (manager.birthDate) return formatDate(manager.birthDate);
  if (manager.birthYear) return `01.01.${manager.birthYear}`;
  return "—";
};
