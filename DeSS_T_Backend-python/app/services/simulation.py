import salabim as sim
import random

sim.yieldless(False)

# --- CONFIGURATION ---
# Travel times (in minutes)
TRAVEL_TIMES = {
    ('A', 'B'): 10, ('B', 'C'): 15, ('C', 'A'): 12,
    ('A', 'C'): 11, ('C', 'B'): 14, ('B', 'A'): 13,
}

# Docking capacity per station
DOCK_CAPACITY = {'A': 2, 'B': 1, 'C': 1}

# Train routes (Route ID: [Station 1, Station 2, ...])
TRAIN_ROUTES = {
    'RedLine': ['A', 'B', 'C'],
    'BlueLine': ['A', 'C', 'B'],
}

STATION_STOP_TIME = 3          # Stop/Load/Unload time (minutes)
TRAIN_CAPACITY = 5             # Maximum passenger capacity
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


# --- 4. Component: Train ---
class Train(sim.Component):
    registry = []

    def __init__(self, route_id, route_stations, *args, **kwargs):
        super().__init__(*args, **kwargs)
        Train.registry.append(self)

        self.route_id = route_id
        self.route = [stations[name] for name in route_stations]
        self.capacity = TRAIN_CAPACITY
        self.passengers_on_board = []
        self.name = f"Train_{route_id}"
        self.route_index = 0
        self.current_station = self.route[0]

    def process(self):
        while True:
            yield self.request(self.current_station.dock)
            add_log(f"\n{self.env.now():.1f}: {self.name} is docking at {self.current_station.name}")

            # --- UNLOAD ---
            # NOTE: Unloading logic is simplified/randomized in this version
            is_last_station = (self.route_index == len(self.route) - 1)
            # Randomly decide how many passengers to unload (or all at the last station)
            n_unload = len(self.passengers_on_board) if is_last_station else random.randint(0, len(self.passengers_on_board)) 

            if n_unload > 0:
                for p in self.passengers_on_board[:n_unload]:
                    add_log(f"{self.env.now():.1f}: {self.name} - drops off {p.name}")
                    p.activate()

                self.passengers_on_board = self.passengers_on_board[n_unload:]
            else:
                add_log(f"{self.env.now():.1f}: {self.name} has no passengers to unload")

            add_log(f"{self.env.now():.1f}: {self.name} remaining passengers: {len(self.passengers_on_board)}")

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

            add_log(f"{self.env.now():.1f}: {self.name} loaded {loaded} | Total {len(self.passengers_on_board)} passengers")

            self.release(self.current_station.dock)

            # --- MOVE ---
            next_index = (self.route_index + 1) % len(self.route)
            next_station = self.route[next_index]
            travel_key = (self.current_station.name, next_station.name)
            travel_time = TRAVEL_TIMES[travel_key]

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
    Sets up and runs the Salabim transport system simulation model.
    """
    global stations, SIM_LOGS
    SIM_LOGS = []
    stations = {}

    # reset registry
    Train.registry = []
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

    # trains
    Train('R1', TRAIN_ROUTES['RedLine'])
    Train('R2', TRAIN_ROUTES['BlueLine'])

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

    # --- Train stats ---
    train_stats = [
        {
            "train": t.name,
            "route": [s.name for s in t.route],
            "final_station": t.current_station.name,
            "passengers_on_board": len(t.passengers_on_board)
        }
        for t in Train.registry
    ]

    return {
        "station_stats": station_stats,
        "train_stats": train_stats,
        "logs": SIM_LOGS
    }