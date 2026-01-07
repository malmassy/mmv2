// lib/engine/utils/id.ts
export function makeId(prefix = ''): string {
  // Prefer crypto.randomUUID when available
  const c: Crypto | undefined = typeof crypto !== 'undefined' ? crypto : undefined;

  if (c && 'randomUUID' in c && typeof (c as any).randomUUID === 'function') {
    return prefix ? `${prefix}_${(c as any).randomUUID()}` : (c as any).randomUUID();
  }

  // Fallback: UUID-ish using getRandomValues if available
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);

    // RFC4122-ish v4 formatting
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    return prefix ? `${prefix}_${uuid}` : uuid;
  }

  // Last resort fallback (still unique enough for local sessions)
  const s = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${s}` : s;
}
