import pprint

import salabim as sim
from app.services.simulation_time import TimeContext, parse_hour_min

def build_simulation_config(req):
    time_ctx = TimeContext(req.time_period,req.time_slot)

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
    dwell_time={
        "door_open_time": 0.1,   
        "door_close_time": 0.1,  
        "boarding_time": 0.05,   
        "alighting_time": 0.04   
    }
    config = {
        "STATION_LIST": req.configuration_data.station_list,
        "TIME_CTX": time_ctx,
        "TRAVEL_TIMES": travel_times,
        "TRAVEL_DISTANCES": route_distances,
        "BUS_ROUTES": bus_routes,
        "BUS_INFO": bus_info,
        "BUS_SCHEDULES": bus_schedules,
        "INTERARRIVAL_RULES": interarrival_rules,
        "ALIGHTING_RULES": alighting_rules,
        "DWELL_TIME":dwell_time
    }

    # text_dump = pprint.pformat(config, depth=4, width=120)

    # with open("simulation_config.txt", "w", encoding="utf-8") as f:
    #     f.write("===== SIMULATION CONFIG DUMP =====\n")
    #     f.write(text_dump)
    #     f.write("\n=================================\n")

    return config


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


def build_distribution(name: str, args: str):
    params = dict(kv.strip().split("=") for kv in args.split(","))
    params = {k: float(v) for k, v in params.items()}

    name = name.strip().lower()

    # =====================================================
    # CONSTANT
    # =====================================================
    if name == "constant":
        if "value" not in params:
            raise ValueError("Constant requires value")
        return sim.Constant(params["value"])

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

    # =====================================================
    # UNIFORM
    # =====================================================
    if name == "uniform":
        low = params.get("low", params.get("min"))
        high = params.get("high", params.get("max"))
        loc = params.get("loc", 0.0)

        if low is None or high is None:
            raise ValueError("Uniform requires low/high or min/max")

        if high < low:
            raise ValueError("Uniform requires high >= low")

        # (ยังคงไว้เพื่อ backward compatibility)
        if high == low:
            return sim.Constant(low + loc)

        dist = sim.Uniform(low, high)
        return dist + loc if loc != 0.0 else dist

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

        for rec in simdata.records:
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
            # km/h → m/s
            "speed": info.bus_speed * 1000 / 3600,

            # km → m
            "max_distance": info.max_distance * 1000,

            "max_bus": info.max_bus,
            "capacity": info.bus_capacity,
            #minutes to seconds
            "avg_travel_time": info.avg_travel_time *60
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

def build_travel_times(
    bus_routes,
    travel_times_ideal,
    travel_distances,
    bus_info
):
    travel_times = {}

    for route_id, stations in bus_routes.items():
        avg_time = bus_info.get(route_id, {}).get("avg_travel_time", 0)

        travel_times[route_id] = {}

        # ----------------------------------
        # สร้าง list ของ segment จาก key เดิม
        # ----------------------------------
        segments = []
        total_distance = 0.0

        for i in range(len(stations) - 1):
            key = (stations[i], stations[i + 1])

            # ❗ ใช้ key เดิมเป็นหลัก
            if key not in travel_times_ideal:
                raise KeyError(
                    f"Route {route_id} missing travel_time for {key}"
                )

            if avg_time and avg_time > 0:
                dist = travel_distances[key]
                segments.append((key, dist))
                total_distance += dist
            else:
                # ไม่มี avg_travel_time → ใช้ของเดิมทันที
                travel_times[route_id][key] = travel_times_ideal[key]

        # ----------------------------------
        # ถ้าไม่มี avg_travel_time → จบ route นี้
        # ----------------------------------
        if not avg_time or avg_time <= 0:
            continue

        if total_distance <= 0:
            raise ValueError(
                f"Total distance is zero for route {route_id}"
            )

        # ----------------------------------
        # แจกเวลาใหม่ตามสัดส่วน distance
        # ----------------------------------
        for key, dist in segments:
            travel_times[route_id][key] = (
                dist / total_distance
            ) * avg_time

    return travel_times

def build_route_distances(bus_routes, distances):
    route_distances = {}

    for route_id, stations in bus_routes.items():
        route_distances[route_id] = {}

        for i in range(len(stations) - 1):
            key = (stations[i], stations[i + 1])

            if key not in distances:
                raise KeyError(
                    f"Missing distance for {key} in route {route_id}"
                )

            route_distances[route_id][key] = distances[key]

    return route_distances
