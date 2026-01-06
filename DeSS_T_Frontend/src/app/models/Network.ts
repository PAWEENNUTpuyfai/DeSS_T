// ------------------- NETWORK MODEL --------------------
export interface NetworkModel {
  network_model_id: string;
  station_pairs?: StationPair[];
}

// ------------------- STATION DETAIL --------------------
export interface StationDetail {
  station_detail_id: string;
  name: string;
  location: string; // GeoJSON as string: "type:geometry(POINT,4326)"
  lat: number;
  lon: number;
  station_id_osm: string;
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
