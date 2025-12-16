export interface NetworkModel {
  Network_model: string;
  Station_detail: StationDetail[];
  StationPair: StationPair[];
}

export type LatLng = [number, number];

export interface StationDetail {
  StationID: string;
  StationName: string;
  Location: GeoPoint;
  location?: GeoPoint;  // fallback lowercase
  Lat?: string;
  Lon?: string;
}

export interface GeoPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface StationPair {
  FstStation: string;
  SndStation: string;
  RouteBetween: RouteBetween;
}

export interface RouteBetween {
  RouteBetweenID: string;
  TravelTime: number;
  Route: GeoLineString;
  Distance: number;
}

export interface GeoLineString {
  type: "LineString";
  coordinates: [number, number][];
}