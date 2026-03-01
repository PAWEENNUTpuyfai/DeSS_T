import type { DataFitResponse } from "../../app/models/DistributionFitModel";
import type { StationDetail } from "../../app/models/Network";
import { API_BASE_URL } from "../config";
import { buildStationNameToIdMap } from "../sheetHelpers";

export async function AlightingFitFromXlsx(
  file: File,
  stationDetails: StationDetail[],
): Promise<DataFitResponse> {
  const form = new FormData();

  const stationMap = buildStationNameToIdMap(stationDetails);

  form.append("file", file);
  form.append("station_map", JSON.stringify(stationMap));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/guest/alighting/distribution_fit`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`API error: ${res.statusText}`);
  }

  return res.json();
}

export async function InterarrivalFitFromXlsx(
  file: File,
  stationDetails: StationDetail[],
  isDayTemplate: boolean = false,
): Promise<DataFitResponse> {
  const form = new FormData();
  const stationMap = buildStationNameToIdMap(stationDetails);
  form.append("file", file);
  form.append("station_map", JSON.stringify(stationMap));
  form.append("is_day_template", String(isDayTemplate));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/guest/interarrival/distribution_fit`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") {
      throw new Error("Interarrival fit request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`API error: ${res.statusText}`);
  }

  return res.json() as Promise<DataFitResponse>;
}

// Fit distribution from interarrival values directly (no file upload)
export async function FitDistributionFromInterarrivalValues(
  interarrivalValues: Array<{
    Station: string;
    StationName?: string;
    Time_Range: string;
    OriginalValues: number[];
    InterarrivalValues: number[];
  }>,
): Promise<DataFitResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/guest/interarrival/fit_from_values`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ InterarrivalValues: interarrivalValues }),
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") {
      throw new Error("Fit distribution request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`API error: ${res.statusText}`);
  }

  return res.json() as Promise<DataFitResponse>;
}
