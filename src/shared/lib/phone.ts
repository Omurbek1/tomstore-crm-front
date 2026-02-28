export const normalizeKgPhone = (value?: string) => {
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

export const isValidKgPhone = (value?: string) => {
  const digits = String(value || "").replace(/\D/g, "");
  return /^996\d{9}$/.test(digits);
};
