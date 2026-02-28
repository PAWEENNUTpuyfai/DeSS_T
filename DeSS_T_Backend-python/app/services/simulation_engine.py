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

        # Collect stations
        station_names = set()
        for route in self.config["BUS_ROUTES"].values():
            station_names.update(route)

        # Create stations
        for name in station_names:
            self.stations[name] = Station(name, env=self.env)
            self.env.station_waiting_mon[name] = sim.Monitor()


        # Arrival generators
        for station in self.stations.values():
            ArrivalGenerator(
                station,
                self.config["INTERARRIVAL_RULES"],
                self.config["TIME_CTX"],
                env=self.env
            )

        # Buses
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
                    alighting_rules=self.config["ALIGHTING_RULES"],
                    time_ctx=self.config["TIME_CTX"],
                    travel_times={
                        k: v / 60 for k, v in self.config["TRAVEL_TIMES"][route_id].items()
                    },
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
                    wait = dist.sample()

                    add_log(
                        self.env,
                        "ArrivalGenerator",
                        f"Arrival at {self.station.name}, wait={wait:.2f}"
                    )
                    if wait <= 0 or math.isnan(wait):
                        wait = 0.0001 # avoid zero or negative wait time
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
        delay = self.depart_time - self.env.now()
        if delay > 0:
            yield self.hold(delay)
            
        # ===== CHECK MAX BUS =====
        active = self.env.route_active_bus[self.route_id]
        max_bus = self.env.route_max_bus[self.route_id]

        if active >= max_bus:
            add_log(
                self.env,
                component="Bus",
                message=(
                    f"Bus {self.route_id} NOT departed "
                    f"(active={active}, max={max_bus})"
                )
            )
            return   # ❗ จบ component แต่ simulation เดินต่อ
        
        # ===== ALLOW DEPART =====
        self.env.route_active_bus[self.route_id] += 1


        add_log(
            self.env,
            component="Bus",
            message=(
                f"Bus {self.bus_id} departed "
                f"(active={self.env.route_active_bus[self.route_id]}/"
                f"{self.env.route_max_bus[self.route_id]})"
            )
        )

        for i, station in enumerate(self.route):
            is_first_station = (i == 0)
            is_last_station = (i == len(self.route) - 1)
            add_log(
                self.env,
                "Bus",
                f"Bus {self.bus_id} arrives at {station.name}"
            )


            # ---------- ALIGHTING ----------
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
                p.activate()


            need_open = (
                alight_count > 0 or
                (
                    not is_last_station and
                    station.wait_store.length() > 0
                )
            )
            if alight_count > 0 and self.use_dwell:
                yield self.hold(alight_count * self.alighting_time)

            if need_open and self.use_dwell:
                add_log(self.env, "Bus", f"Bus {self.bus_id} opens door at {station.name}")
                yield self.hold(self.door_open_time)

            if is_first_station:
                add_log(self.env, "Bus", f"Bus {self.bus_id} first station, no alighting")
            else:
                add_log(self.env, "Bus", f"Bus {self.bus_id} alight {alight_count}")


            # ---------- QUEUE LENGTH (per route) ----------
            queue_len = station.wait_store.length()

            slot = self.time_ctx.slot_index(self.env.now())
            self.env.sim_engine._ensure_slot(slot)

            slots = self.env.sim_engine.slots
            if queue_len > 0:

                rq = slots[slot]["route_queue"][self.route_id]
                rq["sum"] += queue_len
                rq["count"] += 1
            
            # ---------- QUEUE LENGTH (per station) ----------
            engine = self.env.sim_engine
            engine.slots[slot]["station_queue"][station.name].tally(queue_len)
            # ---------- LOADING ----------

            boarded = 0

            if not is_last_station:
                while len(self.passengers) < self.capacity and station.wait_store.length() > 0:
                    p = yield self.from_store(station.wait_store)
                    if p is None:
                        break
                    
                    # ✅ LOG: Passenger boards bus
                    add_log(
                        self.env,
                        component="Passenger",
                        message=(
                            f"Passenger boards Bus {self.bus_id} "
                            f"at {station.name}"
                        )
                    )
                    
                    engine = self.env.sim_engine
                    slot = engine.config["TIME_CTX"].slot_index(self.env.now())
                    engine._ensure_slot(slot)

                    engine.slots[slot]["station_queue"][station.name].tally(
                        station.wait_store.length()
                    )

                    waiting = self.env.now() - p.arrival_time
                    self.env.global_waiting_mon.tally(waiting)

                    slots = engine.slots
                    slots[slot]["station_waiting"][station.name].tally(waiting)
                    slots[slot]["route_waiting"][self.route_id].tally(waiting)
                    slots[slot]["route_customer_count"][self.route_id] += 1

                    self.passengers.append(p)
                    boarded += 1

            if boarded > 0 and self.use_dwell:
                yield self.hold(boarded * self.boarding_time)

            if need_open and self.use_dwell:
                add_log(self.env, "Bus", f"Bus {self.bus_id} closes door at {station.name}")
                yield self.hold(self.door_close_time)

            # คำนวณ dwell_time เพื่อเก็บสถิติ Utilization
            # หาก use_dwell=False ค่า dwell_time จะเป็น 0 ทำให้ Utilization ไม่ถูกนับช่วงจอด
            current_dwell = 0
            if self.use_dwell and need_open:
                current_dwell = (self.door_open_time + (alight_count * self.alighting_time) + 
                                (boarded * self.boarding_time) + self.door_close_time)
            
            self.total_travel_time += current_dwell

            # ---------- TRAVEL ----------
            if not is_last_station:
                from_station = station.name
                to_station = self.route[i + 1].name

                key = (from_station, to_station)

                travel_time = self.travel_times[key]
                travel_dist = self.travel_distances[key]
                # ===== DISTANCE CHECK =====
                self.remaining_distance -= travel_dist

                if self.remaining_distance < 0:
                    # 🚨 รถหมดระยะกลางทาง
                    add_log(
                        self.env,
                        component="Bus",
                        message=(
                            f"Bus {self.bus_id} STOPPED mid-route "
                            f"before reaching {to_station} "
                            f"(distance exhausted)"
                        )
                    )

                    # 🚨 ผู้โดยสารลงทั้งหมด (ก่อนถึงจุดหมาย)
                    while self.passengers:
                        p = self.passengers.pop(0)

                        add_log(
                            self.env,
                            component="Passenger",
                            message=(
                                f"Passenger forced to alight from Bus {self.bus_id} "
                                f"before reaching destination"
                            )
                        )
                        p.activate()
                    # 🔴 สำคัญที่สุด
                    self.env.route_active_bus[self.route_id] -= 1
                    self.remaining_distance = self.max_distance_init

                    add_log(
                        self.env,
                        component="Bus",
                        message=(
                            f"Bus {self.bus_id} returned to depot (forced stop) "
                            f"(active={self.env.route_active_bus[self.route_id]}/"
                            f"{self.env.route_max_bus[self.route_id]})"
                        )
                    )

                    return

                # ✅ สะสมต่อ route
                self.total_travel_time += travel_time
                self.total_travel_dist += travel_dist

                if current_dwell > 0:
                    utilization = len(self.passengers) / self.capacity

                    self.env.route_util_mon[self.route_id].tally(
                        utilization,
                        weight=current_dwell
                    )
                    self.env.global_utilization_mon.tally(
                        utilization,
                        weight=current_dwell
                    )
                    slots[slot]["route_util"][self.route_id].tally(
                        utilization,
                        weight=current_dwell
                    )

                if travel_time <= 0:
                    travel_time = 0.0001
                yield self.hold(travel_time)

        # ===== END OF ROUTE =====
        self.env.route_travel_time_mon[self.route_id].tally(
            self.total_travel_time
        )
        self.env.route_travel_dist_mon[self.route_id].tally(
            self.total_travel_dist
        )

        self.env.global_travel_time_mon.tally(
            self.total_travel_time
        )
        self.env.global_travel_dist_mon.tally(
            self.total_travel_dist
        )

        # (ถ้าจะทำ slot-level ต่อ route)
        slot = self.time_ctx.slot_index(self.env.now())
        slots[slot]["route_travel_time"][self.route_id].tally(
            self.total_travel_time
        )
        slots[slot]["route_travel_dist"][self.route_id].tally(
            self.total_travel_dist
        )


        add_log(self.env, "Bus", f"Bus {self.route_id} finished route")

        # คืนจำนวนรถ
        self.env.route_active_bus[self.route_id] -= 1

        # reset distance เมื่อกลับ depot
        self.remaining_distance = self.max_distance_init

        add_log(
            self.env,
            component="Bus",
            message=(
                f"Bus {self.bus_id} returned to depot "
                f"(distance reset to {self.max_distance_init}) "
                f"(active={self.env.route_active_bus[self.route_id]}/"
                f"{self.env.route_max_bus[self.route_id]})"
            )
        )

