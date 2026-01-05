import type{ Scenario } from "./Scenario";
import type { Configuration } from "./Configuration";

export interface SimulationModel {
  Scenario: Scenario;
  Configuration: Configuration;
}