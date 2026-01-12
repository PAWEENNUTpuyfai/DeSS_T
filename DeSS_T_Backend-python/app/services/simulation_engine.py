import math
from turtle import delay, st
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
        self.env = sim.Environment()
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
            max_bus = info["max_bus"]
            rid = route_id
            self.env.route_util_mon.setdefault(rid, sim.Monitor())
            self.env.route_travel_time_mon.setdefault(rid, sim.Monitor())
            self.env.route_travel_dist_mon.setdefault(rid, sim.Monitor())
            
            # self.env.route_customer_count_mon.setdefault(rid, sim.Monitor())
            self.env.route_customer_count.setdefault(rid, 0)
            self.env.route_waiting_mon.setdefault(rid, sim.Monitor())

            for depart_time in self.config["BUS_SCHEDULES"][route_id]:
            
                Bus(
                    route_id=route_id,
                    route=route_objs,
                    capacity=info["capacity"],
                    depart_time=depart_time,
                    alighting_rules=self.config["ALIGHTING_RULES"],
                    time_ctx=self.config["TIME_CTX"],
                    travel_times={
                        k: v / 60 for k, v in self.config["TRAVEL_TIMES"].items()
                    },
                    travel_distances=self.config["TRAVEL_DISTANCES"],
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
                "station_queue": {s: {"sum": 0.0, "count": 0} for s in self.stations},
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
                if v["count"] > 0:
                    all_station_q.append(conditional_avg(v))

        # =====================================================
        # SUMMARY (ทั้ง simulation)
        # =====================================================
        summary = ResultSummary(
            average_waiting_time=safe_mean(self.env.global_waiting_mon),
            average_queue_length = (
                sum(all_station_q) / max(1, len(all_station_q))
            ),
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


            slot_results.append(
                SimulationSlotResult(
                    slot_name=self.config["TIME_CTX"].slot_label(slot_idx),

                    # ⭐ เพิ่มส่วนนี้
                    result_total_station=TotalStation(
                        average_waiting_time=
                            sum(safe_mean(m) for m in slot_data["station_waiting"].values())
                            / max(1, len(slot_data["station_waiting"])),
                        average_queue_length=
                            sum(
                                conditional_avg(v)
                                for v in slot_data["station_queue"].values()
                                if v["count"] > 0
                            ) / max(
                                1,
                                sum(1 for v in slot_data["station_queue"].values() if v["count"] > 0)
                            )
                    ),

                    # ---------- PER STATION ----------
                    result_station=[
                        ResultStation(
                            station_name=s,
                            average_waiting_time=safe_mean(slot_data["station_waiting"][s]),
                            average_queue_length=conditional_avg(slot_data["station_queue"][s])
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

            slots = engine.slots[slot]

            # ---- station queue baseline ----
            for s, st in engine.stations.items():
                q = st.wait_store.length()
                if q > 0:
                    slots["station_queue"][s]["sum"] += q
                    slots["station_queue"][s]["count"] += 1

            yield self.hold(self.time_ctx.slot_length)

def safe_mean(mon, default=0.0):
    if mon is None:
        return default
    v = mon.mean()
    if v is None or math.isnan(v):
        return default
    return float(v)

def conditional_avg(d):
    if d["count"] == 0:
        return 0.0
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
        depart_time,
        alighting_rules,
        time_ctx,
        travel_times,
        travel_distances,   # 👈 เพิ่ม
        env
    ):
        super().__init__(env=env)
        self.route_id = route_id
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

    def process(self):
        delay = self.depart_time - self.env.now()
        if delay > 0:
            yield self.hold(delay)

        add_log(self.env, "Bus", f"Bus {self.route_id} departed")

        for i, station in enumerate(self.route):
            is_last_station = (i == len(self.route) - 1)

            add_log(
                self.env,
                "Bus",
                f"Bus {self.route_id} arrives at {station.name}"
            )

            # ---------- ALIGHTING ----------
            if is_last_station:
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

            add_log(self.env, "Bus", f"Bus {self.route_id} alight {alight_count}")
            # ---------- QUEUE LENGTH (per route) ----------
            queue_len = station.wait_store.length()

            slot = self.time_ctx.slot_index(self.env.now())
            self.env.sim_engine._ensure_slot(slot)

            slots = self.env.sim_engine.slots
            if queue_len > 0:
                sq = slots[slot]["station_queue"][station.name]
                sq["sum"] += queue_len
                sq["count"] += 1

                rq = slots[slot]["route_queue"][self.route_id]
                rq["sum"] += queue_len
                rq["count"] += 1


            # ---------- LOADING ----------
            if not is_last_station:
                while len(self.passengers) < self.capacity:
                    p = self.from_store(station.wait_store)
                    if p is None:
                        break

                    waiting = self.env.now() - p.arrival_time

                    self.env.global_waiting_mon.tally(waiting)

                    slot = self.time_ctx.slot_index(self.env.now())
                    self.env.sim_engine._ensure_slot(slot)

                    slots = self.env.sim_engine.slots

                    slots[slot]["station_waiting"][station.name].tally(waiting)
                    slots[slot]["route_waiting"][self.route_id].tally(waiting)
                    # customer count per route
                    slots[slot]["route_customer_count"][self.route_id] += 1


                    self.passengers.append(p)


            # ---------- TRAVEL ----------
            if not is_last_station:
                from_station = station.name
                to_station = self.route[i + 1].name

                key = (from_station, to_station)

                travel_time = self.travel_times[key]
                travel_dist = self.travel_distances[key]

                # ✅ สะสมต่อ route
                self.total_travel_time += travel_time
                self.total_travel_dist += travel_dist

                # ✅ utilization ยังต้องอยู่ตรงนี้ (time-based)
                utilization = len(self.passengers) / self.capacity
                self.env.route_util_mon[self.route_id].tally(
                    utilization,
                    weight=travel_time
                )
                self.env.global_utilization_mon.tally(
                    utilization,
                    weight=travel_time
                )

                slots[slot]["route_util"][self.route_id].tally(
                    utilization,
                    weight=travel_time
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

