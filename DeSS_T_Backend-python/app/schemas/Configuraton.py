from pydantic import BaseModel
from app.schemas.Network import NetworkModel
from app.schemas.calculation import DataFitResponse

class Configuration(BaseModel):
    Network_model: NetworkModel
    Alighting_Distribution: DataFitResponse
    Interarrival_Distribution: DataFitResponse