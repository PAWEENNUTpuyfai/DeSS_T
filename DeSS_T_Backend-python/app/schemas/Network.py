from pydantic import BaseModel
from typing import List, Tuple


class GeoPoint(BaseModel):
    type: str
    coordinates: Tuple[float, float]


class GeoLineString(BaseModel):
    type: str
    coordinates: List[Tuple[float, float]]


class RouteBetween(BaseModel):
    RouteBetweenID: str
    TravelTime: float
    Route: GeoLineString
    Distance: float


class StationDetail(BaseModel):
    StationID: str
    StationName: str
    location: GeoPoint
    Lat: str
    Lon: str


class StationPair(BaseModel):
    FstStation: str
    SndStation: str
    RouteBetween: RouteBetween


class NetworkModel(BaseModel):
    Network_model: str
    Station_detail: List[StationDetail]
    StationPair: List[StationPair]

