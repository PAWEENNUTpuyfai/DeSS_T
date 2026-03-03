# Login Mode: Day Template Persistence

## Overview

The combined simulation system now supports two modes:

### 1. **Guest Mode** (No Login)

- No `user_id` provided
- Day template included in each simulation request
- Results not saved to database
- Discrete simulation only runs if day_template provided in request

### 2. **Login Mode** (with User Authentication)

- `user_id` provided (user's Google ID)
- Day template persisted to disk
- Automatic discrete simulation using saved template
- Results can be saved to database

---

## File Storage Structure

When a user logs in and saves a day_template:

```
uploads/
└── user_data/
    └── {user_id}/
        └── day_template.json    # Persisted day template
```

Example path:

```
uploads/user_data/user@gmail.com/day_template.json
```

---

## How It Works

### Scenario 1: First Simulation (Save New Template)

**Request:**

```json
{
  "time_period": "08:00-20:00",
  "time_slot": 60,
  "user_id": "user_google_id_12345",
  "day_template": {
    "arrivals": [
      {"station_name": "Central Station", "arrival_time": "08:00:00"},
      {"station_name": "North Station", "arrival_time": "08:05:00"}
    ]
  },
  "configuration_data": {...},
  "scenario_data": [...]
}
```

**Process:**

1. System receives request with `user_id` + `day_template`
2. **Saves** day_template to: `uploads/user_data/user_google_id_12345/day_template.json`
3. Runs both:
   - Regular simulation (distribution-based)
   - Discrete simulation (using provided template)
4. Returns results from both

**Response:**

```json
{
  "result": "success",
  "regular_simulation": {...},
  "discrete_simulation": {...},
  "saved_file": {...}
}
```

### Scenario 2: Subsequent Simulations (Reuse Template)

**Request:**

```json
{
  "time_period": "08:00-20:00",
  "time_slot": 90,
  "user_id": "user_google_id_12345",
  "day_template": null,
  "configuration_data": {...},
  "scenario_data": [...]
}
```

**Process:**

1. System receives request with `user_id` but **no** `day_template`
2. **Loads** day_template from: `uploads/user_data/user_google_id_12345/day_template.json`
3. Runs both:
   - Regular simulation (distribution-based)
   - Discrete simulation (using loaded template)
4. Returns results from both

**Response:**

```json
{
  "result": "success",
  "regular_simulation": {...},
  "discrete_simulation": {...},
  "saved_file": {...}
}
```

### Scenario 3: Update Template

**Request:**

```json
{
  "time_period": "08:00-20:00",
  "time_slot": 60,
  "user_id": "user_google_id_12345",
  "day_template": {
    "arrivals": [
      {"station_name": "Central Station", "arrival_time": "08:30:00"},
      {"station_name": "South Station", "arrival_time": "09:00:00"}
    ]
  },
  "configuration_data": {...},
  "scenario_data": [...]
}
```

**Process:**

1. System receives request with `user_id` + **new** `day_template`
2. **Overwrites** saved template: `uploads/user_data/user_google_id_12345/day_template.json`
3. Runs both simulations with new template
4. Returns results

---

## API Endpoint

### POST `/api/simulate-combined`

#### Request Body

```typescript
interface CombinedSimulationRequest {
  time_period: string; // "HH:MM-HH:MM" e.g. "08:00-20:00"
  time_slot: number; // Minutes (15, 30, 60, 120, etc)

  // User authentication (optional)
  user_id?: string; // User's Google ID - enables login mode

  // Discrete simulation (optional)
  day_template?: {
    arrivals: {
      station_name: string;
      arrival_time: string; // "HH:MM:SS"
    }[];
  };

  // Common to both simulations
  configuration_data: ConfigurationData;
  scenario_data: ScenarioData[];

  // Optional
  output_filename?: string; // Custom name for saved discrete results
}
```

#### Response

```typescript
interface CombinedSimulationResponse {
  result: "success" | "failed";

  regular_simulation: SimulationResult;
  discrete_simulation?: DiscreteSimulationResult; // null if no template

  saved_file?: {
    filename: string;
    path: string;
    size: number;
    created_at: string;
  };

  logs: SimulationLog[];
}
```

---

## Frontend Integration

### For Login Mode Users

#### Step 1: First Time (Save Template)

```javascript
const dayTemplate = {
  arrivals: [
    { station_name: "Central Station", arrival_time: "08:00:00" },
    { station_name: "North Station", arrival_time: "08:05:00" },
  ],
};

const response = await fetch("http://localhost:8000/api/simulate-combined", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    time_period: "08:00-20:00",
    time_slot: 60,
    user_id: user.google_id, // ← Pass user ID
    day_template: dayTemplate, // ← Save template
    configuration_data: configuration,
    scenario_data: scenario,
  }),
});

const data = await response.json();
// Results include both simulations
console.log(data.discrete_simulation);
```

#### Step 2: Reuse Template

```javascript
// No need to send day_template again!
const response = await fetch("http://localhost:8000/api/simulate-combined", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    time_period: "08:00-20:00",
    time_slot: 90, // ← Changed time slot
    user_id: user.google_id,
    // day_template: undefined  (not needed, will load from file)
    configuration_data: configuration,
    scenario_data: scenario,
  }),
});

const data = await response.json();
// System automatically loaded saved template and ran discrete sim
console.log(data.discrete_simulation);
```

#### Step 3: Update Template

```javascript
const newDayTemplate = {
  arrivals: [
    { station_name: "Central Station", arrival_time: "09:00:00" },
    { station_name: "South Station", arrival_time: "09:30:00" },
  ],
};

const response = await fetch("http://localhost:8000/api/simulate-combined", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    time_period: "08:00-20:00",
    time_slot: 60,
    user_id: user.google_id,
    day_template: newDayTemplate, // ← New template overwrites saved
    configuration_data: configuration,
    scenario_data: scenario,
  }),
});
```

---

## Backend Implementation Details

### Key Methods

#### Save Template

```python
CombinedSimulationService.save_day_template(user_id: str, day_template: DayTemplate)
# Saves to: uploads/user_data/{user_id}/day_template.json
```

#### Load Template

```python
template = CombinedSimulationService.load_day_template(user_id: str)
# Loads from: uploads/user_data/{user_id}/day_template.json
# Returns: DayTemplate or None if not found
```

#### Main Logic

```python
def run_combined(req: CombinedSimulationRequest):
    # Always run regular simulation
    regular_result = run_simulation(...)

    # Determine which day_template to use
    active_day_template = req.day_template

    if req.user_id:  # Login mode
        if req.day_template:
            # Save the provided template (overwrite)
            save_day_template(req.user_id, req.day_template)
        else:
            # Load from saved file if not provided
            active_day_template = load_day_template(req.user_id)

    # Run discrete sim only if template available
    if active_day_template:
        discrete_result = run_discrete_simulation(...)

    return CombinedSimulationResponse(...)
```

---

## File Handling

### Directory Structure

```
DeSS_T_Backend-python/
├── uploads/
│   ├── simulations/          # Persistent simulation results
│   │   ├── discrete_sim_*.json
│   │   └── custom_name.json
│   │
│   └── user_data/            # User-specific data (NEW)
│       ├── google_user_123/
│       │   └── day_template.json
│       └── another_user_456/
│           └── day_template.json
```

### Security Considerations

1. **User Data Isolation**: Each user's template stored in separate directory
2. **File Ownership**: Only accessible via authenticated user ID
3. **Overwrite Protection**: New saves overwrite old (this is by design - latest wins)
4. **JSON Storage**: Plain JSON for simplicity (can be upgraded to encrypted later)

---

## Error Handling

### Template Not Found

If user_id is provided but no saved template exists:

- Discrete simulation is **skipped**
- Regular simulation still runs
- Response includes only `regular_simulation` (discrete_simulation: null)

### File IO Errors

If file operations fail:

- Error is logged with warning
- System falls back gracefully
- Regular simulation continues
- Discrete sim skipped

---

## Benefits

✅ **Persistent Configuration**: Users don't re-enter day template every time
✅ **Easy Updates**: Simple day_template parameter controls overwrite
✅ **Backward Compatible**: Guest mode unchanged
✅ **Automatic**: Once saved, discrete sim runs without explicit template
✅ **Flexible**: Can mix reuse + new templates

---

## Example: Complete User Workflow

1. **Login**: User authenticates with Google (frontend handles)
2. **Session 1**:
   - Create day_template with passenger data
   - Send to `/api/simulate-combined` with `user_id`
   - System saves template
   - Get results from both simulations

3. **Session 2 (next day)**:
   - User wants to re-run with different time slots
   - Don't include `day_template` in request
   - Send to `/api/simulate-combined` with only `user_id` + new `time_slot`
   - System loads saved template automatically
   - Simulations run with loaded template

4. **Session 3**:
   - User wants to test with new passenger patterns
   - Include new `day_template` in request
   - System **overwrites** saved template
   - Simulations run with new template

---

## Testing

See [LOGIN_MODE_TEST_EXAMPLES.md](./LOGIN_MODE_TEST_EXAMPLES.md) for:

- cURL examples
- Python test code
- Frontend integration tests

---

**Created**: 2026-03-03  
**Compatible With**: Python Backend + Frontend with authentication
