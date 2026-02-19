import type { UserScenario } from "../../app/models/User";
import { API_BASE_URL } from "../config";

interface CoverImageResponse {
  cover_image_id: string;
  path_file: string;
  url: string;
}

export async function createUserScenario(
  userScenario: UserScenario,
): Promise<UserScenario> {
  const response = await fetch(`${API_BASE_URL}/user-scenario`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userScenario),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result: UserScenario = await response.json();
  return result;
}

export async function uploadScenarioCoverImage(
  file: File,
): Promise<CoverImageResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/upload/scenario-cover-img`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result: CoverImageResponse = await response.json();
  return result;
}
