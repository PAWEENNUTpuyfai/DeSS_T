export type LatLng = [number, number];

export interface BusStop {
  id: number;
  position: LatLng;
  name?: string;
}

export interface StationDetail {
  station_detail_id: string;
  name: string;
  lat: string;
  lon: string;
}

export interface RouteBetween {
  route_between_id: string;
  from_station: string;
  to_station: string;
  distance: number;
  travel_time: number;
  route: {
    type: "LineString";
    coordinates: [number, number][];
  };
}

export interface StationPair {
  station_pair_id: string;
  fst_station: string;
  snd_station: string;
  route_between: string;
  network_model: string;
}

export interface NetworkModel {
  network_model_id: string;
}

export interface NetworkGraph {
  nodes: StationDetail[];
  edges: RouteBetween[];
}
