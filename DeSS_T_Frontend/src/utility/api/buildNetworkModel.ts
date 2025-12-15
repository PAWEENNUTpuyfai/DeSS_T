// import { API_BASE_URL } from "../config";
// import type { StationDetail } from "../../app/models/Network";

// export async function buildNetworkModel(
//   stations: StationDetail[],
//   name: string
// ) {
//   const orsKey = import.meta.env.VITE_ORS_API_KEY; // ดึงจาก Vite

//   const res = await fetch(`${API_BASE_URL}/network/build`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "X-ORS-KEY": orsKey,
//     },
//     body: JSON.stringify({
//       stations,
//       network_name: name,
//     }),
//   });

//   if (!res.ok) {
//     throw new Error("Network model build failed");
//   }

//   return await res.json();
// }
