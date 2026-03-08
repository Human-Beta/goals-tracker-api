export const INT64_MIN = -(2n ** 63n);
export const INT64_MAX = 2n ** 63n - 1n;

export function parseInt64(value: string): bigint | null {
  const normalized = value.trim();

  if (!/^-?\d+$/.test(normalized)) {
    return null;
  }

  let parsed: bigint;
  try {
    parsed = BigInt(normalized);
  } catch {
    return null;
  }

  if (parsed < INT64_MIN || parsed > INT64_MAX) {
    return null;
  }

  return parsed;
}
