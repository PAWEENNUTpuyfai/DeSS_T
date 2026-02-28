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
        "INTERARRIVAL_RULES": interarrival_rules,
        "ALIGHTING_RULES": alighting_rules,
        "USE_DWELL_TIME": True,
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


# --- แก้ไข build_distribution ---
def build_distribution(name: str, args: str): # เอา env ออกจาก parameter ตรงนี้
    params = dict(kv.strip().split("=") for kv in args.split(","))
    params = {k: float(v) for k, v in params.items()}
    name = name.strip().lower()

    # เปลี่ยนเป็น return lambda เพื่อไปสร้างจริงใน SimulationEngine
    if name == "constant":
        return lambda env: sim.Constant(params["value"], env=env)

    if name == "poisson":
        return lambda env: sim.Poisson(params["lambda"], env=env)

    if name == "exponential":
        return lambda env: sim.Exponential(1.0 / params["rate"], env=env) + params.get("loc", 0.0)

    if name == "weibull":
        return lambda env: sim.Weibull(shape=params["shape"], scale=params["scale"], env=env) + params.get("loc", 0.0)

    if name == "gamma":
        return lambda env: sim.Gamma(shape=params["shape"], scale=params["scale"], env=env) + params.get("loc", 0.0)

    if name == "uniform":
        low = params.get("low", params.get("min"))
        high = params.get("high", params.get("max"))
        return lambda env: sim.Uniform(low, high, env=env) + params.get("loc", 0.0)

    return lambda env: sim.Constant(999999, env=env)


def parse_time_range(tr: str):
    start, end = tr.split("-")
    h1, m1 = map(int, start.split("."))
    h2, m2 = map(int, end.split("."))

    return h1 * 60 + m1, h2 * 60 + m2

# --- แก้ไข map_time_based_distributions ---
def map_time_based_distributions(simdata_list, time_ctx):
    rules = {}
    for simdata in simdata_list:
        t0, t1 = time_ctx.range_to_sim(simdata.time_range)
        for rec in simdata.records:
            dist_name = rec.distribution.strip().lower()
            if dist_name == "no arrival": continue
            
            # ตรงนี้ไม่ต้องส่ง env เข้าไป เพราะ build_distribution จะคืนค่าเป็น lambda
            dist_factory = build_distribution(rec.distribution, rec.argument_list)
            rules[(rec.station, t0, t1)] = dist_factory 
            
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
        # 1. ดึงข้อมูลพื้นฐานจาก bus_info
        info = bus_info.get(route_id, {})
        speed_m_per_s = info.get("speed", 0)           # ความเร็ว (m/s)
        avg_total_time_sec = info.get("avg_travel_time", 0) # เวลาเฉลี่ยรวมทั้งสาย (seconds)

        travel_times[route_id] = {}
        
        # 2. คำนวณระยะทางรวมของสาย (สำหรับใช้แบ่งสัดส่วน avg_travel_time)
        total_distance = 0.0
        route_segments = []
        for i in range(len(stations) - 1):
            key = (stations[i], stations[i + 1])
            if key not in travel_distances:
                raise KeyError(f"Route {route_id} missing distance for {key}")
            
            dist = travel_distances[key]
            route_segments.append((key, dist))
            total_distance += dist

        # 3. คำนวณเวลาเดินทางของแต่ละ Segment
        for key, dist_m in route_segments:
            candidates = []

            # --- แบบที่ 1: คำนวณจาก Speed ---
            if speed_m_per_s > 0:
                time_from_speed = dist_m / speed_m_per_s
                candidates.append(time_from_speed)

            # --- แบบที่ 2: คำนวณจาก Average Travel Time (เฉลี่ยตามระยะทาง) ---
            if avg_total_time_sec > 0 and total_distance > 0:
                time_from_avg = (dist_m / total_distance) * avg_total_time_sec
                candidates.append(time_from_avg)

            # --- แบบที่ 3: ค่าจาก Database (Ideal Time) ---
            if key in travel_times_ideal:
                candidates.append(travel_times_ideal[key])

            # --- การเปรียบเทียบเพื่อเลือกค่าที่มากที่สุด ---
            if not candidates:
                raise ValueError(f"No travel time data available for route {route_id} segment {key}")
            
            # เลือกค่าที่มากที่สุดตามเงื่อนไข (ค่าที่มากกว่าหมายถึงเดินทางช้ากว่า/ปลอดภัยกว่าในการคำนวณ)
            travel_times[route_id][key] = max(candidates)

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
