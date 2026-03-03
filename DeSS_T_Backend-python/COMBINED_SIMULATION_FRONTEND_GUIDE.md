# Combined Simulation - Frontend Integration Guide

## Quick Start

เมื่อผู้ใช้เลือก **Day Template Mode** ที่ frontend:

1. **สร้าง day_template** จากผู้ใช้ input (เวลาที่ผู้โดยสารมา)
2. **เรียก API** `/api/simulate-combined`
3. **รับผลลัพธ์** ทั้ง regular + discrete + saved file info

## API Endpoint

```
POST /api/simulate-combined
Content-Type: application/json
```

## Minimal Request

```json
{
  "time_period": "08:00-20:00",
  "time_slot": 60,
  "configuration_data": { ... existing ... },
  "scenario_data": [ ... existing ... ],
  "day_template": {
    "arrivals": [
      {"station_name": "Station A", "arrival_time": "08:00:00"},
      {"station_name": "Station B", "arrival_time": "08:05:30"}
    ]
  }
}
```

## Response Structure

```json
{
  "result": "success",
  "regular_simulation": {
    "result_summary": {
      "average_waiting_time": 4.50,
      "average_queue_length": 1.20,
      "average_utilization": 0.65,
      "average_travel_time": 12.30,
      "average_travel_distance": 10.50
    }
  },
  "discrete_simulation": {
    "result_summary": {
      "average_waiting_time": 5.23,
      "average_queue_length": 2.15,
      "average_utilization": 0.68,
      "average_travel_time": 13.40,
      "average_travel_distance": 11.20,
      "total_passengers": 150,
      "min_waiting_time": 0.50,
      "max_waiting_time": 25.30
    },
    "result_station": [...],
    "result_route": [...]
  },
  "saved_file": {
    "filename": "discrete_simulation_20260303_103045.json",
    "path": "/path/to/simulations/discrete_simulation_20260303_103045.json",
    "size": 24567,
    "created_at": "2026-03-03T10:30:45.123456"
  },
  "logs": [...]
}
```

## JavaScript Example

### Basic Request

```javascript
async function runCombinedSimulation() {
  const request = {
    time_period: "08:00-20:00",
    time_slot: 60,
    configuration_data: getConfigurationData(), // existing
    scenario_data: getScenarioData(), // existing
    day_template: {
      arrivals: buildDayTemplate(), // user input: station + time
    },
    output_filename: `sim_${Date.now()}`, // optional
  };

  const response = await fetch("/api/simulate-combined", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const result = await response.json();
  return result;
}
```

### Display Results

```javascript
async function displayResults() {
  const result = await runCombinedSimulation();

  if (result.result === "success") {
    // Regular simulation results
    const regular = result.regular_simulation.result_summary;
    console.log(
      `Regular - Avg Wait: ${regular.average_waiting_time.toFixed(2)} min`,
    );
    console.log(
      `Regular - Utilization: ${(regular.average_utilization * 100).toFixed(1)}%`,
    );

    // Discrete simulation results
    const discrete = result.discrete_simulation.result_summary;
    console.log(
      `Discrete - Avg Wait: ${discrete.average_waiting_time.toFixed(2)} min`,
    );
    console.log(`Discrete - Passengers: ${discrete.total_passengers}`);
    console.log(
      `Discrete - Min/Max Wait: ${discrete.min_waiting_time.toFixed(2)}/${discrete.max_waiting_time.toFixed(2)} min`,
    );

    // Show saved file location
    console.log(`Results saved to: ${result.saved_file.filename}`);

    // Show comparison
    const waitDiff =
      discrete.average_waiting_time - regular.average_waiting_time;
    console.log(
      `Difference in avg wait: ${waitDiff > 0 ? "+" : ""}${waitDiff.toFixed(2)} min`,
    );
  }
}
```

### Download Saved File

```javascript
async function downloadDiscreteResults(response) {
  if (!response.saved_file) {
    console.log("No discrete simulation results to download");
    return;
  }

  // Option 1: Direct download
  const fileUrl = `/api/download/${response.saved_file.filename}`;
  window.open(fileUrl);

  // Option 2: Fetch and process
  const fileResponse = await fetch(response.saved_file.path);
  const data = await fileResponse.json();

  // Process or display data
  console.log("Discrete simulation results:", data);
}
```

## Frontend UI Suggestions

### Mode Selection

```
┌─────────────────────────────────────────┐
│ Simulation Mode:                        │
│ ☐ Regular (Distribution-based)         │
│ ☑ Day Template (Discrete)              │
│ ☐ Combined (Both)  ← DEFAULT            │
└─────────────────────────────────────────┘
```

### Day Template Input UI

```
┌─────────────────────────────────────────┐
│ Day Template - Passenger Arrivals       │
├─────────────────────────────────────────┤
│ Station      │ Time      │ Action      │
├──────────────┼───────────┼────────────┤
│ Central      │ 08:00:00  │ [X] Delete │
│ North        │ 08:05:15  │ [X] Delete │
│ South        │ 08:10:30  │ [X] Delete │
├──────────────┼───────────┼────────────┤
│ [+ Add More] │           │            │
└──────────────┴───────────┴────────────┘
```

### Results Display

```
┌────────────────────────────────────────────┐
│ SIMULATION RESULTS                         │
├────────────────────────────────────────────┤
│                                            │
│ 📊 REGULAR SIMULATION (Distribution-Based) │
│  • Avg Waiting Time: 4.50 min             │
│  • Utilization: 65%                       │
│  • Avg Travel Time: 12.30 min             │
│                                            │
│ 📊 DISCRETE SIMULATION (Day Template)      │
│  • Total Passengers: 150                  │
│  • Avg Waiting Time: 5.23 min             │
│  • Min/Max: 0.50/25.30 min                │
│  • Utilization: 68%                       │
│                                            │
│ 📁 Saved File: discrete_sim_20260303.json│
│    (Location: /uploads/simulations/)      │
│                                            │
│ 📈 Difference: +0.73 min wait (+16.2%)   │
│                                            │
│ [EXPORT PDF] [DOWNLOAD JSON] [VIEW LOGS] │
└────────────────────────────────────────────┘
```

## Time Format Support

Passengers can input arrival times in these formats:

```
08:00:00   → 8 hours, 0 minutes, 0 seconds
08:00      → 8 hours, 0 minutes
00:30      → 30 minutes, 0 seconds
```

### Frontend Time Input Example

```html
<input type="time" id="arrivalTime" value="08:00" min="08:00" max="20:00" />

<script>
  // Convert to HH:MM:SS format for API
  const timeValue = document.getElementById("arrivalTime").value;
  const [hours, minutes] = timeValue.split(":");
  const formattedTime = `${hours}:${minutes}:00`;
</script>
```

## Error Handling

```javascript
async function runWithErrorHandling() {
  try {
    const result = await runCombinedSimulation();

    if (result.result === "success") {
      displayResults(result);
    } else {
      showError("Simulation failed");
    }
  } catch (error) {
    if (error.status === 400) {
      showError("Invalid input: " + error.detail);
    } else if (error.status === 500) {
      showError("Server error: " + error.detail);
    } else {
      showError("Unknown error occurred");
    }
  }
}
```

## Loading State

```javascript
async function runWithLoadingState() {
  showLoading(true);
  try {
    const result = await runCombinedSimulation();
    displayResults(result);
  } finally {
    showLoading(false);
  }
}
```

## Common Scenarios

### Scenario 1: Peak Hour Analysis

```javascript
// User wants to know: can current schedule handle 08:00 peak?
const dayTemplate = {
  arrivals: [
    // High frequency at Central station
    ...generateArrivalsEvery2min("Central", "08:00", "09:00"),
    // Normal at other stations
    ...generateArrivalsEvery5min("North", "08:00", "09:00"),
    ...generateArrivalsEvery5min("South", "08:00", "09:00"),
  ],
};

const result = await runCombinedSimulation({
  ...config,
  day_template: dayTemplate,
});

// Show peak hour impact
showComparison(result.regular_simulation, result.discrete_simulation);
```

### Scenario 2: Special Event

```javascript
// User wants to model specific event with known attendance pattern
const eventDayTemplate = {
  arrivals: [
    // Before event: normal
    ...normalArrivals("08:00", "15:00"),
    // During event: high surge
    ...surgeArrivals("15:30", "17:30", 5x),  // 5x normal rate
    // After event: high surge
    ...surgeArrivals("18:00", "20:00", 3x),  // 3x normal rate
  ]
};
```

### Scenario 3: Schedule Validation

```javascript
// User wants to validate new schedule against typical day pattern
const result = await runCombinedSimulation({
  ...config,
  scenario_data: newScheduleCandidate, // new schedule
  day_template: typicalDayTemplate, // typical day pattern
});

// Compare performance
const improvement = compareSchedules(
  result.regular_simulation,
  result.discrete_simulation,
);
```

## Data Flow

```
Frontend User Input (day template)
           ↓
Build Request JSON
  - time_period
  - time_slot
  - configuration_data (existing)
  - scenario_data (existing)
  - day_template (user created)
           ↓
POST /api/simulate-combined
           ↓
Backend runs 2 simulations
           ↓
Response JSON
  - regular_simulation result
  - discrete_simulation result
  - saved_file info
  - combined logs
           ↓
Display Results to User
           ↓
Optional: Download discrete JSON
```

## Testing Checklist

Before deploying to production:

- [ ] Day template input validation (station names, times)
- [ ] Request/response structure matches schema
- [ ] Error messages are user-friendly
- [ ] Loading state shows during API call
- [ ] Results display correctly for both simulations
- [ ] Saved file path displayed correctly
- [ ] Comparison metrics calculated and shown
- [ ] File download functionality works
- [ ] Mobile responsive layout
- [ ] Edge cases handled (empty results, very large datasets)

## API Response Time

- Small dataset (< 100 passengers): ~2-3 seconds
- Medium dataset (100-500 passengers): ~5-10 seconds
- Large dataset (500+ passengers): ~10-30 seconds

(Includes both simulations + file writing)

## Notes for Frontend

1. **Both simulations run**: Regular + Discrete happen in parallel
2. **File is auto-saved**: No download step needed unless user wants it
3. **Timestamp in filename**: Prevents accidental overwrites
4. **Combined logs**: Both simulation logs merged in response
5. **Optional day_template**: If not provided, only regular simulation runs
6. **File location**: `/uploads/simulations/` on server

## Swagger Documentation

Once backend is running, visit:

```
http://localhost:8000/docs
```

Look for `/api/simulate-combined` endpoint to see full interactive documentation.
