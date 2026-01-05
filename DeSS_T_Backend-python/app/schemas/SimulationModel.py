from pydantic import BaseModel
from app.schemas.Scenario import Scenario
from app.schemas.Configuraton import Configuration

class SimulationModel(BaseModel):
    Scenario: Scenario
    Configuration: Configuration