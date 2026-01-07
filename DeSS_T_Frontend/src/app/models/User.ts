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
  public_scenarios?: any[]; // Reference to PublicScenario
  user_scenarios?: any[]; // Reference to UserScenario
  user_configurations?: any[]; // Reference to UserConfiguration
  public_configurations?: any[]; // Reference to PublicConfiguration
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
  cover_img: string;
  scenario_detail: string;
  cover_image?: CoverImageProject;
  scenario_detail_obj?: any; // Reference to ScenarioDetail from Scenario.ts
}

// ------------------- USER SCENARIO --------------------
export interface UserScenario {
  user_scenario_id: string;
  name: string;
  modify_date: string; // ISO date string
  create_by: string;
  cover_img: string;
  scenario_detail: string;
  cover_image?: CoverImageProject;
  scenario_detail_obj?: any; // Reference to ScenarioDetail from Scenario.ts
}

// ------------------- USER CONFIGURATION --------------------
export interface UserConfiguration {
  user_configuration_id: string;
  name: string;
  modify_date: string; // ISO date string
  create_by: string;
  cover_img: string;
  configuration_detail: string;
  cover_image?: CoverImageConf;
  configuration_detail_obj?: any; // Reference to ConfigurationDetail from Configuration.ts
}

// ------------------- PUBLIC CONFIGURATION --------------------
export interface PublicConfiguration {
  public_configuration_id: string;
  name: string;
  description: string;
  modify_date: string; // ISO date string
  publish_date: string; // ISO date string
  cover_img: string;
  create_by: string;
  publish_by: string;
  origin_from: string;
  configuration_detail: string;
  cover_image?: CoverImageConf;
  configuration_detail_obj?: any; // Reference to ConfigurationDetail from Configuration.ts
}
