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
  console.log(`Fetching user configurations for user ID: ${userId}`);
  const response = await fetch(
    `${API_BASE_URL}/user-configurations/${encodeURIComponent(userId)}`,
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result: unknown = await response.json();
  if (Array.isArray(result)) {
    return result;
  }

  if (
    result &&
    typeof result === "object" &&
    Array.isArray(
      (result as { user_configurations?: unknown }).user_configurations,
    )
  ) {
    return (result as { user_configurations: UserConfiguration[] })
      .user_configurations;
  }

  console.log(result);

  return [];
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

  const result: unknown = await response.json();

  // Handle wrapped response: { configuration: {...} }
  if (
    result &&
    typeof result === "object" &&
    (result as { configuration?: unknown }).configuration
  ) {
    return (result as { configuration: ConfigurationDetail }).configuration;
  }

  // Handle direct response
  if (result && typeof result === "object") {
    return result as ConfigurationDetail;
  }

  throw new Error("Invalid configuration detail response");
}
