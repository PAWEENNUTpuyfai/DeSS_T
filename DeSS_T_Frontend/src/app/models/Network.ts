// ------------------- NETWORK MODEL --------------------
export interface NetworkModel {
  network_model_id?: string;
  Network_model?: string; // API field (not stored in DB)
  StationPair?: StationPair[]; // matches Go json:"StationPair"
  Station_detail?: StationDetail[]; // matches Go json:"Station_detail"
}

// ------------------- STATION DETAIL --------------------
export interface StationDetail {
  station_detail_id?: string; // Go json:"station_detail_id"
  StationID?: string; // Go json:"StationID"
  name?: string; // Go json:"name"
  StationName?: string; // Go json:"StationName"
  Location?: GeoPoint; // Go json:"Location"
  lat?: number; // Go json:"lat"
  lon?: number; // Go json:"lon"
  station_id_osm?: string; // Go json:"station_id_osm"
}

// ------------------- STATION PAIR --------------------
export interface StationPair {
  StationPairID: string; // Go json:"StationPairID"
  FstStation: string; // Go json:"FstStation"
  SndStation: string; // Go json:"SndStation"
  route_between_id: string; // Go json:"route_between_id"
  network_model_id: string; // Go json:"network_model_id"
  RouteBetween?: RouteBetween; // Go json:"RouteBetween"
}

// ------------------- ROUTE BETWEEN --------------------
export interface RouteBetween {
  RouteBetweenID: string; // Go json:"RouteBetweenID"
  TravelTime: number; // Go json:"TravelTime"
  Distance: number; // Go json:"Distance"
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
