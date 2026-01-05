from __future__ import annotations
from typing import List
from pydantic import BaseModel, Field


class RouteSchedule(BaseModel):
    departure_time: str = Field(..., alias="departure_time")


class RouteBusInformation(BaseModel):
    bus_speed: float = Field(..., alias="bus_speed")
    max_distance: float = Field(..., alias="max_distance")
    max_bus: int = Field(..., alias="max_bus")
    bus_capacity: int = Field(..., alias="bus_capacity")


class ScenarioData(BaseModel):
    route_id: str = Field(..., alias="route_id")
    route_name: str = Field(..., alias="route_name")
    route_order: str = Field(..., alias="route_order")
    route_schedule: List[RouteSchedule] = Field(..., alias="route_schedule")
    bus_information: RouteBusInformation = Field(..., alias="bus_information")

class station(BaseModel):
    station_id: str = Field(..., alias="station_id")
    station_name: str = Field(..., alias="station_name")

class RoutePair(BaseModel):
    route_pair_id: str = Field(..., alias="route_pair_id")
    fst_station: str = Field(..., alias="fst_station")
    snd_station: str = Field(..., alias="snd_station")
    travel_time: float = Field(..., alias="travel_time")
    distance: float = Field(..., alias="distance")


class DisRecord(BaseModel):
    station: str = Field(..., alias="station")
    distribution: str = Field(..., alias="Distribution")
    argument_list: str = Field(..., alias="ArgumentList")


class SimData(BaseModel):
    time_range: str = Field(..., alias="time_range")
    alighting_records: List[DisRecord] = Field(..., alias="alighting_records")


class ConfigurationData(BaseModel):
    station_list: List[station] = Field(..., alias="station_list")
    route_pair: List[RoutePair] = Field(..., alias="route_pair")
    alighting_data: List[SimData] = Field(..., alias="alighting_data")
    interarrival_data: List[SimData] = Field(..., alias="interarrival_data")


class SimulationRequest(BaseModel):
    time_period: str = Field(..., alias="time_period")
    time_slot: int = Field(..., alias="time_slot")
    configuration_data: ConfigurationData = Field(..., alias="configuration_data")
    scenario_data: List[ScenarioData] = Field(..., alias="scenario_data")


class SimulationLog(BaseModel):
    time: str
    component: str
    message: str


class SimulationResponse(BaseModel):
    result: str
    simulation_result: SimulationResult
    logs: List[SimulationLog]

class SimulationResult(BaseModel):
    result_summary: ResultSummary
    slot_results: List[SimulationSlotResult]
    
class SimulationSlotResult(BaseModel):
    slot_name: str
    result_total_station: TotalStation
    result_station: List[ResultStation]
    result_route: List[ResultRoute]

class ResultSummary(BaseModel):
    average_waiting_time: float
    average_queue_length: float
    average_utilization: float
    average_travel_time: float
    average_travel_distance: float

class TotalStation(BaseModel):
    average_waiting_time: float
    average_queue_length: float

class ResultStation(BaseModel):
    station_name: str
    average_waiting_time: float
    average_queue_length: float

class ResultRoute(BaseModel):
    route_id: str
    average_utilization: float
    average_travel_time: float
    average_travel_distance: float
    average_waiting_time: float
    average_queue_length: float
    customers_count: int