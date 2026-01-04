import { API_BASE_URL } from "../config";

export type LineString = {
  type: "LineString";
  coordinates: [number, number][];
};

/**
 * Fetch route geometry (road-following) between two stations via backend.
 * Falls back to a straight line server-side if ORS is unavailable.
 */
export async function fetchRouteGeometry(
  start: [number, number],
  end: [number, number],
  timeoutMs = 8000
): Promise<LineString> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE_URL}/network/route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start, end }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Route API error: ${res.status} ${res.statusText} ${txt}`);
    }
    return (await res.json()) as LineString;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("Route request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
}
