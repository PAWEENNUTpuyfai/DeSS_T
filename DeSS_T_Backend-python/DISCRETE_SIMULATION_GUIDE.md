# Discrete Event Simulation - User Guide

## Overview

The discrete event simulation is a separate simulation mode designed for direct, exact-time passenger arrival calculations. Unlike the distribution-based simulation that generates passengers based on probability distributions, this simulation accepts a **day template** with specific arrival times.

## Key Features

- **Exact Arrival Times**: Specify exactly when passengers arrive at each station
- **Direct Calculation**: No distribution fitting, calculated directly from the day template
- **Comprehensive Metrics**: Calculates:
  - **Waiting time**: Time passengers spend waiting for a bus
  - **Queue length**: Number of passengers waiting at each station
  - **Utilization**: Bus occupancy rate (passengers / capacity)
  - **Travel time**: Time buses spend traveling between stations
  - **Travel distance**: Distance covered by each route

- **Aggregated Results**: Results are provided per station and per route

## API Endpoint

### POST `/api/discrete-simulate`

Runs a discrete event simulation with exact passenger arrivals.

## Request Format

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
      },
      {
        "station_name": "North Station",
        "arrival_time": "08:10:30"
      }
    ]
  },
  "configuration_data": {
    "station_list": [...],
    "route_pair": [...],
    "alighting_data": [...],
    "interarrival_data": [...]
  },
  "scenario_data": [...]
}
```

## Day Template Format

The `day_template` contains an array of arrival events:

```typescript
day_template: {
  arrivals: [
    {
      station_name: string,        // Name of the station
      arrival_time: string         // Format: "HH:MM:SS", "HH:MM", or minutes
    },
    ...
  ]
}
```

### Arrival Time Formats

Supported formats:

- **"HH:MM:SS"** - Hours, minutes, seconds (e.g., "08:30:45")
- **"MM:SS"** - Minutes and seconds (e.g., "05:30")
- **Direct number** - Minutes from simulation start (e.g., 485 for 8 hours 5 minutes)

## Response Format

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
    "result_station": [
      {
        "station_name": "Central Station",
        "average_waiting_time": 4.2,
        "average_queue_length": 2.0,
        "min_waiting_time": 0.5,
        "max_waiting_time": 18.5,
        "passengers_count": 50
      },
      ...
    ],
    "result_route": [
      {
        "route_id": "R1",
        "average_utilization": 0.75,
        "average_travel_time": 15.0,
        "average_travel_distance": 10.5,
        "average_waiting_time": 4.5,
        "average_queue_length": 2.2,
        "customers_count": 100,
        "min_waiting_time": 1.0,
        "max_waiting_time": 22.0
      },
      ...
    ]
  },
  "logs": [
    {
      "time": "08:00:00",
      "component": "DiscretePassenger",
      "message": "Passenger arrives at Central Station at 0.00"
    },
    ...
  ]
}
```

## Comparison with Distribution-Based Simulation

| Feature            | Distribution-Based                | Discrete (Day Template)             |
| ------------------ | --------------------------------- | ----------------------------------- |
| **Arrival Source** | Probability distributions         | Exact times (day template)          |
| **Data Fitting**   | Required (fit distributions)      | Not needed                          |
| **Flexibility**    | Good for typical patterns         | Best for specific day analysis      |
| **Accuracy**       | Statistical                       | Exact event timing                  |
| **Use Case**       | Route planning, capacity analysis | Daily operations, what-if scenarios |

## Implementation Details

### Classes

- **DiscreteSimulationEngine**: Main simulation engine
- **DiscreteBus**: Bus entities that follow schedule and pick up/drop off passengers
- **DiscretePassenger**: Passenger entities created at exact arrival times
- **DiscreteArrivalGenerator**: Schedules arrivals from day template
- **DiscreteStation**: Station entity for passenger queue management

### Simulation Flow

1. **Initialization**: Build all stations, routes, buses, and schedule arrivals
2. **Discrete Event Processing**: Run time-ordered events:
   - Passenger arrivals at specified times
   - Bus departures according to schedule
   - Passenger pickups and alightings
   - Travel between stations
3. **Metric Collection**: Track all metrics during simulation
4. **Results Aggregation**: Calculate statistics per station and route

### Time Handling

- All times are in **minutes** internally
- Time slots divide the simulation period for result aggregation
- Times are relative to the simulation start (first station in `time_period`)

## Example Usage (Python)

```python
from app.schemas.DiscreteSimulation import (
    DiscreteSimulationRequest,
    DayTemplate,
    PassengerArrival
)
from app.services.discrete_simulation_runner import run_discrete_simulation

# Create day template with specific arrivals
day_template = DayTemplate(
    arrivals=[
        PassengerArrival(station_name="Central", arrival_time="08:00:00"),
        PassengerArrival(station_name="Central", arrival_time="08:05:30"),
        PassengerArrival(station_name="North", arrival_time="08:10:00"),
        PassengerArrival(station_name="Central", arrival_time="08:15:45"),
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
print(f"Average waiting time: {response.simulation_result.result_summary.average_waiting_time:.2f} min")
print(f"Total passengers: {response.simulation_result.result_summary.total_passengers}")
```

## Advantages of Discrete Simulation

1. **Precision**: Know exactly how the system behaves with specific arrival patterns
2. **Realism**: Model real-world scenarios with actual passenger data
3. **Simplicity**: No need for distribution analysis and fitting
4. **Speed**: Direct calculation without statistical sampling
5. **Traceability**: Detailed logs show exactly what happens when

## Notes

- Ensure `dayTemplate` arrivals are within the `time_period`
- Stations in arrivals must exist in `configuration_data.station_list`
- Buses follow their schedules regardless of passenger demand
- Queue management is FIFO (first in, first out)
- Max buses per route is respected (no over-capacity departures)
