export const INSTALLMENT_PROVIDER_OPTIONS = [
  { key: "zero-3", provider: "Зеро", months: 3, label: "Зеро · 3 мес" },
  { key: "zero-8", provider: "Зеро", months: 8, label: "Зеро · 8 мес" },
  { key: "zero-12", provider: "Зеро", months: 12, label: "Зеро · 12 мес" },
  { key: "mplbs-3", provider: "МПЛБС", months: 3, label: "МПЛБС · 3 мес" },
  { key: "mplbs-6", provider: "МПЛБС", months: 6, label: "МПЛБС · 6 мес" },
  { key: "tumar-3", provider: "Тумар", months: 3, label: "Тумар · 3 мес" },
  { key: "mislam-4", provider: "Мислам", months: 4, label: "Мислам · 4 мес" },
  { key: "mkk-3", provider: "МКК", months: 3, label: "МКК · 3 мес" },
  { key: "mkk-6", provider: "МКК", months: 6, label: "МКК · 6 мес" },
  { key: "mkk-9", provider: "МКК", months: 9, label: "МКК · 9 мес" },
] as const;

export const buildInstallmentValue = (provider: string, months: number) =>
  `${provider}::${months}`;

export const parseInstallmentValue = (value?: string) => {
  if (!value) return null;
  const [provider, monthsRaw] = value.split("::");
  const months = Number(monthsRaw);
  if (!provider || !Number.isFinite(months) || months <= 0) return null;
  return { provider, months };
};
