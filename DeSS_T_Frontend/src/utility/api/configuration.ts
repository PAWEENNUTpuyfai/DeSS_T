import type {
  UserScenario,
  UserConfiguration,
  CoverImageConf,
} from "../../app/models/User";
import { API_BASE_URL } from "../config";

export async function createUserConfiguration(
  userScenario: UserScenario,
): Promise<UserConfiguration> {
  const response = await fetch(`${API_BASE_URL}/user-configuration`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userScenario),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const userConfiguration: UserConfiguration = await response.json();
  return userConfiguration;
}

export async function uploadConfigurationCoverImage(
  file: File,
): Promise<CoverImageConf> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/upload/configuration-cover-img`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(
      `Configuration cover image upload failed: ${response.statusText}`,
    );
  }

  return response.json() as Promise<CoverImageConf>;
}
