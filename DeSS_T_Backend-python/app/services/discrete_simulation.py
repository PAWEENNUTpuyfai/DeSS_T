import math
import random
import time
import salabim as sim
from app.services.simulation_logger import add_log, SimulationLogger
from app.schemas.DiscreteSimualtion import DiscreteSimulationResult, SimulationLog
from app.services.simulation_time import TimeContext, parse_hour_min


class DiscreteSimulationEngine:
    def __init__(self, config):
        self.config = config
        self.all_logs = []
        
        # --- ตัวแปรเก็บสถิติสะสมรวมทุกวัน (Global Accumulators) ---
        self.total_wait_time = 0.0
        self.total_wait_count = 0
        
        self.total_travel_time = 0.0
        self.total_travel_dist = 0.0
        self.total_travel_count = 0
        
        self.total_utilization_weighted = 0.0
        self.total_utilization_weight = 0.0
        
        self.sum_avg_queue_length = 0.0
        self.count_days = 0

    def run(self):
        # วนรอบรันทีละวัน (Date)
        for date, arrivals_dict in self.config["DISCRETE_ARRIVALS_ALL_DAYS"].items():
            self._run_single_day(date, arrivals_dict)
            
        # สรุปผลลัพธ์ (Aggregated Averages)
        avg_wait = self.total_wait_time / max(1, self.total_wait_count)
        avg_travel = self.total_travel_time / max(1, self.total_travel_count)
        avg_dist = self.total_travel_dist / max(1, self.total_travel_count)
        avg_util = self.total_utilization_weighted / max(1, self.total_utilization_weight)
        avg_q = self.sum_avg_queue_length / max(1, self.count_days)

        result = DiscreteSimulationResult(
            average_waiting_time=avg_wait,
            average_queue_length=avg_q,
            average_utilization=avg_util,
            average_travel_time=avg_travel,
            average_travel_distance=avg_dist
        )
        
        return {
            "result": "success",
            "simulation_result": result,
            "logs": self.all_logs
        }

    def _run_single_day(self, date_label, arrivals_dict):
        """รัน Environment แยกขาดออกจากกันในแต่ละวัน เพื่อเคลียร์สถานะ"""
        sim.yieldless(False)
        seed = int(time.time()) + hash(date_label) % 10000
        env = sim.Environment(random_seed=seed)
        
        env.logger = SimulationLogger(self.config["TIME_CTX"])
        env.sim_engine = self 
        env.date_label = date_label # เพื่อใช้ระบุวันใน Log
        
        stations = {} 
        env.route_active_bus = {}
        env.route_max_bus = {}
        env.route_bus_seq = {}

        # 1. สร้างสถานี
        for st_id, st_name in self.config["STATION_MAP"].items():
            stations[st_id] = Station(st_id, st_name, env=env)

        # 2. เตรียม Alighting Rules
        processed_alighting = {
            key: factory(env) 
            for key, factory in self.config["ALIGHTING_RULES"].items()
        }

        # 3. สร้าง Arrival Generators ของวันนั้นๆ
        for st_id, arrival_times in arrivals_dict.items():
            if st_id in stations:
                DiscreteArrivalGenerator(
                    station=stations[st_id],
                    arrival_times=arrival_times,
                    env=env
                )

        # 4. ปล่อยรถบัสตาม Schedule
        for route_id, route_stations_ids in self.config["BUS_ROUTES"].items():
            info = self.config["BUS_INFO"][route_id]
            route_objs = [stations[s_id] for s_id in route_stations_ids]
            
            env.route_active_bus.setdefault(route_id, 0)
            env.route_bus_seq.setdefault(route_id, 0)
            env.route_max_bus[route_id] = info["max_bus"]

            for depart_time in self.config["BUS_SCHEDULES"][route_id]:
                Bus(
                    route_id=route_id,
                    route=route_objs,
                    capacity=info["capacity"],
                    max_distance=info["max_distance"],
                    depart_time=depart_time,
                    alighting_rules=processed_alighting,
                    travel_times={k: v / 60 for k, v in self.config["TRAVEL_TIMES"][route_id].items()},
                    travel_distances=self.config["TRAVEL_DISTANCES"][route_id],
                    env=env
                )

        # รันจนจบวัน
        env.run(till=float(self.config["TIME_CTX"].sim_duration))
        
        # นำ Log ของวันมารวมกัน
        self.all_logs.extend(env.logger.logs)

        # คำนวณคิวเฉลี่ยของวัน แล้วบวกเข้า Engine
        all_q_means = []
        for s in stations.values():
            q_mean = s.wait_store.length.mean()
            if q_mean is not None and not math.isnan(q_mean):
                all_q_means.append(q_mean)
                
        day_avg_queue = sum(all_q_means) / max(1, len(all_q_means))
        self.sum_avg_queue_length += day_avg_queue
        self.count_days += 1

# ==========================================
# 3. Salabim Components
# ==========================================

class Station(sim.Component):
    def __init__(self, st_id, name, env):
        super().__init__(name=name, env=env)
        self.st_id = st_id 
        self.wait_store = sim.Store(env=env, capacity=sim.inf)

class Passenger(sim.Component):
    def __init__(self, station, env):
        super().__init__(env=env)
        self.station = station
        self.arrival_time = env.now() 

    def process(self):
        yield self.to_store(self.station.wait_store, self)
        yield self.passivate()

class DiscreteArrivalGenerator(sim.Component):
    def __init__(self, station, arrival_times, env):
        super().__init__(env=env)
        self.station = station
        self.arrival_times = sorted([t for t in arrival_times if t >= 0])

    def process(self):
        for arr_time in self.arrival_times:
            now = self.env.now()
            delay = arr_time - now
            if delay > 0:
                yield self.hold(delay)
                
            add_log(self.env, "Arrival", f"[{self.env.date_label}] Passenger arrived at {self.station.name}")
            Passenger(self.station, env=self.env)

class Bus(sim.Component):
    def __init__(self, route_id, route, capacity, max_distance, depart_time, 
                 alighting_rules, travel_times, travel_distances, env):
        super().__init__(env=env, name=f"Bus-{route_id}")
        self.route_id = route_id
        self.env.route_bus_seq[self.route_id] += 1
        self.bus_id = f"{self.route_id}-#{self.env.route_bus_seq[self.route_id]}"
        self.route = route
        self.capacity = capacity
        self.depart_time = depart_time
        self.alighting_rules = alighting_rules
        self.travel_times = travel_times
        self.travel_distances = travel_distances
        self.total_travel_time = 0.0
        self.total_travel_dist = 0.0
        self.passengers = []
        self.remaining_distance = max_distance
        
        # 🌟 ลบการประกาศตัวแปร Dwell Time ออก

    def process(self):
        delay = self.depart_time - self.env.now()
        if delay > 0: yield self.hold(delay)
            
        if self.env.route_active_bus[self.route_id] >= self.env.route_max_bus[self.route_id]:
            add_log(self.env, "Bus", f"[{self.env.date_label}] Bus {self.route_id} Cancelled (Max Reached)")
            return 
        
        self.env.route_active_bus[self.route_id] += 1
        add_log(self.env, "Bus", f"[{self.env.date_label}] Bus {self.bus_id} Departed")

        for i, station in enumerate(self.route):
            is_last = (i == len(self.route) - 1)
            add_log(self.env, "Bus", f"[{self.env.date_label}] Bus {self.bus_id} Arrived at {station.name}")

            # --- Alighting (คนลง) ---
            alight_count = 0
            if i > 0:
                if is_last:
                    alight_count = len(self.passengers)
                else:
                    now = self.env.now()
                    for (st, t0, t1), dist in self.alighting_rules.items():
                        if st == station.st_id and t0 <= now < t1:
                            alight_count = int(dist.sample())
                            break
                    alight_count = min(alight_count, len(self.passengers))

            for _ in range(alight_count):
                p = self.passengers.pop(0)
                p.activate()
                
            # 🌟 ลบ yield การหยุดรอคนลงรถ

            # --- Loading (คนขึ้น) ---
            if not is_last:
                while len(self.passengers) < self.capacity and station.wait_store.length() > 0:
                    p = yield self.from_store(station.wait_store)
                    
                    wait_time = self.env.now() - p.arrival_time
                    self.env.sim_engine.total_wait_time += wait_time
                    self.env.sim_engine.total_wait_count += 1
                    
                    self.passengers.append(p)
                    
            # 🌟 ลบ yield การหยุดรอคนขึ้นรถ และรอปิดประตู

            # --- Travel ---
            if not is_last:
                key = (station.st_id, self.route[i+1].st_id)
                t_time = self.travel_times[key]
                t_dist = self.travel_distances[key]

                if self.remaining_distance - t_dist < 0:
                    add_log(self.env, "Bus", f"[{self.env.date_label}] Bus {self.bus_id} Out of Fuel/Dist")
                    for p in self.passengers: p.activate()
                    break

                # Utilization คิดจาก Travel Time อย่างเดียว
                if t_time > 0:
                    util = len(self.passengers) / self.capacity
                    self.env.sim_engine.total_utilization_weighted += util * t_time
                    self.env.sim_engine.total_utilization_weight += t_time
                
                self.remaining_distance -= t_dist
                self.total_travel_time += t_time
                self.total_travel_dist += t_dist
                yield self.hold(max(0.0001, t_time))

        # --- End of Route ---
        self.env.sim_engine.total_travel_time += self.total_travel_time
        self.env.sim_engine.total_travel_dist += self.total_travel_dist
        self.env.sim_engine.total_travel_count += 1
        
        self.env.route_active_bus[self.route_id] -= 1
        add_log(self.env, "Bus", f"[{self.env.date_label}] Bus {self.bus_id} Finished")