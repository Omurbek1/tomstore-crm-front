const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

type SafeUrlOptions = {
  allowRelative?: boolean;
};

export const toSafeExternalUrl = (
  value?: string | null,
  options?: SafeUrlOptions,
): string | undefined => {
  const input = String(value ?? "").trim();
  if (!input) return undefined;

  if (options?.allowRelative !== false && input.startsWith("/")) {
    return input;
  }

  try {
    const parsed = new URL(input);

    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return undefined;
    }

    return parsed.toString();
  } catch {
    return undefined;
  }
};
export const toSafeMediaUrl = (value?: string | null) =>
  toSafeExternalUrl(value, { allowRelative: true });

