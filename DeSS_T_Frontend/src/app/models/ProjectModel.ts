import type { ScenarioDetail } from "./Scenario";
import type { ConfigurationDetail } from "./Configuration";
import type {
  PublicScenario,
  UserScenario,
  PublicConfiguration,
  UserConfiguration,
  CoverImageProject,
  CoverImageConf,
  User,
} from "./User";

// Re-export types from User.ts for convenience
export type {
  PublicScenario,
  UserScenario,
  PublicConfiguration,
  UserConfiguration,
  CoverImageProject,
  CoverImageConf,
  User,
};

// ------------------- PROJECT SIMULATION REQUEST --------------------
export interface ProjectSimulationRequest {
  project_id: string;
  configuration: ConfigurationDetail;
  scenario: ScenarioDetail;
  time_periods: string;
  time_slot: string;
}
