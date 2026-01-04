import { API_BASE_URL } from "../config";

export type PointInput = { id: string; coord: [number, number] }; // [lon, lat]
export type RouteSegment = { from: string; to: string; coords: [number, number][] };
export type ComputeSegmentsResponse = { segments: RouteSegment[] };

/**
 * Request batched route polylines for consecutive points via backend.
 * Backend uses OpenRouteService and falls back to straight lines per segment on failure.
 */
export async function computeRouteSegments(points: PointInput[], timeoutMs = 20000): Promise<RouteSegment[]> {
  if (!points || points.length < 2) return [];
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE_URL}/network/route-paths`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Route-paths API error: ${res.status} ${res.statusText} ${txt}`);
    }
    const data = (await res.json()) as ComputeSegmentsResponse;
    return data.segments ?? [];
  } finally {
    clearTimeout(t);
  }
}
