import math
import random
import time
import salabim as sim
from app.services.simulation_logger import add_log, SimulationLogger

from app.schemas.Simulation import (
    ResultRoute,
    ResultStation,
    SimulationResponse,
    SimulationResult,
    SimulationSlotResult,
    ResultSummary,
    TotalStation,
)
class SimulationEngine:
    def __init__(self, config):
        sim.yieldless(False)
        seed = int(time.time())
        random.seed(seed)
        self.env = sim.Environment(random_seed=seed)
        self.config = config
        self.env.logger = SimulationLogger(self.config["TIME_CTX"])
        self.env.sim_engine = self   # 👈 สำคัญ
        self.slots = {}  
        
        # ---------- METRICS ----------
        self.env.global_waiting_mon = sim.Monitor()
        self.env.global_travel_time_mon = sim.Monitor()
        self.env.global_travel_dist_mon = sim.Monitor()
        self.env.global_utilization_mon = sim.Monitor()

        self.env.station_waiting_mon = {}   # station_name -> Monitor

        self.env.route_util_mon = {}        # route_id -> Monitor
        self.env.route_travel_time_mon = {} # route_id -> Monitor
        self.env.route_travel_dist_mon = {} # route_id -> Monitor

        # simple integer counters for total customers per route (some salabim
        # Monitor APIs may not expose a reliable total/count attribute in all
        # environments), so keep an explicit int counter as well
        self.env.route_customer_count = {}
        self.env.route_waiting_mon = {}        # route_id -> Monitor

        self.stations = {}
        self.env.route_active_bus = {}   # route_id -> int
        self.env.route_max_bus = {}      # route_id -> int
        self.env.route_bus_seq = {}   # route_id -> running bus number


    def build(self):
        # 1. สร้างสถานี
        station_names = set()
        for route in self.config["BUS_ROUTES"].values():
            station_names.update(route)
        for name in station_names:
            self.stations[name] = Station(name, env=self.env)
            self.env.station_waiting_mon[name] = sim.Monitor()

        # 2. ปรุง Distribution (Execution)
        # แปลงจาก Lambda Factory ให้กลายเป็น Salabim Distribution Object จริงๆ
        processed_interarrival = {
            key: factory(self.env) 
            for key, factory in self.config["INTERARRIVAL_RULES"].items()
        }
        processed_alighting = {
            key: factory(self.env) 
            for key, factory in self.config["ALIGHTING_RULES"].items()
        }

        # 3. สร้าง Arrival Generators
        for station in self.stations.values():
            ArrivalGenerator(
                station,
                processed_interarrival, # ใช้ตัวที่ปรุงเสร็จแล้ว
                self.config["TIME_CTX"],
                env=self.env
            )

        # 4. สร้าง Buses
        for route_id, route_stations in self.config["BUS_ROUTES"].items():
            info = self.config["BUS_INFO"][route_id]
            route_objs = [self.stations[s] for s in route_stations]
            rid = route_id
            self.env.route_util_mon.setdefault(rid, sim.Monitor())
            self.env.route_travel_time_mon.setdefault(rid, sim.Monitor())
            self.env.route_travel_dist_mon.setdefault(rid, sim.Monitor())
            
            # self.env.route_customer_count_mon.setdefault(rid, sim.Monitor())
            self.env.route_customer_count.setdefault(rid, 0)
            self.env.route_waiting_mon.setdefault(rid, sim.Monitor())

            max_bus = info["max_bus"]

            self.env.route_active_bus.setdefault(rid, 0)
            self.env.route_bus_seq.setdefault(rid, 0)
            self.env.route_max_bus[rid] = max_bus

            for depart_time in self.config["BUS_SCHEDULES"][route_id]:
                Bus(
                    route_id=route_id,
                    route=route_objs,
                    capacity=info["capacity"],
                    max_distance=info["max_distance"],
                    depart_time=depart_time,
                    alighting_rules=processed_alighting, # ใช้ตัวที่ปรุงเสร็จแล้ว
                    time_ctx=self.config["TIME_CTX"],
                    travel_times={k: v / 60 for k, v in self.config["TRAVEL_TIMES"][route_id].items()},
                    travel_distances=self.config["TRAVEL_DISTANCES"][route_id],
                    env=self.env
                )
        # Slot ticker
        SlotTicker(
            time_ctx=self.config["TIME_CTX"],
            env=self.env
        )


    def _ensure_slot(self, slot):
        if slot not in self.slots:
            self.slots[slot] = {
                "station_waiting": {s: sim.Monitor() for s in self.stations},

                # ⭐ on-demand queue
                "station_queue": {s: sim.Monitor(level=True) for s in self.stations},
                "route_queue": {r: {"sum": 0.0, "count": 0} for r in self.env.route_util_mon},

                "route_waiting": {r: sim.Monitor() for r in self.env.route_util_mon},
                "route_util": {r: sim.Monitor() for r in self.env.route_util_mon},
                "route_travel_time": {r: sim.Monitor() for r in self.env.route_util_mon},
                "route_travel_dist": {r: sim.Monitor() for r in self.env.route_util_mon},
                "route_customer_count": {r: 0 for r in self.env.route_util_mon},
            }


    def _init_all_slots(self):
        t = self.config["TIME_CTX"].real_start
        end = self.config["TIME_CTX"].real_end
        while t < end:
            slot = self.config["TIME_CTX"].slot_index(t)
            self._ensure_slot(slot)
            t += self.config["TIME_CTX"].slot_length



    def run(self):
        self.build()
        self._init_all_slots()
        # run simulation
        self.env.run(
            till=self.config["TIME_CTX"].real_end -
                self.config["TIME_CTX"].real_start
        )
        all_station_q = []

        for slot_data in self.slots.values():
            for v in slot_data["station_queue"].values():
                all_station_q.append(safe_mean(v))
        # =====================================================
        # SUMMARY (ทั้ง simulation)
        # =====================================================
        summary = ResultSummary(
            average_waiting_time=safe_mean(self.env.global_waiting_mon),
            average_queue_length=sum(all_station_q) / max(1, len(all_station_q)),
            average_utilization=safe_mean(self.env.global_utilization_mon),
            average_travel_time=safe_mean(self.env.global_travel_time_mon),
            average_travel_distance=safe_mean(self.env.global_travel_dist_mon),
        )


        # =====================================================
        # SLOT RESULTS
        # =====================================================
        slot_results = []

        for slot_idx in sorted(self.slots.keys()):
            slot_data = self.slots[slot_idx]

            # คำนวณค่าเฉลี่ยของสถานีใน slot นี้
            station_waiting_values = [safe_mean(m) for m in slot_data["station_waiting"].values() if safe_mean(m) != -99999.9]
            station_queue_values = [safe_mean(m) for m in slot_data["station_queue"].values() if safe_mean(m) != -99999.9]

            avg_wait_total = sum(station_waiting_values) / len(station_waiting_values) if station_waiting_values else -99999.0
            avg_queue_total = sum(station_queue_values) / len(station_queue_values) if station_queue_values else -99999.0
            slot_results.append(
                SimulationSlotResult(
                    slot_name=self.config["TIME_CTX"].slot_label(slot_idx),

                    # ⭐ เพิ่มส่วนนี้
                    result_total_station=TotalStation(
                        average_waiting_time=avg_wait_total,
                        average_queue_length=avg_queue_total
                    ),

                    # ---------- PER STATION ----------
                    result_station=[
                        ResultStation(
                            station_name=s,
                            average_waiting_time=safe_mean(slot_data["station_waiting"][s]),
                            average_queue_length=safe_mean(slot_data["station_queue"][s])
                        )
                        for s in slot_data["station_waiting"]
                    ],

                    # ---------- PER ROUTE ----------
                    result_route=[
                        ResultRoute(
                            route_id=r,
                            average_utilization=safe_mean(slot_data["route_util"][r]),
                            average_travel_time=safe_mean(slot_data["route_travel_time"][r]),
                            average_travel_distance=safe_mean(slot_data["route_travel_dist"][r]),
                            average_waiting_time=safe_mean(slot_data["route_waiting"][r]),
                            average_queue_length=conditional_avg(slot_data["route_queue"][r]),
                            customers_count=slot_data["route_customer_count"][r]
                        )
                        for r in slot_data["route_util"]
                    ]
                )
            )


        # =====================================================
        # RESPONSE
        # =====================================================
        return SimulationResponse(
            result="success",
            simulation_result=SimulationResult(
                result_summary=summary,
                slot_results=slot_results
            ),
            logs=self.env.logger.logs
        )
    
class SlotTicker(sim.Component):
    def __init__(self, time_ctx, env):
        super().__init__(env=env)
        self.time_ctx = time_ctx

    def process(self):
        while True:
            now = self.env.now()
            engine = self.env.sim_engine

            slot = self.time_ctx.slot_index(now)
            engine._ensure_slot(slot)


            yield self.hold(self.time_ctx.slot_length)

def safe_mean(mon, default=-99999.9):
    if mon is None:
        return default
    v = mon.mean()
    if v is None or math.isnan(v):
        return default
    return float(v)

def conditional_avg(d):
    if d["count"] == 0:
        return -99999.9
    return d["sum"] / d["count"]


class Station(sim.Component):
    def __init__(self, name, env):
        super().__init__(name=name, env=env)
        self.name = name
        self.wait_store = sim.Store(env=env, capacity=sim.inf)


class Passenger(sim.Component):
    def __init__(self, station, env):
        super().__init__(env=env)
        self.station = station
        self.arrival_time = env.now() 

    def process(self):
        add_log(self.env, component="Passenger", message=f"Passenger arrives at {self.station.name}")
        yield self.to_store(self.station.wait_store, self)
        engine = self.env.sim_engine
        slot = engine.config["TIME_CTX"].slot_index(self.env.now())
        engine._ensure_slot(slot)

        engine.slots[slot]["station_queue"][self.station.name].tally(
            self.station.wait_store.length()
        )
        yield self.passivate()
        add_log(self.env, component="Passenger", message=f"Passenger leaves system at {self.station.name}")

class ArrivalGenerator(sim.Component):
    def __init__(self, station, rules, time_ctx, env):
        super().__init__(env=env)
        self.station = station
        self.rules = rules
        self.time_ctx = time_ctx

    def process(self):
        while True:
            sim_now = self.env.now()
            for (st, t0, t1), dist in self.rules.items():
                if st == self.station.name and t0 <= sim_now < t1:
                    
                    # --- RESAMPLING LOGIC ---
                    wait = dist.sample()
                    attempts = 0
                    # ถ้าค่ามหาศาล (เกิน 1 วัน) หรือเป็น NaN ให้สุ่มใหม่
                    while (math.isnan(wait) or wait > 1440 or wait < 0) and attempts < 10:
                        wait = dist.sample()
                        attempts += 1
                    
                    # ถ้ายังพังอยู่ ให้ใช้ค่า Default ที่ปลอดภัย
                    if math.isnan(wait) or wait > 1440:
                        wait = 10.0 # หรือค่าเฉลี่ยที่เหมาะสม
                        add_log(self.env, "Error", f"Dist failed at {self.station.name}, using fallback 10.0")
                    # -------------------------

                    add_log(self.env, "ArrivalGenerator", f"Arrival at {self.station.name}, wait={wait:.2f}")
                    
                    if wait <= 0: wait = 0.0001
                    yield self.hold(wait)
                    Passenger(self.station, env=self.env)
                    break
            else:
                yield self.hold(1)

class Bus(sim.Component):
    def __init__(
        self,
        route_id,
        route,
        capacity,
        max_distance,    # 👈 เพิ่ม
        depart_time,
        alighting_rules,
        time_ctx,
        travel_times,
        travel_distances,   # 👈 เพิ่ม          
        env
    ):
        super().__init__(env=env)
        self.route_id = route_id

        # 👇 assign bus number at creation time
        self.env.route_bus_seq[self.route_id] += 1
        self.bus_no = self.env.route_bus_seq[self.route_id]

        self.bus_id = f"{self.route_id}-#{self.bus_no}"

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
        self.max_distance_init = max_distance
        self.remaining_distance = max_distance
        # ดึงค่าจาก Config ว่าจะใช้ Dwell Time หรือไม่
        self.use_dwell = env.sim_engine.config.get("USE_DWELL_TIME", True)
        dwell = env.sim_engine.config["DWELL_TIME"]

        # ถ้าไม่ใช้ ให้เซตค่าเวลาทั้งหมดเป็น 0
        if self.use_dwell:
            self.door_open_time = dwell["door_open_time"]
            self.door_close_time = dwell["door_close_time"]
            self.boarding_time = dwell["boarding_time"]
            self.alighting_time = dwell["alighting_time"]
        else:
            self.door_open_time = 0
            self.door_close_time = 0
            self.boarding_time = 0
            self.alighting_time = 0

    def process(self):
        # 1. รอเวลาออกรถตามตาราง
        delay = self.depart_time - self.env.now()
        if delay > 0:
            yield self.hold(delay)
            
        # 2. ตรวจสอบจำนวนรถที่วิ่งอยู่ในเส้นทาง (Max Bus Check)
        active = self.env.route_active_bus[self.route_id]
        max_bus = self.env.route_max_bus[self.route_id]

        if active >= max_bus:
            add_log(
                self.env,
                component="Bus",
                message=f"Bus {self.route_id} NOT departed (active={active}, max={max_bus})"
            )
            return  # จบโปรเซสนี้แต่ Simulation ยังดำเนินต่อ
        
        # 3. เริ่มออกเดินทาง
        self.env.route_active_bus[self.route_id] += 1
        add_log(
            self.env,
            component="Bus",
            message=f"Bus {self.bus_id} departed (active={self.env.route_active_bus[self.route_id]}/{max_bus})"
        )

        for i, station in enumerate(self.route):
            is_first_station = (i == 0)
            is_last_station = (i == len(self.route) - 1)
            
            add_log(self.env, "Bus", f"Bus {self.bus_id} arrives at {station.name}")

            # ---------- ALIGHTING (ผู้โดยสารลงรถ) ----------
            if is_first_station:
                alight_count = 0
            elif is_last_station:
                alight_count = len(self.passengers)
            else:
                alight_count = 0
                sim_now = self.env.now()
                for (st, t0, t1), dist in self.alighting_rules.items():
                    if st == station.name and t0 <= sim_now < t1:
                        alight_count = int(dist.sample())
                        break
                alight_count = min(alight_count, len(self.passengers))

            for _ in range(alight_count):
                p = self.passengers.pop(0)
                p.activate() # ปล่อย Passenger component ให้จบกระบวนการ

            # คำนวณเวลาจอดช่วงคนลง
            if alight_count > 0 and self.use_dwell:
                add_log(self.env, "Bus", f"Bus {self.bus_id} alighting {alight_count} passengers")
                yield self.hold(alight_count * self.alighting_time)

            # เปิดประตู
            need_open = (alight_count > 0 or (not is_last_station and station.wait_store.length() > 0))
            if need_open and self.use_dwell:
                add_log(self.env, "Bus", f"Bus {self.bus_id} opens door at {station.name}")
                yield self.hold(self.door_open_time)

            # ---------- QUEUE & METRICS (เก็บสถิติที่สถานี) ----------
            queue_len = station.wait_store.length()
            slot = self.time_ctx.slot_index(self.env.now())
            self.env.sim_engine._ensure_slot(slot)
            
            # บันทึก Queue Length ลงใน Monitor ของสถานี
            self.env.sim_engine.slots[slot]["station_queue"][station.name].tally(queue_len)
            
            if queue_len > 0:
                rq = self.env.sim_engine.slots[slot]["route_queue"][self.route_id]
                rq["sum"] += queue_len
                rq["count"] += 1

            # ---------- LOADING (ผู้โดยสารขึ้นรถ) ----------
            boarded = 0
            if not is_last_station:
                while len(self.passengers) < self.capacity and station.wait_store.length() > 0:
                    p = yield self.from_store(station.wait_store)
                    if p is None: break
                    
                    add_log(self.env, "Passenger", f"Passenger boards Bus {self.bus_id} at {station.name}")
                    
                    # บันทึกสถิติการรอ (Waiting Time)
                    waiting = self.env.now() - p.arrival_time
                    self.env.global_waiting_mon.tally(waiting)
                    
                    # บันทึกสถิติลง Slot
                    current_slot = self.time_ctx.slot_index(self.env.now())
                    self.env.sim_engine._ensure_slot(current_slot)
                    s_data = self.env.sim_engine.slots[current_slot]
                    
                    s_data["station_waiting"][station.name].tally(waiting)
                    s_data["route_waiting"][self.route_id].tally(waiting)
                    s_data["route_customer_count"][self.route_id] += 1
                    s_data["station_queue"][station.name].tally(station.wait_store.length())

                    self.passengers.append(p)
                    boarded += 1

            # คำนวณเวลาจอดช่วงคนขึ้นและปิดประตู
            if boarded > 0 and self.use_dwell:
                add_log(self.env, "Bus", f"Bus {self.bus_id} boarded {boarded} passengers")
                yield self.hold(boarded * self.boarding_time)
            
            if need_open and self.use_dwell:
                add_log(self.env, "Bus", f"Bus {self.bus_id} closes door at {station.name}")
                yield self.hold(self.door_close_time)

            # --- คำนวณ Dwell Time รวมของสถานีนี้เพื่อใช้ถ่วงน้ำหนัก Utilization ---
            current_dwell = 0
            if self.use_dwell and need_open:
                current_dwell = (self.door_open_time + (alight_count * self.alighting_time) + 
                                (boarded * self.boarding_time) + self.door_close_time)
            
            # สะสมเวลาจอดลงในเวลาเดินทางรวม
            self.total_travel_time += current_dwell

            # ---------- TRAVEL TO NEXT STATION ----------
            if not is_last_station:
                from_st = station.name
                to_st = self.route[i + 1].name
                key = (from_st, to_st)

                travel_time = self.travel_times[key]
                travel_dist = self.travel_distances[key]

                # ตรวจสอบระยะทาง (Distance Limit)
                self.remaining_distance -= travel_dist
                if self.remaining_distance < 0:
                    add_log(self.env, "Bus", f"Bus {self.bus_id} STOPPED mid-route before {to_st} (Fuel/Distance exhausted)")
                    while self.passengers:
                        p = self.passengers.pop(0)
                        p.activate()
                    self.env.route_active_bus[self.route_id] -= 1
                    return

                # ✅ บันทึก UTILIZATION แบบ Time-weighted
                # (ครอบคลุมตั้งแต่ช่วงจอดที่สถานีนี้ จนถึงช่วงวิ่งไปสถานีหน้า)
                segment_duration = current_dwell + travel_time
                if segment_duration > 0:
                    util = len(self.passengers) / self.capacity
                    
                    self.env.route_util_mon[self.route_id].tally(util, weight=segment_duration)
                    self.env.global_utilization_mon.tally(util, weight=segment_duration)

                    # บันทึกค่าลง Slot
                    current_slot = self.time_ctx.slot_index(self.env.now())
                    self.env.sim_engine._ensure_slot(current_slot)
                    self.env.sim_engine.slots[current_slot]["route_util"][self.route_id].tally(util, weight=segment_duration)

                # สะสมสถิติ
                self.total_travel_time += travel_time
                self.total_travel_dist += travel_dist

                # เริ่มวิ่งจริง
                add_log(self.env, "Bus", f"Bus {self.bus_id} traveling to {to_st} (Time: {travel_time:.2f})")
                yield self.hold(max(0.0001, travel_time))

        # 4. จบเส้นทาง (End of Route)
        add_log(self.env, "Bus", f"Bus {self.bus_id} finished route at {self.route[-1].name}")
        
        self.env.route_travel_time_mon[self.route_id].tally(self.total_travel_time)
        self.env.route_travel_dist_mon[self.route_id].tally(self.total_travel_dist)
        self.env.global_travel_time_mon.tally(self.total_travel_time)
        self.env.global_travel_dist_mon.tally(self.total_travel_dist)

        # บันทึกเที่ยวสุดท้ายลง Slot
        final_slot = self.time_ctx.slot_index(self.env.now())
        self.env.sim_engine._ensure_slot(final_slot)
        final_slots = self.env.sim_engine.slots[final_slot]
        final_slots["route_travel_time"][self.route_id].tally(self.total_travel_time)
        final_slots["route_travel_dist"][self.route_id].tally(self.total_travel_dist)

        self.env.route_active_bus[self.route_id] -= 1
        self.remaining_distance = self.max_distance_init
        
        add_log(self.env, "Bus", f"Bus {self.bus_id} returned to depot (Active buses: {self.env.route_active_bus[self.route_id]})")