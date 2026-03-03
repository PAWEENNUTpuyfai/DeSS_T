# Combined Simulation - User Guide

## Overview

The **Combined Simulation** feature allows running both regular (distribution-based) and discrete event simulations in a single request. Results from the discrete simulation are automatically saved to JSON file.

This is perfect for:

- Comparing real-world (discrete) vs typical-day (distribution) patterns
- Validating route schedules with actual passenger data
- Performance analysis dashboard showing both perspectives

## API Endpoint

### POST `/api/simulate-combined`

Runs both simulations and returns combined results with discrete results saved to file.

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
      ...
    ]
  },
  "configuration_data": { ... },
  "scenario_data": [ ... ],
  "output_filename": "my_discrete_sim"
}
```

### Request Fields

| Field                | Type    | Required    | Description                                                                  |
| -------------------- | ------- | ----------- | ---------------------------------------------------------------------------- |
| `time_period`        | string  | ✅ Yes      | Format: "HH:MM-HH:MM" (e.g., "08:00-20:00")                                  |
| `time_slot`          | integer | ✅ Yes      | Slot duration in minutes                                                     |
| `configuration_data` | object  | ✅ Yes      | Stations and route pairs                                                     |
| `scenario_data`      | array   | ✅ Yes      | Bus schedules and information                                                |
| `day_template`       | object  | ⭕ Optional | Passenger arrival times for discrete simulation                              |
| `output_filename`    | string  | ⭕ Optional | Custom filename for saving discrete results (auto-generated if not provided) |

## Response Format

```json
{
  "result": "success",
  "regular_simulation": {
    "result_summary": { ... },
    "slot_results": [ ... ]
  },
  "discrete_simulation": {
    "result_summary": { ... },
    "result_station": [ ... ],
    "result_route": [ ... ]
  },
  "saved_file": {
    "filename": "my_discrete_sim.json",
    "path": "/path/to/uploads/simulations/my_discrete_sim.json",
    "size": 12345,
    "created_at": "2026-03-03T10:30:45.123456"
  },
  "logs": [ ... ]
}
```

## Response Fields

| Field                 | Type   | Content                                                          |
| --------------------- | ------ | ---------------------------------------------------------------- |
| `result`              | string | "success" or "failed"                                            |
| `regular_simulation`  | object | Results from distribution-based simulation                       |
| `discrete_simulation` | object | Results from discrete event simulation (null if no day_template) |
| `saved_file`          | object | Info about saved JSON file (null if no day_template)             |
| `logs`                | array  | Combined logs from both simulations                              |

## How It Works

### Workflow

```
Request with day_template
      ↓
┌─────┴──────────────────────────────┐
│                                    │
↓                                    ↓
Regular Simulation              Discrete Simulation
(Distribution-based)            (Day Template)
      ↓                                ↓
   Results ←──────────────────→    Results
                                     ↓
                              Save to JSON
      ↓                                ↓
      └────────────────┬───────────────┘
                       ↓
          Combined Response
          (both + file info)
```

### Step-by-Step

1. **Receive request** with time period, config, and optional day_template
2. **Run regular simulation** using distribution-based approach
3. **Run discrete simulation** If day_template is provided
4. **Save results** Discrete simulation results written to JSON file
5. **Return response** Both results + file information combined

## File Structure

Discrete simulation results are saved to:

```
DeSS_T_Backend-python/
└── uploads/
    └── simulations/
        ├── discrete_simulation_20260303_103045.json
        ├── my_custom_name.json
        └── ...
```

## Example Usage (Python)

```python
from app.schemas.CombinedSimulation import CombinedSimulationRequest
from app.services.combined_simulation_runner import run_combined_simulation

# Create request
request = CombinedSimulationRequest(
    time_period="08:00-20:00",
    time_slot=60,
    day_template=DayTemplate(...),
    configuration_data=ConfigurationData(...),
    scenario_data=[...],
    output_filename="daily_run_march3"
)

# Run combined simulation
response = run_combined_simulation(request)

# Access results
print(f"Regular avg wait: {response.regular_simulation.result_summary.average_waiting_time:.2f}")
print(f"Discrete avg wait: {response.discrete_simulation.result_summary.average_waiting_time:.2f}")
print(f"Saved to: {response.saved_file.path}")

# Load saved JSON
import json
with open(response.saved_file.path) as f:
    discrete_data = json.load(f)
```

## Example Usage (cURL)

```bash
curl -X POST "http://localhost:8000/api/simulate-combined" \
  -H "Content-Type: application/json" \
  -d '{
    "time_period": "08:00-12:00",
    "time_slot": 60,
    "day_template": {
      "arrivals": [
        {"station_name": "Central", "arrival_time": "08:00:00"},
        {"station_name": "North", "arrival_time": "08:05:00"}
      ]
    },
    "configuration_data": { ... },
    "scenario_data": [ ... ],
    "output_filename": "test_run"
  }'
```

## When to Use

### Use Regular Simulation Only

- Performance testing without specific passenger data
- Capacity planning for typical days
- Schedule optimization with expected patterns

### Use Combined Simulation

- Validating schedules against real passenger data
- Comparing actual vs typical performance
- Analyzing specific days or events
- Performance dashboards (show both metrics)

### Day Template Only (Discrete)

- Post-event analysis with exact passenger counts
- Specific scenario analysis
- Detailed event timeline analysis

## Benefits

| Aspect                | Regular | Discrete | Combined |
| --------------------- | ------- | -------- | -------- |
| **Use Real Data**     | ✗       | ✓        | ✓        |
| **Sees Distribution** | ✓       | ✗        | ✓        |
| **Fast**              | ✓       | ✓        | ✓        |
| **File Output**       | ✗       | ✓        | ✓        |
| **Comparison**        | ✗       | ✗        | ✓        |

## Output File Content

The saved JSON file contains:

```json
{
  "timestamp": "2026-03-03T10:30:45.123456",
  "result": "success",
  "simulation_result": {
    "result_summary": {
      "average_waiting_time": 5.23,
      "average_queue_length": 2.15,
      ...
    },
    "result_station": [ ... ],
    "result_route": [ ... ]
  },
  "logs_count": 1250,
  "sample_logs": [ ... ]
}
```

## Notes

1. **day_template is optional**: If not provided, only regular simulation runs
2. **No overwriting**: Each run gets a unique timestamp if filename not specified
3. **File location**: All files saved in `uploads/simulations/` directory
4. **File size**: Depends on passenger count and simulation period (typically 50KB-500KB)
5. **Logs**: Both simulation logs are combined in the response

## Error Handling

If simulation fails:

```json
{
  "detail": "Simulation failed: [error message]"
}
```

Common errors:

- Invalid time format
- Station name mismatch
- Missing configuration
- Invalid day_template

## Frontend Integration Example

```javascript
// Frontend code to call combined simulation

const request = {
  time_period: "08:00-20:00",
  time_slot: 60,
  day_template: {
    arrivals: [
      { station_name: "Central", arrival_time: "08:00:00" },
      ...
    ]
  },
  configuration_data: configData,
  scenario_data: scenarioData,
  output_filename: `simulation_${new Date().getTime()}`
};

const response = await fetch('/api/simulate-combined', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(request)
});

const result = await response.json();

// Access results
console.log('Regular waiting time:', result.regular_simulation.result_summary.average_waiting_time);
console.log('Discrete waiting time:', result.discrete_simulation.result_summary.average_waiting_time);
console.log('Saved to:', result.saved_file.filename);
```

## Testing

Run the example:

```bash
python tests/example_combined_simulation.py
```

This will:

1. Create sample configuration
2. Create sample day template
3. Run combined simulation
4. Display results comparison
5. Show file save information
