import type { User } from "../../app/models/User";
import { API_BASE_URL } from "../config";

export async function userLogin(userData: User): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/google/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const user: User = await response.json();
  return user;
}
