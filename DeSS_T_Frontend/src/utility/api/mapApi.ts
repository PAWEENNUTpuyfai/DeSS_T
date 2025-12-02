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
    [out:json][timeout:60];
    area(${areaCode})->.searchArea;
    (
      node["highway"="bus_stop"](area.searchArea);
    );
    out body;
  `;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 70000); // 70 second timeout

    const res = await fetch(OVERPASS_URL, { 
      method: "POST", 
      body: query,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Overpass error: ${res.statusText}`);
    const data = await res.json();
    
    const elements = data.elements ?? [];
    if (elements.length === 0) {
      throw new Error("ไม่พบ bus stop ในพื้นที่นี้");
    }

    // Compute bounds from bus stop coordinates
    let minlat = Infinity,
      minlon = Infinity,
      maxlat = -Infinity,
      maxlon = -Infinity;

    for (const el of elements) {
      if (el.lat !== undefined && el.lon !== undefined) {
        if (el.lat < minlat) minlat = el.lat;
        if (el.lat > maxlat) maxlat = el.lat;
        if (el.lon < minlon) minlon = el.lon;
        if (el.lon > maxlon) maxlon = el.lon;
      }
    }

    if (minlat === Infinity) {
      throw new Error("ไม่พบขอบเขต (bounds) สำหรับ area code นี้");
    }

    // Add small padding (0.01 degrees ≈ 1km)
    const padding = 0.01;
    return {
      minlat: minlat - padding,
      maxlat: maxlat + padding,
      minlon: minlon - padding,
      maxlon: maxlon + padding,
    } as OverpassBounds;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error("Overpass API timeout - ลองใหม่อีกครั้ง");
    }
    throw err;
  }
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

  return [];
}