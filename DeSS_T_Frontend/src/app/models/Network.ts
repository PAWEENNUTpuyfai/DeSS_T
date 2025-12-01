export interface StationDetail {
  station_detail_id: string;
  name: string;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  lat: string;
  lon: string;
}

export interface RouteBetween {
  route_between_id: string;
  travel_time: number;
  route: {
    type: "LineString";
    coordinates: [number, number][];
  };
  distance: number;
}

export interface StationPair {
  station_pair_id: string;
  fst_station: string;
  snd_station: string;
  route_between: string;
  network_model: string;
}

export interface InterArrivalData {
  inter_arrival_data_id: string;
  time_period: string;
  distribution_name: string;
  argument_list: string;
  station_id: string;
}

export interface AlightingData {
    alighting_data_id: string;
    time_period: string;
    distribution_name: string;
    argument_list: string;
    station_id: string;
}

export interface NetworkModel {
  network_model_id: string;
}
