# Discrete Event Simulation Feature

## Summary

A new discrete event simulation mode has been added to the backend that enables direct calculation of bus transit metrics based on exact passenger arrival times, without requiring distribution fitting.

## What Was Created

### New Files

1. **Schemas** (`app/schemas/DiscreteSimulation.py`)
   - `DayTemplate`: Defines exact passenger arrivals
   - `PassengerArrival`: Individual arrival event
   - `DiscreteSimulationRequest`: API request schema
   - `DiscreteSimulationResponse`: API response schema
   - Result schemas for summary, station-level, and route-level metrics

2. **Services**
   - `discrete_simulation_engine.py`: Core simulation logic with `DiscreteSimulationEngine`
   - `discrete_simulation_mapper.py`: Configuration builder from requests
   - `discrete_simulation_runner.py`: Simulation orchestrator

3. **Routes** (`app/api/routes/discrete_simulation_route.py`)
   - `/api/discrete-simulate` POST endpoint

4. **Documentation**
   - `DISCRETE_SIMULATION_GUIDE.md`: Detailed user guide
   - `tests/example_discrete_simulation.py`: Working example

5. **Main App Updated** (`app/main.py`)
   - Registered new route in FastAPI application

## Key Features

- **Exact Arrivals**: Specify exact times for passenger arrivals (format: "HH:MM:SS", "HH:MM", or minutes)
- **No Distribution Fitting**: Directly simulate with specified data
- **Comprehensive Metrics**: Calculates:
  - Waiting time (min, avg, max)
  - Queue length (average)
  - Bus utilization (average)
  - Travel time (min, avg, max)
  - Travel distance (average)
- **Aggregated Results**: Per station and per route
- **Discrete Events**: Event-driven simulation for precision
- **Detailed Logs**: Every simulation event is logged for debugging

## Architecture

### Simulation Flow

```
Day Template (arrivals)
       ↓
DiscreteArrivalGenerator (schedules arrivals)
       ↓
DiscretePassenger (created at exact times)
       ↓
Passenger enters queue at station.wait_store
       ↓
DiscreteBus (follows schedule, picks up passengers)
       ↓
Metrics recorded (waiting time, utilization, etc.)
       ↓
Passenger alights at destination
       ↓
Simulation results aggregated
```

### Classes

| Class                      | Purpose                                                  |
| -------------------------- | -------------------------------------------------------- |
| `DiscreteSimulationEngine` | Main simulation engine, coordinates all entities         |
| `DiscreteBus`              | Bus that follows schedule, picks up/drops off passengers |
| `DiscretePassenger`        | Passenger created at exact arrival time                  |
| `DiscreteStation`          | Station with passenger queue                             |
| `DiscreteArrivalGenerator` | Generates passenger arrivals from day template           |
| `SimulationLogger`         | Records event logs                                       |

## API Endpoint

### POST `/api/discrete-simulate`

**Request Format:**

```json
{
  "time_period": "08:00-20:00",
  "time_slot": 60,
  "day_template": {
    "arrivals": [
      {
        "station_name": "Central Station",
        "arrival_time": "08:00:00"
      },
      {
        "station_name": "Central Station",
        "arrival_time": "08:05:15"
      }
    ]
  },
  "configuration_data": { ... },
  "scenario_data": [ ... ]
}
```

**Response Format:**

```json
{
  "result": "success",
  "simulation_result": {
    "result_summary": {
      "average_waiting_time": 5.23,
      "average_queue_length": 2.15,
      "average_utilization": 0.65,
      "average_travel_time": 12.4,
      "average_travel_distance": 8.5,
      "total_passengers": 150,
      "min_waiting_time": 0.5,
      "max_waiting_time": 25.3
    },
    "result_station": [ ... ],
    "result_route": [ ... ]
  },
  "logs": [ ... ]
}
```

## Differences from Distribution-Based Simulation

| Aspect             | Distribution-Based                           | Discrete (Day Template)            |
| ------------------ | -------------------------------------------- | ---------------------------------- |
| **Arrival Source** | Probability distributions (fitted from data) | Exact times from day template      |
| **Data Process**   | Fit distributions to historical data         | Use actual/desired arrival pattern |
| **Use Case**       | Route planning, capacity analysis            | Daily operations, what-if analysis |
| **Flexibility**    | Good for typical/average scenarios           | Best for specific day scenarios    |
| **Speed**          | Slower (sampling from distributions)         | Faster (direct calculation)        |
| **Accuracy**       | Statistical                                  | Exact event timing                 |
| **API Endpoint**   | `/api/simulate`                              | `/api/discrete-simulate`           |

## How to Use

### Python Example

```python
from app.schemas.DiscreteSimulation import DiscreteSimulationRequest, DayTemplate, PassengerArrival
from app.services.discrete_simulation_runner import run_discrete_simulation

# Create day template
day_template = DayTemplate(
    arrivals=[
        PassengerArrival(station_name="Central", arrival_time="08:00:00"),
        PassengerArrival(station_name="Central", arrival_time="08:05:15"),
        PassengerArrival(station_name="North", arrival_time="08:10:00"),
    ]
)

# Create request
request = DiscreteSimulationRequest(
    time_period="08:00-20:00",
    time_slot=60,
    day_template=day_template,
    configuration_data=config_data,
    scenario_data=scenario_data
)

# Run simulation
response = run_discrete_simulation(request)

# Access results
print(f"Avg waiting time: {response.simulation_result.result_summary.average_waiting_time:.2f} min")
print(f"Total passengers: {response.simulation_result.result_summary.total_passengers}")
print(f"Avg utilization: {response.simulation_result.result_summary.average_utilization:.1%}")
```

### API Example (cURL)

```bash
curl -X POST "http://localhost:8000/api/discrete-simulate" \
  -H "Content-Type: application/json" \
  -d '{
    "time_period": "08:00-10:00",
    "time_slot": 60,
    "day_template": {
      "arrivals": [
        {"station_name": "Central", "arrival_time": "08:00:00"},
        {"station_name": "North", "arrival_time": "08:05:00"}
      ]
    },
    "configuration_data": {...},
    "scenario_data": [...]
  }'
```

## Testing

Run the example simulation:

```bash
cd DeSS_T_Backend-python
python -m pytest tests/example_discrete_simulation.py -v
# or
python tests/example_discrete_simulation.py
```

## Arrival Time Formats

The system supports multiple time formats in the `arrival_time` field:

| Format   | Example    | Meaning                           |
| -------- | ---------- | --------------------------------- |
| HH:MM:SS | "08:30:45" | 8 hours, 30 minutes, 45 seconds   |
| HH:MM    | "08:30"    | 8 hours, 30 minutes               |
| MM:SS    | "30:45"    | 30 minutes, 45 seconds            |
| Integer  | 485        | 485 minutes from simulation start |

**Note:** Times are relative to the simulation's `real_start` time. If the simulation period is "08:00-20:00", then "08:00:00" = time 0 in the simulation.

## Metric Definitions

### Waiting Time

- **Definition**: Time between passenger arrival and boarding (entering bus)
- **Aggregation**: Average, minimum, maximum per station/route
- **Unit**: Minutes

### Queue Length

- **Definition**: Number of passengers waiting at a station
- **Aggregation**: Average queue length per station/route
- **Unit**: Number of passengers

### Utilization

- **Definition**: Number of passengers on bus divided by bus capacity
- **Aggregation**: Average utilization per route
- **Unit**: Percentage (0-1)

### Travel Time

- **Definition**: Time bus spends traveling between consecutive stations
- **Aggregation**: Average, minimum, maximum per route
- **Unit**: Minutes

### Travel Distance

- **Definition**: Distance between consecutive stations (from configuration)
- **Aggregation**: Average per route
- **Unit**: km or defined unit

## Important Notes

1. **Time Format**: All times must be in HH:MM:SS format and within the `time_period`
2. **Station Names**: Stations in `day_template.arrivals` must exist in `configuration_data.station_list`
3. **Schedule**: Buses follow their defined schedules regardless of passenger demand
4. **Queue Management**: FIFO (first in, first out) queue discipline
5. **Capacity Constraints**: Buses cannot exceed their defined capacity
6. **Distance Limits**: Buses respect their maximum distance limit

## Example Output Interpretation

```
Average Waiting Time: 5.23 minutes
  → Passengers wait on average 5.23 minutes for a bus

Average Queue Length: 2.15 passengers
  → At any given time, about 2 passengers are waiting

Average Utilization: 0.65 (65%)
  → Buses run at 65% capacity on average

Average Travel Time: 12.4 minutes
  → Each bus segment takes 12.4 minutes

Total Passengers: 150
  → 150 passengers in today's template
```

## Troubleshooting

**Issue**: Passengers not being picked up

- Check that stations in `day_template` match `configuration_data.station_list` exactly
- Verify bus schedules have departures after passenger arrivals

**Issue**: Zero utilization

- Ensure buses have departures
- Check that passenger arrivals are within the simulation time period

**Issue**: Very high waiting times

- May indicate insufficient buses or poor scheduling
- Consider adding more bus departures

**Issue**: Parse error in arrival time

- Verify time format: "HH:MM:SS" or "HH:MM"
- Check that times are within the simulation period

## Files Summary

```
DeSS_T_Backend-python/
├── app/
│   ├── main.py (UPDATED - added discrete_simulation router)
│   ├── api/routes/
│   │   └── discrete_simulation_route.py (NEW)
│   ├── schemas/
│   │   └── DiscreteSimulation.py (NEW)
│   └── services/
│       ├── discrete_simulation_engine.py (NEW)
│       ├── discrete_simulation_mapper.py (NEW)
│       └── discrete_simulation_runner.py (NEW)
├── tests/
│   └── example_discrete_simulation.py (NEW)
├── DISCRETE_SIMULATION_GUIDE.md (NEW)
└── README_DISCRETE_SIMULATION.md (THIS FILE)
```

## Next Steps

1. **Test with your data**: Create a day template with your actual passenger arrivals
2. **Analyze results**: Use the provided metrics to optimize schedules
3. **Iterate**: Run multiple simulations with different passenger patterns
4. **Compare**: Use with distribution-based simulation to validate patterns

## Questions?

Refer to:

- `DISCRETE_SIMULATION_GUIDE.md` for detailed technical documentation
- `tests/example_discrete_simulation.py` for code examples
- API documentation at `/docs` (FastAPI Swagger UI)
