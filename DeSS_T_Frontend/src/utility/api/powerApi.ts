// src/utility/api/powerApi.ts
import type { CalcRequest, CalcResponse } from "../../app/models/CalcModel";
import { API_BASE_URL } from "../config";

export async function calculatePower(req: CalcRequest): Promise<CalcResponse> {
  const res = await fetch(`${API_BASE_URL}/power`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.statusText}`);
  }

  const data = await res.json();
  return data as CalcResponse;
}
