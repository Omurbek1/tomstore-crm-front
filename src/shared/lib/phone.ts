const COUNTRY_CODES = [
  "998", "996", "995", "994", "993", "992", "977", "976", "975", "974",
  "973", "972", "971", "970", "968", "967", "966", "965", "964", "963",
  "962", "961", "960", "886", "880", "856", "855", "853", "852", "850",
  "692", "691", "690", "689", "688", "687", "686", "685", "683", "682",
  "681", "680", "679", "678", "677", "676", "675", "674", "673", "672",
  "670", "599", "598", "597", "596", "595", "594", "593", "592", "591",
  "590", "509", "508", "507", "506", "505", "504", "503", "502", "501",
  "500", "423", "421", "420", "389", "387", "386", "385", "383", "382",
  "381", "380", "378", "377", "376", "375", "374", "373", "372", "371",
  "370", "359", "358", "357", "356", "355", "354", "353", "352", "351",
  "350", "299", "298", "297", "291", "290", "269", "268", "267", "266",
  "265", "264", "263", "262", "261", "260", "258", "257", "256", "255",
  "254", "253", "252", "251", "250", "249", "248", "247", "246", "245",
  "244", "243", "242", "241", "240", "239", "238", "237", "236", "235",
  "234", "233", "232", "231", "230", "229", "228", "227", "226", "225",
  "224", "223", "222", "221", "220", "218", "216", "213", "212", "211",
  "98", "97", "95", "94", "93", "92", "91", "90", "86", "84", "82", "81",
  "66", "65", "64", "63", "62", "61", "58", "57", "56", "55", "54", "53",
  "52", "51", "49", "48", "47", "46", "45", "44", "43", "41", "40", "39",
  "36", "34", "33", "32", "31", "30", "27", "20", "7", "1",
].sort((a, b) => b.length - a.length);

const groupNational = (value: string) => {
  if (value.length <= 4) return value;
  const parts: string[] = [];
  let i = 0;
  while (value.length - i > 4) {
    parts.push(value.slice(i, i + 3));
    i += 3;
  }
  parts.push(value.slice(i));
  return parts.join(" ");
};

const detectCountryCode = (digits: string) => {
  for (const code of COUNTRY_CODES) {
    if (digits.startsWith(code)) return code;
  }
  return digits.slice(0, 1);
};

export const toE164 = (value?: string) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const hasPlus = raw.startsWith("+");
  let digits = raw.replace(/\D/g, "");

  if (raw.startsWith("00")) {
    digits = digits.slice(2);
    return digits.length >= 7 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (hasPlus) {
    return digits.length >= 7 && digits.length <= 15 ? `+${digits}` : null;
  }

  if (/^996\d{9}$/.test(digits)) return `+${digits}`;
  if (/^0\d{9}$/.test(digits)) return `+996${digits.slice(1)}`;
  if (/^\d{9}$/.test(digits)) return `+996${digits}`;
  if (/^1\d{10}$/.test(digits)) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;

  return null;
};

export const normalizeIntlPhone = (value?: string) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const e164 = toE164(raw);
  if (e164) {
    const digits = e164.slice(1);
    const code = detectCountryCode(digits);
    const national = digits.slice(code.length);
    return national ? `+${code} ${groupNational(national)}` : `+${code}`;
  }

  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return groupNational(digits.slice(0, 15));
};

export const isValidIntlPhone = (value?: string) =>
  Boolean(toE164(value) || /^\d{7,15}$/.test(String(value || "").replace(/\D/g, "")));

// Backward-compatible aliases
export const normalizeKgPhone = normalizeIntlPhone;
export const isValidKgPhone = isValidIntlPhone;

export const toWhatsAppLink = (value?: string, text?: string) => {
  const e164 = toE164(value);
  if (!e164) return null;
  const digits = e164.slice(1);
  const encodedText = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${encodedText}`;
};

export const toPhoneLink = (value?: string) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const e164 = toE164(raw);
  if (e164) return `tel:${e164}`;
  return `tel:${raw.replace(/\s+/g, "")}`;
};
