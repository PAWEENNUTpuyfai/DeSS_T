from pydantic import BaseModel
from typing import List, Tuple

class OrderPath(BaseModel):
    OrderID: str
    OrderNumber: int
    StationPair: str


class RoutePath(BaseModel):
    RoutePathID: str
    RoutePathName: str
    RoutePathColor: str
    Order: List[OrderPath]


class RouteScenario(BaseModel):
    RouteScenarioID: str
    RoutePath: List[RoutePath]


# ─────────────── Bus Scenario ───────────────

class BusSchedule(BaseModel):
    BusScheduleID: str
    RoutePathID: str


class BusInformation(BaseModel):
    BusInformationID: str
    BusSpeed: float
    MaxDistance: float
    MaxBus: int
    BusCapacity: int


class BusScenario(BaseModel):
    BusScenarioID: str
    BusSchedule: List[BusSchedule]
    BusInformation: List[BusInformation]


# ─────────────── Main Scenario ───────────────

class Scenario(BaseModel):
    RouteScenario: List[RouteScenario]
    BusScenario: List[BusScenario]
