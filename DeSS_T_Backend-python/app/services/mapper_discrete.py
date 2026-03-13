from app.services.simulation_time import TimeContext, parse_hour_min
import salabim as sim

def build_discrete_simulation_config(req, target_date="Day 1"):
    config_data = req.discrete_configuration_data
    time_ctx = TimeContext(req.time_periods, req.time_slot)

    # 1. Map ID -> Name ของสถานี เพื่อใช้แสดงผล
    station_map = {st.station_id: st.station_name for st in config_data.station_list}

    # 2. Map Route Pairs (ใช้ UUID เป็น Key)
    travel_times_ideal, distances = map_route_pairs(config_data.route_pair)

    # 3. Map Bus Routes & Info
    bus_routes = map_bus_routes(req.scenario_data, config_data.route_pair)
    bus_info = map_bus_information(req.scenario_data)

    # 4. คำนวณ Travel Times 
    travel_times = build_travel_times(bus_routes, travel_times_ideal, distances, bus_info)
    route_distances = build_route_distances(bus_routes, distances)

    # 5. สร้าง Alighting Rules (ยังคงใช้ Distribution สำหรับคนลงรถ)
    alighting_rules = map_alighting_distributions(config_data.alighting_sim_data, time_ctx)

    # 6. 🌟 สร้าง Discrete Arrival Times จาก Arrival List
    discrete_arrivals = map_discrete_arrivals(config_data.arrival_list, time_ctx, target_date)

    # 7. Map ตารางเดินรถ
    bus_schedules = map_bus_schedules(req.scenario_data, time_ctx)

    dwell_time = {
        "door_open_time": 0.05,   
        "door_close_time": 0.05,  
        "boarding_time": 0.025,   
        "alighting_time": 0.025   
    }

    config = {
        "TARGET_DATE": target_date,
        "STATION_MAP": station_map,
        "TIME_CTX": time_ctx,
        "TRAVEL_TIMES": travel_times,
        "TRAVEL_DISTANCES": route_distances,
        "BUS_ROUTES": bus_routes,
        "BUS_INFO": bus_info,
        "BUS_SCHEDULES": bus_schedules,
        "ALIGHTING_RULES": alighting_rules,
        "DISCRETE_ARRIVALS": discrete_arrivals, # <--- ข้อมูลใหม่สำหรับระบบ Discrete
        "USE_DWELL_TIME": True,
        "DWELL_TIME": dwell_time
    }
    return config

# ----------------- Helper Functions -----------------

def map_discrete_arrivals(arrival_list, time_ctx, target_date):
    """
    แปลงอาร์เรย์ของเวลา (เช่น "08:05") ให้เป็น simulation time (float) 
    สำหรับ target_date ที่กำหนดเท่านั้น
    """
    arrivals_by_station = {}
    
    for station_data in arrival_list:
        st_id = station_data.station_id
        sim_times = []
        
        # หาวันที่ตรงกับ target_date
        for day_data in station_data.arrival_time_data:
            if day_data.date == target_date:
                for t_str in day_data.arrival_times:
                    real_min = parse_hour_min(t_str)
                    sim_time = time_ctx.to_sim(real_min)
                    sim_times.append(sim_time)
                break # เจอวันแล้ว ข้ามไปสถานีต่อไปได้เลย
                
        # เก็บเรียงตามเวลา
        arrivals_by_station[st_id] = sorted(sim_times)
        
    return arrivals_by_station

def map_route_pairs(route_pairs):
    travel_times, distances = {}, {}
    for rp in route_pairs:
        key = (rp.fst_station, rp.snd_station) # ใช้ UUID
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
    # ย่อมาจาก build_distribution ตัวเดิมของคุณ
    rules = {}
    for simdata in simdata_list:
        t0, t1 = time_ctx.range_to_sim(simdata.time_range)
        for rec in simdata.records:
            dist_name = rec.distribution.strip().lower()
            if dist_name == "no arrival": continue
            
            params = dict(kv.strip().split("=") for kv in rec.argument_list.split(","))
            params = {k: float(v) for k, v in params.items()}
            
            # ปรุง lambda (ใช้ UUID ของสถานี)
            if dist_name == "poisson":
                dist_factory = lambda env, p=params: sim.Poisson(p["lambda"])
            elif dist_name == "constant":
                dist_factory = lambda env, p=params: sim.Constant(p["value"])
            else:
                dist_factory = lambda env: sim.Constant(0) # Fallback

            rules[(rec.station, t0, t1)] = dist_factory 
    return rules

def build_travel_times(bus_routes, travel_times_ideal, travel_distances, bus_info):
    # Logic เดิมของคุณเป๊ะๆ แต่ใช้ตัวแปรที่รับ UUID แทน
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
            
            travel_times[route_id][key] = max(cands) if cands else 1.0 # fallback
    return travel_times

def build_route_distances(bus_routes, distances):
    route_distances = {}
    for route_id, stations in bus_routes.items():
        route_distances[route_id] = {}
        for i in range(len(stations) - 1):
            key = (stations[i], stations[i + 1])
            route_distances[route_id][key] = distances[key]
    return route_distances