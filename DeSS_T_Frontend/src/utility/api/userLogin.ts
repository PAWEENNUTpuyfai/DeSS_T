import type { User } from "../../app/models/User";
import { API_BASE_URL } from "../config";

export async function userLogin(userData: User): Promise<User> {
  console.log("📤 Sending login request with data:", userData);

  const response = await fetch(`${API_BASE_URL}/auth/google/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  console.log("📥 Response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ API Error:", errorText);
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }

  const user: User = await response.json();
  console.log("✓ Login response:", user);
  return user;
}
