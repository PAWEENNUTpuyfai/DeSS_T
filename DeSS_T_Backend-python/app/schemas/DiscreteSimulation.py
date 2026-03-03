from __future__ import annotations
from typing import List, Dict
from pydantic import BaseModel, Field


# ===========================
# Input Schemas
# ===========================

class PassengerArrival(BaseModel):
    """A single passenger arrival event at a station"""
    station_name: str = Field(..., alias="station_name")
    arrival_time: str = Field(..., alias="arrival_time")  # Format: "HH:MM:SS" or minutes from start


class DayTemplate(BaseModel):
    """Template defining all passenger arrivals for a simulation day"""
    arrivals: List[PassengerArrival] = Field(..., alias="arrivals")


class DiscreteSimulationRequest(BaseModel):
    """Request for discrete event simulation"""
    time_period: str = Field(..., alias="time_period")  # e.g., "08:00-20:00"
    time_slot: int = Field(..., alias="time_slot")  # minutes
    day_template: DayTemplate = Field(..., alias="day_template")
    configuration_data: 'ConfigurationData' = Field(..., alias="configuration_data")
    scenario_data: List['ScenarioData'] = Field(..., alias="scenario_data")


# Re-use from existing schemas
from app.schemas.Simulation import (
    ConfigurationData,
    ScenarioData,
    RouteBusInformation,
    RouteSchedule,
)


# ===========================
# Output Schemas
# ===========================

class DiscreteResultStation(BaseModel):
    """Results for a single station"""
    station_name: str
    average_waiting_time: float
    average_queue_length: float
    min_waiting_time: float
    max_waiting_time: float
    passengers_count: int


class DiscreteResultRoute(BaseModel):
    """Results for a single route"""
    route_id: str
    average_utilization: float
    average_travel_time: float
    average_travel_distance: float
    average_waiting_time: float
    average_queue_length: float
    customers_count: int
    min_waiting_time: float
    max_waiting_time: float


class DiscreteResultSummary(BaseModel):
    """Overall summary metrics"""
    average_waiting_time: float
    average_queue_length: float
    average_utilization: float
    average_travel_time: float
    average_travel_distance: float
    total_passengers: int
    min_waiting_time: float
    max_waiting_time: float


class DiscreteSimulationResult(BaseModel):
    """Complete simulation result"""
    result_summary: DiscreteResultSummary
    result_station: List[DiscreteResultStation]
    result_route: List[DiscreteResultRoute]


class SimulationLog(BaseModel):
    """Simulation event log entry"""
    time: str
    component: str
    message: str


class DiscreteSimulationResponse(BaseModel):
    """Response from discrete simulation"""
    result: str  # "success" or "failed"
    simulation_result: DiscreteSimulationResult
    logs: List[SimulationLog]
