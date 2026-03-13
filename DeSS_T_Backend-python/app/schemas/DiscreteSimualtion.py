from __future__ import annotations
from typing import Any, List
from pydantic import BaseModel, Field
from .Simulation import RoutePair, SimData, ScenarioData, RouteSchedule, RouteBusInformation, station        

# --- Models ที่แปลงมาจาก Go Package Models ---

class ArrivalTimeEntry(BaseModel):
    date: str = Field(..., alias="date")
    arrival_times: List[str] = Field(..., alias="ArrivalTimes")

class ArrivalList(BaseModel):
    station_id: str = Field(..., alias="stationid")
    arrival_time_data: List[ArrivalTimeEntry] = Field(..., alias="ArrivalTimeData")

class DiscreteSimulation(BaseModel):
    configuration_detail_id: str = Field(..., alias="configuration_detail_id")
    arrival_list: List[ArrivalList] = Field(..., alias="arrival_list")

class DiscreteConfigurationData(BaseModel):
    station_list: List[station] = Field(..., alias="station_list")
    route_pair: List[RoutePair] = Field(..., alias="route_pair")
    alighting_sim_data: List[SimData] = Field(..., alias="alighting_data")
    arrival_list: List[ArrivalList] = Field(..., alias="arrival_list")

class DiscreteSimulationRequest(BaseModel):
    time_periods: str = Field(..., alias="time_period")
    time_slot: int = Field(..., alias="time_slot")
    discrete_configuration_data: DiscreteConfigurationData = Field(..., alias="discrete_configuration_data")
    scenario_data: List[ScenarioData] = Field(..., alias="scenario_data")

class DiscreteSimulationResult(BaseModel):
    average_waiting_time: float = Field(..., alias="average_waiting_time")
    average_queue_length: float = Field(..., alias="average_queue_length")
    average_utilization: float = Field(..., alias="average_utilization")
    average_travel_time: float = Field(..., alias="average_travel_time")
    average_travel_distance: float = Field(..., alias="average_travel_distance")

class DiscreteSimulationResponse(BaseModel):
    result: str = Field("success")
    simulation_result: DiscreteSimulationResult
    logs: List[SimulationLog]

class SimulationLog(BaseModel):
    time: str
    component: str
    message: str
