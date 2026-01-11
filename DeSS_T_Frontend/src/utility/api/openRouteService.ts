import { API_BASE_URL } from "../config";
import type {
  StationDetail,
  NetworkModel,
} from "../../app/models/Network";

/**
 * Build a NetworkModel from an array of StationDetail using backend API.
 * The backend will call OpenRouteService Matrix and Route APIs.
 */
export async function buildNetworkModelFromStations(
  stations: StationDetail[],
  networkName = "guest_network"
): Promise<NetworkModel> {
  if (!stations || stations.length === 0) {
    return { Network_model: networkName, Station_detail: [], StationPair: [] };
  }

  // Map frontend StationDetail → backend Station_Detail shape
  const toNum = (v: unknown): number | undefined => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = parseFloat(v);
      if (Number.isFinite(n)) return n;
    }
    return undefined;
  };

  type StationPayload = {
    station_detail_id: string; // Must include ID for backend to map properly
    StationID?: string;
    StationName?: string;
    Location: { type: "Point"; coordinates: [number, number] };
    lat?: number;
    lon?: number;
  };

  const stationsPayload: StationPayload[] = stations
    .map((s, idx): StationPayload | null => {
      const lat = toNum(s.lat);
      const lon = toNum(s.lon);
      const coordSource =
        (s.Location as { coordinates?: unknown })?.coordinates;
      const lonFromLoc = Array.isArray(coordSource) ? toNum(coordSource[0]) : undefined;
      const latFromLoc = Array.isArray(coordSource) ? toNum(coordSource[1]) : undefined;

      const finalLat = lat ?? latFromLoc;
      const finalLon = lon ?? lonFromLoc;
      if (finalLat === undefined || finalLon === undefined) return null;

      const rawId =
        s.station_detail_id ||
        s.StationID ||
        s.station_id_osm;

      const stationId = rawId || `${finalLat.toFixed(6)},${finalLon.toFixed(6)}` || `station-${idx}`;
      const stationName =
        s.name ||
        s.StationName ||
        rawId ||
        `Station ${idx + 1}`;

      return {
        station_detail_id: String(stationId), // Include this for backend mapping
        StationID: String(stationId),
        StationName: String(stationName),
        Location: {
          type: "Point",
          coordinates: [finalLon, finalLat],
        },
        lat: finalLat,
        lon: finalLon,
      };
    })
    .filter((s): s is StationPayload => s !== null);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/network/build`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stations: stationsPayload,
        network_name: networkName,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err && typeof err === "object" && "name" in err && (err as { name?: string }).name === "AbortError") {
      throw new Error("Network build request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Backend API error: ${res.status} ${res.statusText} ${text}`);
  }

  const data = await res.json();
  return data as NetworkModel;
}

export default buildNetworkModelFromStations;
