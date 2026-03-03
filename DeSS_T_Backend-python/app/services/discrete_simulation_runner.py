from app.services.discrete_simulation_mapper import build_discrete_simulation_config
from app.services.discrete_simulation_engine import DiscreteSimulationEngine


def run_discrete_simulation(req):
    """
    Run a discrete event simulation based on a day template.
    
    Args:
        req: DiscreteSimulationRequest containing:
            - time_period: simulation time range
            - time_slot: slot duration
            - day_template: specific passenger arrival times
            - configuration_data: stations, routes, route pairs
            - scenario_data: bus schedules and info
    
    Returns:
        DiscreteSimulationResponse with results
    """
    config = build_discrete_simulation_config(req)
    engine = DiscreteSimulationEngine(config)
    result = engine.run()

    return result
