import type { DataFitResponse } from "./DistriButionFitModel";
import type { NetworkModel } from "./Network";

export interface Configuration {
  Network_model: NetworkModel;
  Alighting_Distribution: DataFitResponse;
  Interarrival_Distribution: DataFitResponse;
}