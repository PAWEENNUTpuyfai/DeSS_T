import type { ProjectSimulationRequest } from "../../app/models/ProjectModel";
import type { PaserSchedule } from "../../app/models/ScheduleModel";
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

export async function getScheduleData(
  projectID: string,
  file: File
): Promise<PaserSchedule> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/guest/schedule/upload/${projectID}`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Schedule upload failed: ${response.statusText}`);
  }

  return response.json() as Promise<PaserSchedule>;
}
