import pprint
from app.services.simulation_time import TimeContext
from app.services.simulation_mapper import (
    map_route_pairs,
    map_bus_routes,
    map_bus_information,
    build_travel_times,
    build_route_distances,
    map_bus_schedules,
)


def build_discrete_simulation_config(req):
    """
    Build configuration for discrete simulation from request.
    
    Reuses most of the existing configuration building logic,
    but includes the day template for passenger arrivals.
    """
    time_ctx = TimeContext(req.time_period, req.time_slot)

    travel_times_ideal, distances = map_route_pairs(
        req.configuration_data.route_pair
    )

    bus_routes = map_bus_routes(
        req.scenario_data,
        req.configuration_data.route_pair
    )

    bus_info = map_bus_information(req.scenario_data)

    travel_times = build_travel_times(
        bus_routes,
        travel_times_ideal,
        distances,
        bus_info
    )

    route_distances = build_route_distances(
        bus_routes,
        distances
    )

    bus_schedules = map_bus_schedules(
        req.scenario_data,
        time_ctx
    )

    dwell_time = {
        "door_open_time": 0.05,
        "door_close_time": 0.05,
        "boarding_time": 0.025,
        "alighting_time": 0.025
    }

    config = {
        "STATION_LIST": req.configuration_data.station_list,
        "TIME_CTX": time_ctx,
        "TRAVEL_TIMES": travel_times,
        "TRAVEL_DISTANCES": route_distances,
        "BUS_ROUTES": bus_routes,
        "BUS_INFO": bus_info,
        "BUS_SCHEDULES": bus_schedules,
        "DAY_TEMPLATE": req.day_template,  # 👈 Key difference: day template instead of distributions
        "USE_DWELL_TIME": False,
        "DWELL_TIME": dwell_time
    }

    return config
