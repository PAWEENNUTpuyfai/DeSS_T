import math
import random
import time
import salabim as sim
from typing import Dict, List, Tuple
from app.services.simulation_logger import add_log, SimulationLogger

from app.schemas.DiscreteSimulation import (
    DiscreteResultRoute,
    DiscreteResultStation,
    DiscreteSimulationResult,
    DiscreteSimulationResponse,
    DiscreteResultSummary,
)


class DiscreteSimulationEngine:
    """
    Discrete Event Simulation Engine for bus transit system.
    
    Key differences from distribution-based simulation:
    - Passengers arrive at exact times specified in day template
    - No distribution fitting, direct calculation
    - Tracks waiting time, queue length, utilization, travel time, distance
    """

    def __init__(self, config: Dict):
        sim.yieldless(False)
        seed = int(time.time())
        random.seed(seed)
        self.env = sim.Environment(random_seed=seed)
        self.config = config
        self.env.logger = SimulationLogger(self.config["TIME_CTX"])
        self.env.sim_engine = self

        # ===== METRICS =====
        # Global metrics
        self.env.global_waiting_mon = sim.Monitor()
        self.env.global_travel_time_mon = sim.Monitor()
        self.env.global_travel_dist_mon = sim.Monitor()
        self.env.global_utilization_mon = sim.Monitor()

        # Station metrics
        self.env.station_waiting_mon = {}      # station_name -> Monitor
        self.env.station_queue_mon = {}        # station_name -> Monitor (level-based)
        self.env.station_passenger_count = {}  # station_name -> int

        # Route metrics
        self.env.route_util_mon = {}           # route_id -> Monitor
        self.env.route_travel_time_mon = {}    # route_id -> Monitor
        self.env.route_travel_dist_mon = {}    # route_id -> Monitor
        self.env.route_waiting_mon = {}        # route_id -> Monitor
        self.env.route_queue_mon = {}          # route_id -> Monitor (level-based)
        self.env.route_customer_count = {}     # route_id -> int
        self.env.route_active_bus = {}         # route_id -> int
        self.env.route_max_bus = {}            # route_id -> int
        self.env.route_bus_seq = {}            # route_id -> running bus number

        self.stations = {}
        self.day_template_arrivals = {}  # {station_name: [(time, passenger_id), ...]}

    def build(self):
        """Build simulation entities"""
        # Initialize stations
        for station in self.config["STATION_LIST"]:
            st = Station(station.station_name, env=self.env)
            self.stations[station.station_name] = st
            self.env.station_waiting_mon[station.station_name] = sim.Monitor()
            self.env.station_queue_mon[station.station_name] = sim.Monitor(level=True)
            self.env.station_passenger_count[station.station_name] = 0

        # Initialize routes
        for route_id in self.config["BUS_ROUTES"]:
            self.env.route_util_mon[route_id] = sim.Monitor()
            self.env.route_travel_time_mon[route_id] = sim.Monitor()
            self.env.route_travel_dist_mon[route_id] = sim.Monitor()
            self.env.route_waiting_mon[route_id] = sim.Monitor()
            self.env.route_queue_mon[route_id] = sim.Monitor(level=True)
            self.env.route_customer_count[route_id] = 0
            self.env.route_active_bus[route_id] = 0
            self.env.route_max_bus[route_id] = self.config["BUS_INFO"][route_id]["max_bus"]
            self.env.route_bus_seq[route_id] = 0

        # Create buses based on schedule
        for route_id, schedule_list in self.config["BUS_SCHEDULES"].items():
            route_objs = [self.stations[s] for s in self.config["BUS_ROUTES"][route_id]]
            info = self.config["BUS_INFO"][route_id]

            # Process alighting rules for this route
            processed_alighting = {}
            for (st, t0, t1), rule in self.config["ALIGHTING_RULES"].items():
                if st in self.config["BUS_ROUTES"][route_id]:
                    processed_alighting[(st, t0, t1)] = rule

            for depart_time in schedule_list:
                DiscreteBus(
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

        # Create arrival generators for day template
        DiscreteArrivalGenerator(
            day_template=self.config["DAY_TEMPLATE"],
            stations=self.stations,
            time_ctx=self.config["TIME_CTX"],
            env=self.env
        )

    def run(self) -> DiscreteSimulationResponse:
        """Run the simulation and return results"""
        self.build()

        # Run simulation
        run_until = self.config["TIME_CTX"].real_end
        self.env.run(till=run_until)

        # ===== POST-PROCESS RESULTS =====
        return self._build_response()

    def _build_response(self) -> DiscreteSimulationResponse:
        """Build the response from collected metrics"""

        # === SUMMARY ===
        summary = DiscreteResultSummary(
            average_waiting_time=safe_mean(self.env.global_waiting_mon),
            average_queue_length=safe_mean(self.env.station_queue_mon.get(list(self.stations.keys())[0], sim.Monitor())),
            average_utilization=safe_mean(self.env.global_utilization_mon),
            average_travel_time=safe_mean(self.env.global_travel_time_mon),
            average_travel_distance=safe_mean(self.env.global_travel_dist_mon),
            total_passengers=sum(self.env.station_passenger_count.values()),
            min_waiting_time=self._min_monitor(self.env.global_waiting_mon),
            max_waiting_time=self._max_monitor(self.env.global_waiting_mon),
        )

        # === STATION RESULTS ===
        result_station = [
            DiscreteResultStation(
                station_name=s,
                average_waiting_time=safe_mean(self.env.station_waiting_mon[s]),
                average_queue_length=safe_mean(self.env.station_queue_mon[s]),
                min_waiting_time=self._min_monitor(self.env.station_waiting_mon[s]),
                max_waiting_time=self._max_monitor(self.env.station_waiting_mon[s]),
                passengers_count=self.env.station_passenger_count[s]
            )
            for s in self.stations
        ]

        # === ROUTE RESULTS ===
        result_route = [
            DiscreteResultRoute(
                route_id=r,
                average_utilization=safe_mean(self.env.route_util_mon[r]),
                average_travel_time=safe_mean(self.env.route_travel_time_mon[r]),
                average_travel_distance=safe_mean(self.env.route_travel_dist_mon[r]),
                average_waiting_time=safe_mean(self.env.route_waiting_mon[r]),
                average_queue_length=safe_mean(self.env.route_queue_mon[r]),
                customers_count=self.env.route_customer_count[r],
                min_waiting_time=self._min_monitor(self.env.route_waiting_mon[r]),
                max_waiting_time=self._max_monitor(self.env.route_waiting_mon[r]),
            )
            for r in self.env.route_util_mon
        ]

        return DiscreteSimulationResponse(
            result="success",
            simulation_result=DiscreteSimulationResult(
                result_summary=summary,
                result_station=result_station,
                result_route=result_route
            ),
            logs=self.env.logger.logs
        )

    @staticmethod
    def _min_monitor(mon, default=-99999.9):
        """Get minimum value from monitor"""
        if mon is None or mon.number_of_entries() == 0:
            return default
        return float(min(mon._x)) if hasattr(mon, '_x') and mon._x else default

    @staticmethod
    def _max_monitor(mon, default=-99999.9):
        """Get maximum value from monitor"""
        if mon is None or mon.number_of_entries() == 0:
            return default
        return float(max(mon._x)) if hasattr(mon, '_x') and mon._x else default


class DiscreteStation(sim.Component):
    """Station entity in discrete simulation"""
    def __init__(self, name, env):
        super().__init__(name=name, env=env)
        self.name = name
        self.wait_store = sim.Store(env=env, capacity=sim.inf)


# Alias for compatibility
Station = DiscreteStation


class DiscretePassenger(sim.Component):
    """Passenger entity - arrives at exact time, boards bus, departs"""
    def __init__(self, station, origin_route_id, env):
        super().__init__(env=env)
        self.station = station
        self.arrival_time = env.now()
        self.origin_route_id = origin_route_id  # Which route they're interested in
        self.boarding_time = None
        self.alighting_time = None

    def process(self):
        """Process passenger lifecycle"""
        add_log(
            self.env,
            component="DiscretePassenger",
            message=f"Passenger arrives at {self.station.name} at {self.arrival_time:.2f}"
        )
        
        # Enter waiting queue
        yield self.to_store(self.station.wait_store, self)
        
        # Tally queue length
        engine = self.env.sim_engine
        engine.env.station_queue_mon[self.station.name].tally(
            self.station.wait_store.length()
        )
        
        # Wait for bus to pick them up (passivated, awakened when bus calls from_store)
        yield self.passivate()
        
        # Calculate waiting time (passenger wakes up after boarding)
        self.boarding_time = self.env.now()
        waiting_time = self.boarding_time - self.arrival_time
        
        # Record waiting time
        engine.env.global_waiting_mon.tally(waiting_time)
        engine.env.station_waiting_mon[self.station.name].tally(waiting_time)
        if self.origin_route_id:
            engine.env.route_waiting_mon[self.origin_route_id].tally(waiting_time)
        
        add_log(
            self.env,
            component="DiscretePassenger",
            message=f"Passenger boarded, waited {waiting_time:.2f} min"
        )
        
        # Wait until alighted (passivated again, awakened by bus calling activate())
        yield self.passivate()
        
        self.alighting_time = self.env.now()
        add_log(
            self.env,
            component="DiscretePassenger",
            message=f"Passenger alighted"
        )


class DiscreteArrivalGenerator(sim.Component):
    """Generate passenger arrivals from day template"""
    def __init__(self, day_template, stations, time_ctx, env):
        super().__init__(env=env)
        self.day_template = day_template
        self.stations = stations
        self.time_ctx = time_ctx

    def process(self):
        """Schedule all arrivals from day template"""
        # Parse and sort arrivals by time
        arrivals_with_parsed_time = []
        for arrival in self.day_template.arrivals:
            station_name = arrival.station_name
            arrival_time = self._parse_arrival_time(arrival.arrival_time)
            arrivals_with_parsed_time.append((arrival_time, station_name, arrival))
        
        # Sort by time
        arrivals_with_parsed_time.sort(key=lambda x: x[0])
        
        last_time = self.env.now()
        for arrival_time, station_name, arrival in arrivals_with_parsed_time:
            # Calculate time to wait until this arrival
            time_to_wait = arrival_time - last_time
            
            if time_to_wait > 0:
                yield self.hold(time_to_wait)
            
            if station_name in self.stations:
                DiscretePassenger(
                    station=self.stations[station_name],
                    origin_route_id=None,  # In discrete sim, passengers don't have origin route
                    env=self.env
                )
                
                # Update station passenger count
                self.env.sim_engine.env.station_passenger_count[station_name] += 1
                
                add_log(
                    self.env,
                    component="DiscreteArrivalGenerator",
                    message=f"Scheduled arrival at {station_name} at {self.env.now():.2f}"
                )
            
            last_time = self.env.now()

    def _parse_arrival_time(self, time_str: str) -> float:
        """
        Parse arrival time string to minutes relative to simulation start.
        Supports: "HH:MM:SS", "HH:MM", "MM:SS", or direct minute value
        
        Returns minutes from simulation start (real_start)
        """
        try:
            if isinstance(time_str, (int, float)):
                return float(time_str)
            
            parts = time_str.split(":")
            if len(parts) == 3:  # HH:MM:SS
                h, m, s = map(int, parts)
                real_minute = h * 60 + m + s / 60
            elif len(parts) == 2:  # HH:MM or MM:SS
                # Try to determine if it's HH:MM or MM:SS
                a, b = map(int, parts)
                if a >= 24:  # Assume it's MM:SS if hours > 24
                    real_minute = a + b / 60
                else:
                    # Assume HH:MM
                    real_minute = a * 60 + b
            else:
                return float(time_str)
            
            # Convert to simulation time (relative to real_start)
            sim_minute = real_minute - self.time_ctx.real_start
            return max(sim_minute, 0)  # Ensure non-negative
        except Exception as e:
            print(f"Error parsing arrival time {time_str}: {e}")
            return 0.0


class DiscreteBus(sim.Component):
    """Bus entity - departs on schedule, picks up/drops off passengers"""
    def __init__(
        self,
        route_id,
        route,
        capacity,
        max_distance,
        depart_time,
        alighting_rules,
        time_ctx,
        travel_times,
        travel_distances,
        env
    ):
        super().__init__(env=env)
        self.route_id = route_id
        
        # Assign bus number
        self.env.route_bus_seq[self.route_id] += 1
        self.bus_no = self.env.route_bus_seq[self.route_id]
        self.bus_id = f"{self.route_id}-#{self.bus_no}"
        
        self.route = route
        self.capacity = capacity
        self.depart_time = depart_time
        self.time_ctx = time_ctx
        self.travel_times = travel_times
        self.travel_distances = travel_distances
        self.alighting_rules = alighting_rules
        
        self.passengers = []
        self.max_distance_init = max_distance
        self.remaining_distance = max_distance
        self.total_travel_time = 0.0
        self.total_travel_distance = 0.0
        self.current_station = None
        self.current_stop_index = 0

    def process(self):
        """Bus route process"""
        # Wait for departure time
        delay = self.depart_time - self.env.now()
        if delay > 0:
            yield self.hold(delay)
        
        # Check if max buses already running
        active = self.env.route_active_bus[self.route_id]
        max_bus = self.env.route_max_bus[self.route_id]
        
        if active >= max_bus:
            add_log(
                self.env,
                component="DiscreteBus",
                message=f"Bus {self.bus_id} NOT departed (active={active}, max={max_bus})"
            )
            return
        
        self.env.route_active_bus[self.route_id] += 1
        add_log(
            self.env,
            component="DiscreteBus",
            message=f"Bus {self.bus_id} departed, active={self.env.route_active_bus[self.route_id]}/{max_bus}"
        )
        
        # Visit each station in route
        try:
            for stop_idx, station in enumerate(self.route):
                self.current_station = station
                self.current_stop_index = stop_idx
                
                # Arrive at station
                add_log(
                    self.env,
                    component="DiscreteBus",
                    message=f"Bus {self.bus_id} arrives at {station.name}"
                )
                
                # ===== ALIGHTING =====
                yield self.hold(0.1)  # Small delay for alighting
                passengers_to_alight = []
                # In discrete sim, all passengers alight at final station
                is_final = (stop_idx == len(self.route) - 1)
                if is_final:
                    passengers_to_alight = self.passengers[:]
                else:
                    # Some passengers may alight at intermediate stations (randomized)
                    passengers_to_alight = [p for p in self.passengers if random.random() < 0.1]
                
                for p in passengers_to_alight:
                    self.passengers.remove(p)
                    p.activate()  # Wake up passenger from second passivate
                    add_log(
                        self.env,
                        component="DiscreteBus",
                        message=f"Bus {self.bus_id} drops {p.name} at {station.name}"
                    )
                
                # ===== BOARDING =====
                yield self.hold(0.1)  # Small delay for boarding
                boarded = 0
                while len(self.passengers) < self.capacity and station.wait_store.length() > 0:
                    p = yield self.from_store(station.wait_store)
                    if p is None:
                        break
                    
                    self.passengers.append(p)
                    # Record route utilization
                    utilization = len(self.passengers) / self.capacity
                    self.env.route_util_mon[self.route_id].tally(utilization)
                    self.env.route_customer_count[self.route_id] += 1
                    boarded += 1
                    # NOTE: p automatically awakens from first passivate when removed from store
                    add_log(
                        self.env,
                        component="DiscreteBus",
                        message=f"Bus {self.bus_id} picks {p.name} at {station.name} (load: {len(self.passengers)}/{self.capacity})"
                    )
                
                if boarded == 0 and len(self.passengers) == 0:
                    add_log(
                        self.env,
                        component="DiscreteBus",
                        message=f"Bus {self.bus_id} at {station.name}: no passengers"
                    )
                
                # ===== TRAVEL TO NEXT STATION =====
                if stop_idx < len(self.route) - 1:
                    next_station = self.route[stop_idx + 1]
                    travel_time = self.travel_times.get((station.name, next_station.name), 5.0)
                    travel_dist = self.travel_distances.get((station.name, next_station.name), 0.0)
                    
                    self.total_travel_time += travel_time
                    self.total_travel_distance += travel_dist
                    self.remaining_distance -= travel_dist
                    
                    add_log(
                        self.env,
                        component="DiscreteBus",
                        message=f"Bus {self.bus_id} travels to {next_station.name} ({travel_time:.2f} min, {travel_dist:.2f} dist)"
                    )
                    
                    yield self.hold(travel_time)
                    
                    # Record travel metrics
                    self.env.global_travel_time_mon.tally(travel_time)
                    self.env.global_travel_dist_mon.tally(travel_dist)
                    self.env.route_travel_time_mon[self.route_id].tally(travel_time)
                    self.env.route_travel_dist_mon[self.route_id].tally(travel_dist)
        
        finally:
            self.env.route_active_bus[self.route_id] -= 1
            add_log(
                self.env,
                component="DiscreteBus",
                message=f"Bus {self.bus_id} finished route, active={self.env.route_active_bus[self.route_id]}"
            )


def safe_mean(mon, default=-99999.9):
    """Get mean value from monitor"""
    if mon is None:
        return default
    try:
        v = mon.mean()
        if v is None or math.isnan(v):
            return default
        return float(v)
    except:
        return default
