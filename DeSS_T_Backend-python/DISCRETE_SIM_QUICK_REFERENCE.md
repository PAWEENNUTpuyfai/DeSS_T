# Discrete Event Simulation - Quick Reference

## What It Does

Simulates bus transit system behavior with **exact passenger arrival times** instead of probability distributions. Perfect for daily operations analysis and what-if scenarios.

## Endpoint

```
POST /api/discrete-simulate
```

## Minimum Request

```json
{
  "time_period": "08:00-20:00",
  "time_slot": 60,
  "day_template": {
    "arrivals": [
      {"station_name": "Station A", "arrival_time": "08:00:00"},
      {"station_name": "Station A", "arrival_time": "08:05:00"}
    ]
  },
  "configuration_data": { ... },
  "scenario_data": [ ... ]
}
```

## Output Metrics

| Metric               | Location                                 | Values     |
| -------------------- | ---------------------------------------- | ---------- |
| **Waiting Time**     | `result_summary.average_waiting_time`    | minutes    |
| **Queue Length**     | `result_summary.average_queue_length`    | passengers |
| **Utilization**      | `result_summary.average_utilization`     | 0.0-1.0    |
| **Travel Time**      | `result_summary.average_travel_time`     | minutes    |
| **Travel Distance**  | `result_summary.average_travel_distance` | km         |
| **Total Passengers** | `result_summary.total_passengers`        | count      |

Plus per-station and per-route breakdowns!

## Time Formats Supported

```
"08:30:45"    → 8 hours, 30 mins, 45 secs
"08:30"       → 8 hours, 30 mins
"30:45"       → 30 mins, 45 secs
485           → 485 minutes from start
```

## Key Differences vs. Distribution-Based Simulation

```
DISTRIBUTION-BASED SIMULATION
├─ Sends: Statistical distributions for arrivals
├─ Process: Fits distributions, samples during simulation
├─ Best for: Average/typical day analysis
└─ Endpoint: /api/simulate

DISCRETE (DAY TEMPLATE) SIMULATION
├─ Sends: Exact arrival times
├─ Process: Direct calculation, no sampling
├─ Best for: Specific day analysis, what-if scenarios
└─ Endpoint: /api/discrete-simulate
```

## Typical Workflow

1. **Prepare Day Template**

   ```json
   "day_template": {
     "arrivals": [
       {"station_name": "Central", "arrival_time": "08:00:00"},
       {"station_name": "Central", "arrival_time": "08:02:30"},
       ...
     ]
   }
   ```

2. **Add Configuration & Scenarios** (same as regular simulation)

   ```json
   "configuration_data": {...},
   "scenario_data": [...]
   ```

3. **Send Request to `/api/discrete-simulate`**

4. **Analyze Results**
   ```python
   response.simulation_result.result_summary.average_waiting_time
   response.simulation_result.result_station
   response.simulation_result.result_route
   ```

## Implementation Details

### Main Components

```python
DiscreteSimulationEngine         # Main simulation orchestrator
├── DiscreteStation              # Passenger queue at station
├── DiscretePassenger            # Individual passenger entity
├── DiscreteBus                  # Bus following schedule
└── DiscreteArrivalGenerator     # Schedules arrivals from day template
```

### Metrics Collected

- **Per Passenger**: Arrival time, boarding time, alighting time, waiting time
- **Per Bus**: Utilization, travel time, travel distance, passengers carried
- **Per Station**: Queue length, waiting times, passenger counts
- **Global**: Aggregated across all entities

### Time Simulation

- Discrete event-driven (no continuous time sampling)
- Events: passenger arrivals, bus departures, pickups, drop-offs
- All times in minutes relative to simulation start

## Common Use Cases

### Use Case 1: Peak Hour Analysis

```python
# Create arrivals for 8:00-9:00 AM
arrivals = [
    {"station_name": "Central", "arrival_time": "08:00:00"},
    {"station_name": "Central", "arrival_time": "08:01:30"},
    # ... more arrivals
]
# Check if current schedule handles peak demand
```

### Use Case 2: New Schedule Evaluation

```python
# Test new bus schedule with expected passenger pattern
day_template = {expected_peak_hours_data}
scenario_data = {new_schedule_candidate}
# Compare results vs old schedule
```

### Use Case 3: Special Event Planning

```python
# Model passenger arrivals for special event
# (e.g., concert, sports, conference)
day_template = {event_specific_arrivals}
# Determine if bus capacity/frequency is sufficient
```

## Quick Test

```bash
# Using Python
python tests/example_discrete_simulation.py

# Using cURL
curl -X POST http://localhost:8000/api/discrete-simulate \
  -H "Content-Type: application/json" \
  -d @request.json
```

## Result Interpretation

```
average_waiting_time: 5.23 min
  ↳ Passengers wait 5.23 min on average

average_queue_length: 2.1
  ↳ ~2 passengers waiting at any time

average_utilization: 0.68
  ↳ Buses 68% full on average

average_travel_time: 12.4 min
  ↳ Each route segment takes 12.4 min

total_passengers: 150
  ↳ 150 passengers simulated
```

## Constraints & Assumptions

✓ **Supported**

- Multiple stations
- Multiple routes
- Variable bus capacities
- Bus schedules (departures)
- Time-based analyses

✗ **Not Supported (by design)**

- Probability distributions (use exact times)
- Adaptive routing (follows fixed routes)
- Passenger origin-destination pairing (all board available bus)
- Real-time dynamics (pre-determined schedule)

## Performance

- **Small dataset** (< 100 passengers): < 1 second
- **Medium dataset** (100-500 passengers): 1-5 seconds
- **Large dataset** (500-2000 passengers): 5-20 seconds

Depends on:

- Number of passengers
- Number of buses
- Simulation period length
- Number of stations

## Troubleshooting Checklist

- [ ] Times within `time_period`?
- [ ] Station names exact match?
- [ ] Bus schedules after passenger arrivals?
- [ ] Realistic capacity values?
- [ ] Correct time format (HH:MM:SS)?

## See Also

- Full guide: `DISCRETE_SIMULATION_GUIDE.md`
- Code example: `tests/example_discrete_simulation.py`
- API playground: `http://localhost:8000/docs`
