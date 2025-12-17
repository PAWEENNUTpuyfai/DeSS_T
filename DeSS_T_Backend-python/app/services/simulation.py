import salabim as sim
import random

sim.yieldless(False)

# --- CONFIGURATION ---
# Travel times (in minutes)
TRAVEL_TIMES = {
    ('A', 'B'): 10, ('B', 'C'): 15, ('C', 'A'): 12,
    ('A', 'C'): 11, ('C', 'B'): 14, ('B', 'A'): 13,
}

# Docking capacity per station (Bus bays/platforms)
DOCK_CAPACITY = {'A': 2, 'B': 1, 'C': 1}

# Bus routes (Route ID: [Station 1, Station 2, ...])
BUS_ROUTES = { 
    'RedLine': ['A', 'B', 'C'],
    'BlueLine': ['A', 'C', 'B'],
}

STATION_STOP_TIME = 3          # Stop/Load/Unload time (minutes)
# BUS_CAPACITY = 5               # Maximum passenger capacity (Renamed from TRAIN_CAPACITY)
BUS_CAPACITY = { 'B1': 5, 'B2': 3, 'B3': 12 }  # Different capacities per bus
PASSENGER_INTERARRIVAL_MEAN = 5 # Mean inter-arrival time for passengers
SIMULATION_DURATION = 200      # Simulation duration (minutes)

stations = {}
SIM_LOGS = []

def add_log(msg: str):
    SIM_LOGS.append(msg)
    print(msg)

# --- 2. Station class (Station Container) ---
class Station:
    def __init__(self, name):
        self.name = name
        self.wait_store = sim.Store(f'Wait_{name}')
        self.dock = sim.Resource(f'Dock_{name}', capacity=DOCK_CAPACITY[name])
        stations[name] = self


# --- 3. Component: Passenger ---
class Passenger(sim.Component):
    registry = []

    def __init__(self, origin_station, *args, **kwargs):
        super().__init__(*args, **kwargs)
        Passenger.registry.append(self)
        self.origin = origin_station
        self.name(f"P_from_{self.origin.name}_{self.sequence_number()}")

    def process(self):
        add_log(f'{self.env.now():.1f}: {self.name} arrives at {self.origin.name}')
        self.to_store(self.origin.wait_store, self)
        yield self.passivate()
        add_log(f'{self.env.now():.1f}: {self.name} unloads (exits system)')

# --- 4. Component: Bus --- (Renamed from Train)
class Bus(sim.Component):
    registry = []

    def __init__(self, route_id, route_stations, bus_type, *args, **kwargs):
        super().__init__(*args, **kwargs)
        Bus.registry.append(self)

        self.route_id = route_id
        self.route = [stations[name] for name in route_stations]

        # ---------------------------
        # กำหนดความจุจาก bus_type
        # ---------------------------
        self.bus_type = bus_type
        self.capacity = BUS_CAPACITY[bus_type]   # ← ใช้ dictionary ที่ตั้งไว้

        self.passengers_on_board = []
        self.name = f"Bus_{route_id}_{bus_type}"
        self.route_index = 0
        self.current_station = self.route[0]

    def process(self):
        while True:
            yield self.request(self.current_station.dock)
            add_log(f"\n{self.env.now():.1f}: {self.name} docking at {self.current_station.name}")

            # --- UNLOAD ---
            is_last_station = (self.route_index == len(self.route) - 1)
            n_unload = len(self.passengers_on_board) if is_last_station else random.randint(0, len(self.passengers_on_board))

            if n_unload > 0:
                for p in self.passengers_on_board[:n_unload]:
                    add_log(f"{self.env.now():.1f}: {self.name} drops off {p.name}")
                    p.activate()

                self.passengers_on_board = self.passengers_on_board[n_unload:]
            else:
                add_log(f"{self.env.now():.1f}: {self.name} no passengers to unload")

            add_log(f"{self.env.now():.1f}: {self.name} remaining {len(self.passengers_on_board)} passengers")

            # --- STOP TIME ---
            yield self.hold(STATION_STOP_TIME)

            # --- LOAD ---
            loaded = 0
            while len(self.passengers_on_board) < self.capacity:
                p = self.from_store(self.current_station.wait_store)
                if not p:
                    break
                self.passengers_on_board.append(p)
                loaded += 1
                add_log(f"{self.env.now():.1f}: {self.name} picks up {p.name}")

            add_log(f"{self.env.now():.1f}: {self.name} loaded {loaded} | total {len(self.passengers_on_board)}")

            self.release(self.current_station.dock)

            # --- MOVE ---
            next_index = (self.route_index + 1) % len(self.route)
            next_station = self.route[next_index]
            travel_time = TRAVEL_TIMES[(self.current_station.name, next_station.name)]

            add_log(f"{self.env.now():.1f}: {self.name} traveling to {next_station.name} ({travel_time} minutes)")
            yield self.hold(travel_time)

            self.current_station = next_station
            self.route_index = next_index


# --- 5. Component: Arrival generator ---
class ArrivalGenerator(sim.Component):
    def __init__(self, origin_station, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.origin = origin_station
        self.interarrival = sim.Exponential(PASSENGER_INTERARRIVAL_MEAN)

    def process(self):
        while True:
            yield self.hold(self.interarrival.sample())
            Passenger(origin_station=self.origin)


# --- 6. Run simulation function ---
def run_simulation():
    """
    Sets up and runs the Salabim transport system simulation model using buses.
    """
    global stations, SIM_LOGS
    SIM_LOGS = []
    stations = {}

    # reset registry
    Bus.registry = [] # Changed registry
    Passenger.registry = []

    env = sim.Environment(random_seed=42)

    # stations
    station_A = Station('A')
    station_B = Station('B')
    station_C = Station('C')

    # generators
    ArrivalGenerator(station_A, name='Gen_A')
    ArrivalGenerator(station_B, name='Gen_B')
    ArrivalGenerator(station_C, name='Gen_C')

    # buses (Renamed from trains)
    Bus('R1', BUS_ROUTES['RedLine'],'B1') # Changed class and route dict reference
    Bus('R2', BUS_ROUTES['BlueLine'],'B2') # Changed class and route dict reference

    add_log("Starting simulation system")
    env.run(till=SIMULATION_DURATION)
    add_log("Simulation finished")

    # --- Station stats ---
    station_stats = {
        name: {
            "queue_mean": st.wait_store.length.mean(),
            "queue_max": st.wait_store.length.maximum()
        }
        for name, st in stations.items()
    }

    # --- Bus stats --- (Renamed from Train stats)
    bus_stats = [
        {
            "bus": t.name, # Changed key
            "route": [s.name for s in t.route],
            "final_station": t.current_station.name,
            "passengers_on_board": len(t.passengers_on_board)
        }
        for t in Bus.registry # Changed registry reference
    ]

    return {
        "station_stats": station_stats,
        "bus_stats": bus_stats, # Changed key
        "logs": SIM_LOGS
    }