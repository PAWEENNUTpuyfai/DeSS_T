import type { Scenario } from "./Scenario";
import type { Configuration } from "./Configuration";

export interface ProjectSimulationRequest {
  project_id: string;
  configuration: Configuration;
  scenario: Scenario;
  time_periods: string;
  time_slot: string;
}
