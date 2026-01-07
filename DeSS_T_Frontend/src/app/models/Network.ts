// ------------------- NETWORK MODEL --------------------
export interface NetworkModel {
  network_model_id?: string;
  Network_model?: string; // backend uses this key
  station_pairs?: StationPair[];
  Station_detail?: StationDetail[]; // backend payload
  station_details?: StationDetail[]; // alternate casing
}

// ------------------- STATION DETAIL --------------------
// Keep fields optional to accommodate backend payload and frontend-enriched data.
export interface StationDetail {
  station_detail_id?: string;
  StationID?: string;
  name?: string;
  StationName?: string;
  station_name?: string;
  name_th?: string;
  location?: GeoPoint | { type?: string; coordinates?: [number, number] };
  Location?: GeoPoint | { type?: string; coordinates?: [number, number] };
  lat?: number | string;
  lon?: number | string;
  latitude?: number | string;
  longitude?: number | string;
  station_id_osm?: string;
}

// ------------------- STATION PAIR --------------------
export interface StationPair {
  station_pair_id: string;
  fst_station_id: string;
  snd_station_id: string;
  route_between_id: string;
  network_model_id: string;
  fst_station?: StationDetail;
  snd_station?: StationDetail;
  route_between?: RouteBetween;
}

// ------------------- ROUTE BETWEEN --------------------
export interface RouteBetween {
  route_between_id: string;
  travel_time: number;
  route: string; // GeoJSON as string: "type:geometry(LINESTRING,4326)"
  distance: number;
}

// ------------------- Helper Types --------------------
export type LatLng = [number, number];

export interface GeoPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface GeoLineString {
  type: "LineString";
  coordinates: [number, number][];
}
