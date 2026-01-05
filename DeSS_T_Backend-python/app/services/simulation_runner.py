from app.services.simulation_mapper import build_simulation_config
from app.services.simulation_engine import SimulationEngine


def run_simulation(req):
    config = build_simulation_config(req)
    engine = SimulationEngine(config)
    result = engine.run()

    return result