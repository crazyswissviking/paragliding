// Abruf mit Zeitlimit; kein Next-Cache (SLF-Antwort ist > 2 MB), Zwischenspeicherung übernimmt index.ts.
export type Holer = (url: string, init?: RequestInit) => Promise<Response>;

export const standardHoler: Holer = (url, init) =>
  fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20000), ...init, headers: { "User-Agent": "vikingfly.ch (Messnetz-Abruf)", ...(init?.headers ?? {}) } });

export async function holeText(holer: Holer, url: string, kodierung = "utf-8"): Promise<string> {
  const res = await holer(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} für ${new URL(url).host}`);
  const buf = await res.arrayBuffer();
  return new TextDecoder(kodierung).decode(buf);
}

export async function holeJson<T>(holer: Holer, url: string): Promise<T> {
  const res = await holer(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} für ${new URL(url).host}`);
  return (await res.json()) as T;
}
