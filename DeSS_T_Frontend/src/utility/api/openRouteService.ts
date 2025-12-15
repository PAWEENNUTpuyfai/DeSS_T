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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/network/build`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stations,
        network_name: networkName,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as any)?.name === "AbortError") {
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
