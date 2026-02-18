import type { UserConfiguration, CoverImageConf } from "../../app/models/User";
import type { ConfigurationDetail } from "../../app/models/Configuration";
import { API_BASE_URL } from "../config";

export async function createUserConfiguration(
  userConfiguration: UserConfiguration,
): Promise<UserConfiguration> {
  const response = await fetch(`${API_BASE_URL}/user-configuration`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userConfiguration),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result: UserConfiguration = await response.json();
  return result;
}

export async function getUserConfigurations(
  userId: string,
): Promise<UserConfiguration[]> {
  const response = await fetch(
    `${API_BASE_URL}/user-configurations/${encodeURIComponent(userId)}`,
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result: UserConfiguration[] = await response.json();
  return result;
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

export async function getConfigurationDetail(
  configurationDetailId: string,
): Promise<ConfigurationDetail> {
  const response = await fetch(
    `${API_BASE_URL}/configuration-details/${encodeURIComponent(
      configurationDetailId,
    )}`,
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result: ConfigurationDetail = await response.json();
  return result;
}
