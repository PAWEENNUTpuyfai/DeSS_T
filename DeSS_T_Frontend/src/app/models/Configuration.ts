import type { NetworkModel, StationDetail } from "./Network";

// ------------------- CONFIGURATION DETAIL --------------------
export interface ConfigurationDetail {
  configuration_detail_id: string;
  alighting_data_id: string;
  interarrival_data_id: string;
  network_model_id: string;
  network_model?: NetworkModel;
  alighting_datas?: AlightingData[];
  interarrival_datas?: InterArrivalData[];
}

// ------------------- ALIGHTING DATA --------------------
export interface AlightingData {
  alighting_data_id: string;
  time_period: string;
  distribution: string;
  argument_list: string;
  station_id: string;
  station_detail?: StationDetail;
}

// ------------------- INTER ARRIVAL DATA --------------------
export interface InterArrivalData {
  inter_arrival_data_id: string;
  time_period: string;
  distribution: string;
  argument_list: string;
  station_id: string;
  station_detail?: StationDetail;
}

// Legacy interface for backward compatibility
export interface Configuration {
  Network_model: NetworkModel;
  Alighting_Data: AlightingData[];
  InterArrival_Data: InterArrivalData[];
}
