import type { ScenarioDetail } from "./Scenario";
import type { ConfigurationDetail } from "./Configuration";

// ------------------- USER --------------------
export interface User {
  google_id: string;
  name: string;
  email: string;
  picture_url: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string; // ISO date string
  last_login: string; // ISO date string
  created_at: string; // ISO date string
  public_scenarios?: PublicScenario[];
  user_scenarios?: UserScenario[];
  user_configurations?: UserConfiguration[];
  public_configurations?: PublicConfiguration[];
}

// ------------------- COVER IMAGE --------------------
export interface CoverImageProject {
  cover_image_pro_id: string;
  path_file: string;
}

export interface CoverImageConf {
  cover_image_conf_id: string;
  path_file: string;
}

// ------------------- PUBLIC SCENARIO --------------------
export interface PublicScenario {
  public_scenario_id: string;
  name: string;
  description: string;
  modify_date: string; // ISO date string
  publish_date: string; // ISO date string
  create_by: string;
  publish_by: string;
  origin_from: string;
  cover_img_id: string;
  scenario_detail_id: string;
  cover_image?: CoverImageProject;
  scenario_detail?: ScenarioDetail;
}

// ------------------- USER SCENARIO --------------------
export interface UserScenario {
  user_scenario_id: string;
  name: string;
  modify_date: string; // ISO date string
  create_by: string;
  cover_img_id: string;
  scenario_detail_id: string;
  cover_image?: CoverImageProject;
  scenario_detail?: ScenarioDetail;
}

// ------------------- USER CONFIGURATION --------------------
export interface UserConfiguration {
  user_configuration_id: string;
  name: string;
  modify_date: string; // ISO date string
  create_by: string;
  cover_img_id: string;
  configuration_detail_id: string;
  cover_image?: CoverImageConf;
  configuration_detail?: ConfigurationDetail;
}

// ------------------- PUBLIC CONFIGURATION --------------------
export interface PublicConfiguration {
  public_configuration_id: string;
  name: string;
  description: string;
  modify_date: string; // ISO date string
  publish_date: string; // ISO date string
  cover_img_id: string;
  create_by: string;
  publish_by: string;
  origin_from: string;
  configuration_detail_id: string;
  cover_image?: CoverImageConf;
  configuration_detail?: ConfigurationDetail;
}
