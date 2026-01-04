import type { DataFitResponse } from "../../app/models/DistriButionFitModel";
import { API_BASE_URL } from "../config";

export async function AlightingFitFromXlsx(
  file: File
): Promise<DataFitResponse> {
  const form = new FormData();
  form.append("file", file);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/guest/alighting/distribution_fit`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as any)?.name === "AbortError") {
      throw new Error("Alighting fit request timed out. Please try again.");
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

export async function InterarrivalFitFromXlsx(
  file: File
): Promise<DataFitResponse> {
  const form = new FormData();
  form.append("file", file);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let res: Response;
  try {
    res = await fetch(
      `${API_BASE_URL}/guest/interarrival/distribution_fit`,
      {
        method: "POST",
        body: form,
        signal: controller.signal,
      }
    );
  } catch (err) {
    if ((err as any)?.name === "AbortError") {
      throw new Error(
        "Interarrival fit request timed out. Please try again."
      );
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
