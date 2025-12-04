import type {
  StationDetail,
  StationPair,
  NetworkModel,
  GeoLineString,
} from "../../app/models/Network";

/**
 * Build a NetworkModel from an array of StationDetail using OpenRouteService Matrix API.
 *
 * Note: Place your ORS API key in an env variable named `VITE_ORS_API_KEY`.
 * For security keep the key server-side in production; this helper assumes a dev/test setup.
 */
export async function buildNetworkModelFromStations(
  stations: StationDetail[],
  networkName = "guest_network"
): Promise<NetworkModel> {
  if (!stations || stations.length === 0) {
    return { Network_model: networkName, Station_detail: [], StationPair: [] };
  }

  const key = (import.meta.env.VITE_ORS_API_KEY as string) || "";
  if (!key) throw new Error("VITE_ORS_API_KEY is not set in environment variables");

  // OpenRouteService expects coordinates as [lon, lat]
  const locations = stations.map((s) => [s.location.coordinates[0], s.location.coordinates[1]]);

  const body = {
    locations,
    metrics: ["distance", "duration"],
    units: "m",
  };

  const res = await fetch("https://api.openrouteservice.org/v2/matrix/driving-car", {
    method: "POST",
    headers: {
      Authorization: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ORS Matrix API error: ${res.status} ${res.statusText} ${text}`);
  }

  const data = await res.json();

  const distances: number[][] = data.distances ?? [];
  const durations: number[][] | undefined = data.durations;

  const pairs: StationPair[] = [];
  for (let i = 0; i < stations.length; i++) {
    for (let j = 0; j < stations.length; j++) {
      if (i === j) continue; // skip self

      const dist = (distances?.[i]?.[j] ?? null) as number | null;
      const dur = (durations?.[i]?.[j] ?? null) as number | null;

      const route: GeoLineString = {
        type: "LineString",
        coordinates: [
          [stations[i].location.coordinates[0], stations[i].location.coordinates[1]],
          [stations[j].location.coordinates[0], stations[j].location.coordinates[1]],
        ],
      };

      pairs.push({
        FstStation: stations[i].StationID,
        SndStation: stations[j].StationID,
        RouteBetween: {
          RouteBetweenID: `${stations[i].StationID}-${stations[j].StationID}`,
          TravelTime: dur ?? 0,
          Route: route,
          Distance: dist ?? -1,
        },
      });
    }
  }

  const network: NetworkModel = {
    Network_model: networkName,
    Station_detail: stations,
    StationPair: pairs,
  };

  return network;
}

export default buildNetworkModelFromStations;
