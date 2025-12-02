export type OverpassBounds = {
  minlat: number;
  maxlat: number;
  minlon: number;
  maxlon: number;
};

export type OverpassNode = {
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, any>;
};

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

export async function fetchAreaBounds(areaCode: string): Promise<OverpassBounds> {
  const query = `
    [out:json][timeout:25];
    area(${areaCode})->.searchArea;
    (
      node(area.searchArea);
    );
    out bb;
  `;

  const res = await fetch(OVERPASS_URL, { method: "POST", body: query });
  if (!res.ok) throw new Error(`Overpass error: ${res.statusText}`);
  const data = await res.json();
  if (!data.elements || data.elements.length === 0)
    throw new Error("ไม่พบพื้นที่จาก area code นี้");

  return data.elements[0].bounds as OverpassBounds;
}

export async function fetchBusStops(bounds: [[number, number], [number, number]]): Promise<OverpassNode[]> {
  const [sw, ne] = bounds;
  const query = `
    [out:json][timeout:25];
    node["highway"="bus_stop"](${sw[0]},${sw[1]},${ne[0]},${ne[1]});
    out body;
  `;

  const res = await fetch(OVERPASS_URL, { method: "POST", body: query });
  if (!res.ok) throw new Error(`Overpass error: ${res.statusText}`);
  const data = await res.json();
  return (data.elements ?? []) as OverpassNode[];
}

export async function fetchAreaGeometry(areaCode: string): Promise<[number, number][][]> {
  const query = `
    [out:json][timeout:25];
    area(${areaCode})->.searchArea;
    (
      way["highway"](area.searchArea);
    );
    out geom;
  `;

  const res = await fetch(OVERPASS_URL, { method: "POST", body: query });
  if (!res.ok) throw new Error(`Overpass error: ${res.statusText}`);
  const data = await res.json();
  const elements = data.elements ?? [];

  const polygons: [number, number][][] = [];

  for (const el of elements) {
    if (el.geometry && Array.isArray(el.geometry)) {
      const coords: [number, number][] = el.geometry.map((p: any) => [p.lat, p.lon]);
      if (coords.length) polygons.push(coords);
    }
  }

  return polygons;
}
