import { API_BASE_URL } from "../config";

export type OverpassBounds = {
  minlat: number;
  maxlat: number;
  minlon: number;
  maxlon: number;
};

export type OverpassTags = Record<string, string | number | boolean | undefined>;

export type OverpassNode = {
  id: number;
  lat: number;
  lon: number;
  tags?: OverpassTags;
};

export async function fetchAreaBounds(areaCode: string): Promise<OverpassBounds> {
  const res = await fetch(`${API_BASE_URL}/network/area-bounds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ area_code: areaCode }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Backend error: ${error}`);
  }

  return (await res.json()) as OverpassBounds;
}

export async function fetchBusStops(bounds: [[number, number], [number, number]]): Promise<OverpassNode[]> {
  const [sw, ne] = bounds;
  const res = await fetch(`${API_BASE_URL}/network/bus-stops`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      min_lat: sw[0],
      min_lon: sw[1],
      max_lat: ne[0],
      max_lon: ne[1],
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Backend error: ${error}`);
  }

  return (await res.json()) as OverpassNode[];
}

export async function fetchBusStopsInArea(areaCode: string): Promise<OverpassNode[]> {
  const res = await fetch(`${API_BASE_URL}/network/bus-stops-area`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ area_code: areaCode }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Backend error: ${error}`);
  }

  return (await res.json()) as OverpassNode[];
}

export async function fetchAreaGeometry(areaCode: string): Promise<Array<Array<[number, number]>>> {
  const res = await fetch(`${API_BASE_URL}/network/area-geometry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ area_code: areaCode }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Backend error: ${error}`);
  }

  return (await res.json()) as Array<Array<[number, number]>>;
}
