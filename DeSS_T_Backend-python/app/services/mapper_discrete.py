import math
import random
import time
import salabim as sim
from app.services.simulation_logger import add_log, SimulationLogger
from app.schemas.DiscreteSimualtion import DiscreteSimulationResult, SimulationLog
from app.services.simulation_time import TimeContext, parse_hour_min

# ==========================================
# 1. Configuration Builder
# ==========================================

def build_discrete_simulation_config(req):
    config_data = req.discrete_configuration_data
    time_ctx = TimeContext(req.time_periods, req.time_slot)

    # 1. Map ID -> Name ของสถานี
    station_map = {st.station_id: st.station_name for st in config_data.station_list}

    # 2. Map Route Pairs (ใช้ UUID เป็น Key)
    travel_times_ideal, distances = map_route_pairs(config_data.route_pair)

    # 3. Map Bus Routes & Info
    bus_routes = map_bus_routes(req.scenario_data, config_data.route_pair)
    bus_info = map_bus_information(req.scenario_data)

    # 4. คำนวณ Travel Times 
    travel_times = build_travel_times(bus_routes, travel_times_ideal, distances, bus_info)
    route_distances = build_route_distances(bus_routes, distances)

    # 5. สร้าง Alighting Rules
    alighting_rules = map_alighting_distributions(config_data.alighting_sim_data, time_ctx)

    # 6. ดึงข้อมูลการมาถึงของคนแบบ "ครบทุกวัน" 
    discrete_arrivals_all_days = map_discrete_arrivals_all(config_data.arrival_list, time_ctx)

    # 7. Map ตารางเดินรถ
    bus_schedules = map_bus_schedules(req.scenario_data, time_ctx)

    # --- 🌟 ลบ Dwell Time ออกไปแล้ว ---

    config = {
        "STATION_MAP": station_map,
        "TIME_CTX": time_ctx,
        "TRAVEL_TIMES": travel_times,
        "TRAVEL_DISTANCES": route_distances,
        "BUS_ROUTES": bus_routes,
        "BUS_INFO": bus_info,
        "BUS_SCHEDULES": bus_schedules,
        "ALIGHTING_RULES": alighting_rules,
        "DISCRETE_ARRIVALS_ALL_DAYS": discrete_arrivals_all_days
        # ลบการ Config Dwell Time ทิ้ง
    }
    return config

# ----------------- Helper Functions -----------------
# (ใช้ Helper Functions ตัวเดิมของคุณได้เลย ไม่มีการเปลี่ยนแปลง)

def map_discrete_arrivals_all(arrival_list, time_ctx):
    all_arrivals = {}
    for station_data in arrival_list:
        st_id = station_data.station_id
        for day_data in station_data.arrival_time_data:
            date = day_data.date
            if date not in all_arrivals:
                all_arrivals[date] = {}
            if st_id not in all_arrivals[date]:
                all_arrivals[date][st_id] = []
                
            for t_str in day_data.arrival_times:
                real_min = parse_hour_min(t_str)
                sim_time = time_ctx.to_sim(real_min)
                if sim_time >= 0:
                    all_arrivals[date][st_id].append(sim_time)
                    
    for date in all_arrivals:
        for st_id in all_arrivals[date]:
            all_arrivals[date][st_id].sort()
            
    return all_arrivals

def map_discrete_arrivals(arrival_list, time_ctx, target_date):
    arrivals_by_station = {}
    for station_data in arrival_list:
        st_id = station_data.station_id
        sim_times = []
        for day_data in station_data.arrival_time_data:
            if day_data.date == target_date:
                for t_str in day_data.arrival_times:
                    real_min = parse_hour_min(t_str)
                    sim_time = time_ctx.to_sim(real_min)
                    sim_times.append(sim_time)
                break
        arrivals_by_station[st_id] = sorted(sim_times)
    return arrivals_by_station

def map_route_pairs(route_pairs):
    travel_times, distances = {}, {}
    for rp in route_pairs:
        key = (rp.fst_station, rp.snd_station)
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

def map_bus_information(scenarios):
    bus_info = {}
    for sc in scenarios:
        info = sc.bus_information
        bus_info[sc.route_id] = {
            "speed": info.bus_speed * 1000 / 3600,
            "max_distance": info.max_distance * 1000,
            "max_bus": info.max_bus,
            "capacity": info.bus_capacity,
            "avg_travel_time": info.avg_travel_time * 60
        }
    return bus_info

def map_bus_schedules(scenarios, time_ctx):
    schedules = {}
    for sc in scenarios:
        times = [time_ctx.to_sim(parse_hour_min(rs.departure_time)) for rs in sc.route_schedule]
        schedules[sc.route_id] = sorted(times)
    return schedules

def map_alighting_distributions(simdata_list, time_ctx):
    rules = {}
    for simdata in simdata_list:
        t0, t1 = time_ctx.range_to_sim(simdata.time_range)
        for rec in simdata.records:
            dist_name = rec.distribution.strip().lower()
            if dist_name == "no arrival": continue
            
            params = dict(kv.strip().split("=") for kv in rec.argument_list.split(","))
            params = {k: float(v) for k, v in params.items()}
            
            if dist_name == "poisson":
                dist_factory = lambda env, p=params: sim.Poisson(p["lambda"])
            elif dist_name == "constant":
                dist_factory = lambda env, p=params: sim.Constant(p["value"])
            else:
                dist_factory = lambda env: sim.Constant(0)

            rules[(rec.station, t0, t1)] = dist_factory 
    return rules

def build_travel_times(bus_routes, travel_times_ideal, travel_distances, bus_info):
    travel_times = {}
    for route_id, stations in bus_routes.items():
        info = bus_info.get(route_id, {})
        speed = info.get("speed", 0)
        avg_time = info.get("avg_travel_time", 0)
        
        travel_times[route_id] = {}
        total_dist = sum(travel_distances[(stations[i], stations[i+1])] for i in range(len(stations)-1))
        
        for i in range(len(stations)-1):
            key = (stations[i], stations[i+1])
            dist = travel_distances[key]
            
            cands = []
            if speed > 0: cands.append(dist / speed)
            if avg_time > 0 and total_dist > 0: cands.append((dist / total_dist) * avg_time)
            if key in travel_times_ideal: cands.append(travel_times_ideal[key])
            
            travel_times[route_id][key] = max(cands) if cands else 1.0 
    return travel_times

def build_route_distances(bus_routes, distances):
    route_distances = {}
    for route_id, stations in bus_routes.items():
        route_distances[route_id] = {}
        for i in range(len(stations) - 1):
            key = (stations[i], stations[i + 1])
            route_distances[route_id][key] = distances[key]
    return route_distances