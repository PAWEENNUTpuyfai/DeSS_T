import salabim as sim
from app.services.simulation_time import TimeContext, parse_hour_min

def build_simulation_config(req):
    time_ctx = TimeContext(req.time_period,req.time_slot)

    travel_times, distances = map_route_pairs(
        req.configuration_data.route_pair
    )

    bus_routes = map_bus_routes(
        req.scenario_data,
        req.configuration_data.route_pair
    )

    bus_info = map_bus_information(req.scenario_data)

    interarrival_rules = map_time_based_distributions(
        req.configuration_data.interarrival_data,
        time_ctx
    )

    alighting_rules = map_time_based_distributions(
        req.configuration_data.alighting_data,
        time_ctx
    )

    bus_schedules = map_bus_schedules(
        req.scenario_data,
        time_ctx
    )

    return {
        "STATION_LIST": req.configuration_data.station_list,
        "TIME_CTX": time_ctx,
        "TRAVEL_TIMES": travel_times,
        "TRAVEL_DISTANCES": distances,
        "BUS_ROUTES": bus_routes,
        "BUS_INFO": bus_info,
        "BUS_SCHEDULES": bus_schedules,
        "INTERARRIVAL_RULES": interarrival_rules,
        "ALIGHTING_RULES": alighting_rules
    }


# Example structure of the returned config:
# {
#     "TRAVEL_TIMES": {
#         "R1": {
#             ("A", "B"): 5,
#             ("B", "C"): 8,
#             ("C", "D"): 6
#        },
#        "R2": {
#            ("X", "Y"): 7,
#            ("Y", "Z"): 9
#        }
#    },


#     "BUS_ROUTES": {
#         "R1": ["A", "B", "C"]
#     },

#     "INTERARRIVAL_RULES": {
#         ("A", 360, 540): sim.Poisson(5)
#     },

#     "ALIGHTING_RULES": {
#         ("B", 360, 540): sim.Exponential(5.0)
#     },
#      BUS_INFO = {
#         "R1": {
#             "speed": 40,
#             "max_distance": 200,
#             "max_bus": 5,
#             "capacity": 40
#         }
#     }
# }
#
def map_route_pairs(route_pairs):
    travel_times = {}
    distances = {}

    for rp in route_pairs:
        key = (rp.fst_station, rp.snd_station)

        if key in travel_times:
            raise ValueError(f"Duplicate route pair {key}")

        travel_times[key] = rp.travel_time
        distances[key] = rp.distance

    return travel_times, distances

def map_bus_routes(scenarios, route_pairs):
    pair_map = {rp.route_pair_id: rp for rp in route_pairs}
    bus_routes = {}

    for sc in scenarios:
        order = sc.route_order.split("$")
        stations = []

        for pid in order:
            rp = pair_map[pid]
            if not stations:
                stations.append(rp.fst_station)
            stations.append(rp.snd_station)

        bus_routes[sc.route_id] = stations

    return bus_routes


# def build_distribution(name: str, args: str):
#     params = dict(kv.split("=") for kv in args.split(","))
#     params = {k: float(v) for k, v in params.items()}

#     name = name.lower()

#     if name == "poisson":
#         return sim.Poisson(params["lambda"])

#     if name == "exponential":
#         return sim.Exponential(1 / params["rate"])

#     raise ValueError(f"Unsupported distribution: {name}")

def build_distribution(name: str, args: str):
    # แปลง "k=v, k=v" -> dict
    params = dict(kv.strip().split("=") for kv in args.split(","))
    params = {k: float(v) for k, v in params.items()}

    name = name.strip().lower()

    if name == "poisson":
        return sim.Poisson(params["lambda"])

    if name == "exponential":
        rate = params["rate"]
        loc = params.get("loc", 0.0)

        dist = sim.Exponential(1.0 / rate)
        return dist + loc if loc != 0.0 else dist

    if name == "weibull":
        shape = params["shape"]
        scale = params["scale"]
        loc = params.get("loc", 0.0)

        dist = sim.Weibull(shape=shape, scale=scale)
        return dist + loc if loc != 0.0 else dist

    if name == "gamma":
        shape = params["shape"]
        scale = params["scale"]
        loc = params.get("loc", 0.0)

        dist = sim.Gamma(shape=shape, scale=scale)
        return dist + loc if loc != 0.0 else dist

    # if name == "lognormal":
    #     shape = params["shape"]
    #     scale = params["scale"]
    #     loc = params.get("loc", 0.0)

    #     dist = sim.Lognormal(shape=shape, scale=scale)
    #     return dist + loc if loc != 0.0 else dist

    raise ValueError(f"Unsupported distribution: {name}")


def parse_time_range(tr: str):
    start, end = tr.split("-")
    h1, m1 = map(int, start.split("."))
    h2, m2 = map(int, end.split("."))

    return h1 * 60 + m1, h2 * 60 + m2

def map_time_based_distributions(simdata_list, time_ctx):
    rules = {}

    for simdata in simdata_list:
        t0, t1 = time_ctx.range_to_sim(simdata.time_range)

        for rec in simdata.alighting_records:
            rules[(rec.station, t0, t1)] = \
                build_distribution(
                    rec.distribution,
                    rec.argument_list
                )
    return rules

def map_bus_information(scenarios):
    bus_info = {}

    for sc in scenarios:
        info = sc.bus_information
        bus_info[sc.route_id] = {
            "speed": info.bus_speed,
            "max_distance": info.max_distance,
            "max_bus": info.max_bus,
            "capacity": info.bus_capacity
        }

    return bus_info

def map_bus_schedules(scenarios, time_ctx):
    schedules = {}

    for sc in scenarios:
        times = []
        for rs in sc.route_schedule:
            real = parse_hour_min(rs.departure_time)
            times.append(time_ctx.to_sim(real))

        schedules[sc.route_id] = sorted(times)

    return schedules
