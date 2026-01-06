import type { ProjectSimulationRequest } from "../../app/models/ProjectModel";
import { API_BASE_URL } from "../config";

export async function runSimulation(
  request: ProjectSimulationRequest
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/simulation/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Simulation request failed: ${response.statusText}`);
  }

  return response.json();
}
