from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, Field

from app.schemas.Simulation import SimulationRequest
from app.schemas.DiscreteSimulation import DayTemplate


class CombinedSimulationRequest(BaseModel):
    """
    Request for running both regular simulation and discrete simulation together.
    
    Modes:
    - Guest Mode: No user_id, day_template in each request
    - Login Mode: user_id provided, day_template saved to file and reused
    
    - Runs standard distribution-based simulation
    - Runs discrete event simulation with day template (from request or saved file)
    - In login mode: persists day_template and loads for subsequent runs
    - Saves discrete simulation results to JSON file
    """
    # Regular simulation config
    time_period: str = Field(..., alias="time_period")  # e.g., "08:00-20:00"
    time_slot: int = Field(..., alias="time_slot")
    configuration_data: 'ConfigurationData' = Field(..., alias="configuration_data")
    scenario_data: List['ScenarioData'] = Field(..., alias="scenario_data")
    
    # User authentication (optional - if provided, login mode enabled)
    user_id: Optional[str] = Field(None, alias="user_id")  # user google_id for login mode
    
    # Discrete simulation config (optional, but usually provided)
    day_template: Optional[DayTemplate] = Field(None, alias="day_template")
    
    # Optional: filename for saving discrete simulation results
    # If not provided, generates one with timestamp
    output_filename: Optional[str] = Field(None, alias="output_filename")


# Re-use from existing schemas
from app.schemas.Simulation import (
    ConfigurationData,
    ScenarioData,
)


class SimulationFile(BaseModel):
    """Information about saved simulation file"""
    filename: str
    path: str
    size: int
    created_at: str


class CombinedSimulationResponse(BaseModel):
    """Response from combined simulation containing both results"""
    result: str  # "success" or "failed"
    
    # Regular simulation result
    regular_simulation: 'SimulationResult' = Field(..., alias="regular_simulation")
    
    # Discrete simulation result
    discrete_simulation: Optional['DiscreteSimulationResult'] = Field(
        None, 
        alias="discrete_simulation"
    )
    
    # File information if discrete simulation was saved
    saved_file: Optional[SimulationFile] = Field(
        None,
        alias="saved_file"
    )
    
    # Combined logs from both simulations
    logs: List['SimulationLog'] = Field(..., alias="logs")


# Import result types
from app.schemas.Simulation import (
    SimulationResult,
    SimulationLog,
)

from app.schemas.DiscreteSimulation import (
    DiscreteSimulationResult,
)
