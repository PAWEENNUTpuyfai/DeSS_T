import math
import random
import time
import salabim as sim
from app.services.simulation_logger import add_log, SimulationLogger
from app.schemas.DiscreteSimualtion import DiscreteSimulationResult, SimulationLog
class DiscreteSimulationEngine:
    def __init__(self, config):
        sim.yieldless(False)
        seed = int(time.time())
        self.env = sim.Environment(random_seed=seed)
        self.config = config
        self.env.logger = SimulationLogger(self.config["TIME_CTX"])
        self.env.sim_engine = self 
        
        # ---------- GLOBAL METRICS ----------
        self.env.global_waiting_mon = sim.Monitor(name="Global Waiting Time")
        self.env.global_travel_time_mon = sim.Monitor(name="Global Travel Time")
        self.env.global_travel_dist_mon = sim.Monitor(name="Global Travel Distance")
        self.env.global_utilization_mon = sim.Monitor(name="Global Utilization")

        self.stations = {} 
        self.env.route_active_bus = {}
        self.env.route_max_bus = {}
        self.env.route_bus_seq = {}

    def build(self):
        # 1. สร้างสถานี (ใช้ st_id เป็น Key)
        for st_id, st_name in self.config["STATION_MAP"].items():
            self.stations[st_id] = Station(st_id, st_name, env=self.env)

        # 2. เตรียม Alighting Rules (สำหรับคนลง)
        processed_alighting = {
            key: factory(self.env) 
            for key, factory in self.config["ALIGHTING_RULES"].items()
        }

        # 3. สร้าง Discrete Arrival Generators (ปล่อยคนตามเวลาจริง)
        for st_id, arrival_times in self.config["DISCRETE_ARRIVALS"].items():
            if st_id in self.stations:
                DiscreteArrivalGenerator(
                    station=self.stations[st_id],
                    arrival_times=arrival_times,
                    env=self.env
                )

        # 4. สร้าง Buses ตามตารางเดินรถ
        for route_id, route_stations_ids in self.config["BUS_ROUTES"].items():
            info = self.config["BUS_INFO"][route_id]
            route_objs = [self.stations[s_id] for s_id in route_stations_ids]
            
            self.env.route_active_bus.setdefault(route_id, 0)
            self.env.route_bus_seq.setdefault(route_id, 0)
            self.env.route_max_bus[route_id] = info["max_bus"]

            for depart_time in self.config["BUS_SCHEDULES"][route_id]:
                Bus(
                    route_id=route_id,
                    route=route_objs,
                    capacity=info["capacity"],
                    max_distance=info["max_distance"],
                    depart_time=depart_time,
                    alighting_rules=processed_alighting,
                    time_ctx=self.config["TIME_CTX"],
                    travel_times={k: v / 60 for k, v in self.config["TRAVEL_TIMES"][route_id].items()},
                    travel_distances=self.config["TRAVEL_DISTANCES"][route_id],
                    env=self.env
                )

    def run(self):
        self.build()
        
        # รันซิมูเลชันจนจบระยะเวลาที่กำหนด
        self.env.run(till=float(self.config["TIME_CTX"].sim_duration))
        
        # คำนวณค่าเฉลี่ยความยาวคิวจากทุกสถานี (Time-weighted average อัตโนมัติจาก Salabim)
        all_q_means = []
        for s in self.stations.values():
            q_mean = s.wait_store.length.mean()
            if q_mean is not None and not math.isnan(q_mean):
                all_q_means.append(q_mean)
                
        avg_queue_len = sum(all_q_means) / max(1, len(all_q_means))

        # เตรียม Object ผลลัพธ์
        result = DiscreteSimulationResult(
            average_waiting_time=safe_mean(self.env.global_waiting_mon),
            average_queue_length=avg_queue_len,
            average_utilization=safe_mean(self.env.global_utilization_mon),
            average_travel_time=safe_mean(self.env.global_travel_time_mon),
            average_travel_distance=safe_mean(self.env.global_travel_dist_mon)
        )
        
        # ส่งกลับในรูปแบบ Dictionary ให้ตรงกับ Schema ของ Response
        return {
            "result": "success",
            "simulation_result": result,
            "logs": self.env.logger.logs
        }

# ==========================================
# Components
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
                
            add_log(self.env, "Arrival", f"Passenger arrived at {self.station.name}")
            Passenger(self.station, env=self.env)

class Bus(sim.Component):
    def __init__(self, route_id, route, capacity, max_distance, depart_time, 
                 alighting_rules, time_ctx, travel_times, travel_distances, env):
        super().__init__(env=env, name=f"Bus-{route_id}")
        self.route_id = route_id
        self.env.route_bus_seq[self.route_id] += 1
        self.bus_id = f"{self.route_id}-#{self.env.route_bus_seq[self.route_id]}"
        self.route = route
        self.capacity = capacity
        self.depart_time = depart_time
        self.alighting_rules = alighting_rules
        self.time_ctx = time_ctx
        self.travel_times = travel_times
        self.travel_distances = travel_distances
        self.total_travel_time = 0.0
        self.total_travel_dist = 0.0
        self.passengers = []
        self.remaining_distance = max_distance
        
        dwell = env.sim_engine.config["DWELL_TIME"]
        use_dwell = env.sim_engine.config.get("USE_DWELL_TIME", True)
        self.d_open = dwell["door_open_time"] if use_dwell else 0
        self.d_close = dwell["door_close_time"] if use_dwell else 0
        self.b_time = dwell["boarding_time"] if use_dwell else 0
        self.a_time = dwell["alighting_time"] if use_dwell else 0

    def process(self):
        delay = self.depart_time - self.env.now()
        if delay > 0: yield self.hold(delay)
            
        if self.env.route_active_bus[self.route_id] >= self.env.route_max_bus[self.route_id]:
            add_log(self.env, "Bus", f"Bus {self.route_id} Cancelled (Max Bus Reached)")
            return 
        
        self.env.route_active_bus[self.route_id] += 1
        add_log(self.env, "Bus", f"Bus {self.bus_id} Departed")

        for i, station in enumerate(self.route):
            is_last = (i == len(self.route) - 1)
            add_log(self.env, "Bus", f"Bus {self.bus_id} Arrived at {station.name}")

            # --- Alighting (คนลง) ---
            alight_count = 0
            if i > 0:
                if is_last:
                    alight_count = len(self.passengers)
                else:
                    now = self.env.now()
                    for (st, t0, t1), dist in self.alighting_rules.items():
                        # ตรวจสอบว่าตรงกับสถานีและช่วงเวลาหรือไม่ (ใช้ ID)
                        if st == station.st_id and t0 <= now < t1:
                            alight_count = int(dist.sample())
                            break
                    alight_count = min(alight_count, len(self.passengers))

            for _ in range(alight_count):
                p = self.passengers.pop(0)
                p.activate()
                
            if alight_count > 0: 
                yield self.hold(alight_count * self.a_time)

            # --- Door Open ---
            need_open = (alight_count > 0 or (not is_last and station.wait_store.length() > 0))
            if need_open: 
                yield self.hold(self.d_open)

            # --- Loading (คนขึ้น) ---
            boarded = 0
            if not is_last:
                while len(self.passengers) < self.capacity and station.wait_store.length() > 0:
                    p = yield self.from_store(station.wait_store)
                    
                    # บันทึกเวลารอ
                    self.env.global_waiting_mon.tally(self.env.now() - p.arrival_time)
                    
                    self.passengers.append(p)
                    boarded += 1
                    
            if boarded > 0: 
                yield self.hold(boarded * self.b_time)

            # --- Door Close ---
            if need_open: 
                yield self.hold(self.d_close)

            # --- Travel to Next Station ---
            dwell_duration = (self.d_open + (alight_count * self.a_time) + (boarded * self.b_time) + self.d_close) if need_open else 0
            self.total_travel_time += dwell_duration

            if not is_last:
                key = (station.st_id, self.route[i+1].st_id)
                t_time = self.travel_times[key]
                t_dist = self.travel_distances[key]

                if self.remaining_distance - t_dist < 0:
                    add_log(self.env, "Bus", f"Bus {self.bus_id} Out of Fuel/Distance")
                    for p in self.passengers: p.activate()
                    break

                # บันทึกค่า Utilization แบบถ่วงน้ำหนักเวลา
                segment_dur = dwell_duration + t_time
                if segment_dur > 0:
                    self.env.global_utilization_mon.tally(len(self.passengers) / self.capacity, weight=segment_dur)
                
                self.remaining_distance -= t_dist
                self.total_travel_time += t_time
                self.total_travel_dist += t_dist
                yield self.hold(max(0.0001, t_time))

        # --- End of Route ---
        self.env.global_travel_time_mon.tally(self.total_travel_time)
        self.env.global_travel_dist_mon.tally(self.total_travel_dist)
        self.env.route_active_bus[self.route_id] -= 1
        add_log(self.env, "Bus", f"Bus {self.bus_id} Finished Route")


# Helper Function สำหรับหาค่าเฉลี่ย
def safe_mean(mon, default=0.0):
    if mon is None: return default
    v = mon.mean()
    return float(v) if v is not None and not math.isnan(v) else default