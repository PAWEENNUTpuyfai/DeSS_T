#!/bin/bash

# Combined Simulation Test Script
# Usage: ./test_combined_sim.sh
# Note: Requires jq for JSON parsing (optional, for pretty print)

set -e

echo "=================================================="
echo "Combined Simulation API Test"
echo "=================================================="
echo ""

# Configuration
API_URL="http://localhost:8000/api/simulate-combined"
OUTPUT_FILE="test_response.json"

# Build request payload
REQUEST_PAYLOAD='{
  "time_period": "08:00-12:00",
  "time_slot": 60,
  "day_template": {
    "arrivals": [
      {"station_name": "Central Station", "arrival_time": "08:00:00"},
      {"station_name": "Central Station", "arrival_time": "08:02:30"},
      {"station_name": "Central Station", "arrival_time": "08:05:00"},
      {"station_name": "North Station", "arrival_time": "08:08:00"},
      {"station_name": "North Station", "arrival_time": "08:15:00"},
      {"station_name": "South Station", "arrival_time": "08:12:00"},
      {"station_name": "Central Station", "arrival_time": "09:00:00"},
      {"station_name": "North Station", "arrival_time": "09:05:00"},
      {"station_name": "South Station", "arrival_time": "09:10:00"}
    ]
  },
  "configuration_data": {
    "station_list": [
      {"station_id": "S1", "station_name": "Central Station"},
      {"station_id": "S2", "station_name": "North Station"},
      {"station_id": "S3", "station_name": "South Station"}
    ],
    "route_pair": [
      {
        "route_pair_id": "P1",
        "fst_station": "Central Station",
        "snd_station": "North Station",
        "travel_time": 15.0,
        "distance": 12.5
      },
      {
        "route_pair_id": "P2",
        "fst_station": "North Station",
        "snd_station": "South Station",
        "travel_time": 20.0,
        "distance": 18.0
      },
      {
        "route_pair_id": "P3",
        "fst_station": "South Station",
        "snd_station": "Central Station",
        "travel_time": 18.0,
        "distance": 15.5
      }
    ],
    "alighting_data": [
      {
        "time_range": "08:00-12:00",
        "records": [
          {"station": "Central Station", "Distribution": "Uniform", "ArgumentList": "0.1,0.2"},
          {"station": "North Station", "Distribution": "Uniform", "ArgumentList": "0.1,0.2"},
          {"station": "South Station", "Distribution": "Uniform", "ArgumentList": "0.1,0.2"}
        ]
      }
    ],
    "interarrival_data": [
      {
        "time_range": "08:00-12:00",
        "records": [
          {"station": "Central Station", "Distribution": "Poisson", "ArgumentList": "5"},
          {"station": "North Station", "Distribution": "Poisson", "ArgumentList": "3"},
          {"station": "South Station", "Distribution": "Poisson", "ArgumentList": "4"}
        ]
      }
    ]
  },
  "scenario_data": [
    {
      "route_id": "R1",
      "route_name": "Route 1 (Central-North-South)",
      "route_order": "P1$P2",
      "route_schedule": [
        {"departure_time": "08:00:00"},
        {"departure_time": "08:30:00"},
        {"departure_time": "09:00:00"},
        {"departure_time": "09:30:00"}
      ],
      "bus_information": {
        "bus_speed": 40.0,
        "max_distance": 100.0,
        "max_bus": 3,
        "bus_capacity": 50,
        "avg_travel_time": 35.0
      }
    },
    {
      "route_id": "R2",
      "route_name": "Route 2 (South-Central-North)",
      "route_order": "P3$P1",
      "route_schedule": [
        {"departure_time": "08:15:00"},
        {"departure_time": "08:45:00"},
        {"departure_time": "09:15:00"}
      ],
      "bus_information": {
        "bus_speed": 40.0,
        "max_distance": 100.0,
        "max_bus": 2,
        "bus_capacity": 45,
        "avg_travel_time": 33.0
      }
    }
  ],
  "output_filename": "test_run"
}'

echo "Testing API endpoint: $API_URL"
echo ""
echo "Sending request..."
echo ""

# Send request and save response
HTTP_CODE=$(curl -s -o "$OUTPUT_FILE" -w "%{http_code}" \
  -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$REQUEST_PAYLOAD")

echo "HTTP Status: $HTTP_CODE"
echo ""

# Handle response
if [ "$HTTP_CODE" == "200" ]; then
  echo "✅ Request successful!"
  echo ""
  
  # Try to parse with jq if available
  if command -v jq &> /dev/null; then
    echo "📊 RESPONSE SUMMARY:"
    echo ""
    
    echo "Regular Simulation Results:"
    jq '.regular_simulation.result_summary' "$OUTPUT_FILE" | head -10
    echo ""
    
    echo "Discrete Simulation Results:"
    jq '.discrete_simulation.result_summary' "$OUTPUT_FILE" | head -10
    echo ""
    
    echo "Saved File Information:"
    jq '.saved_file' "$OUTPUT_FILE"
    echo ""
  else
    echo "Raw response saved to: $OUTPUT_FILE"
    echo ""
    echo "First 50 lines:"
    head -50 "$OUTPUT_FILE"
  fi
  
  # Extract key metrics if jq available
  if command -v jq &> /dev/null; then
    echo ""
    echo "=================================================="
    echo "KEY METRICS COMPARISON"
    echo "=================================================="
    
    REGULAR_WAIT=$(jq '.regular_simulation.result_summary.average_waiting_time' "$OUTPUT_FILE" 2>/dev/null || echo "N/A")
    DISCRETE_WAIT=$(jq '.discrete_simulation.result_summary.average_waiting_time' "$OUTPUT_FILE" 2>/dev/null || echo "N/A")
    
    REGULAR_UTIL=$(jq '.regular_simulation.result_summary.average_utilization' "$OUTPUT_FILE" 2>/dev/null || echo "N/A")
    DISCRETE_UTIL=$(jq '.discrete_simulation.result_summary.average_utilization' "$OUTPUT_FILE" 2>/dev/null || echo "N/A")
    
    echo "Regular Avg Wait Time:  $REGULAR_WAIT min"
    echo "Discrete Avg Wait Time: $DISCRETE_WAIT min"
    echo ""
    echo "Regular Utilization:    $REGULAR_UTIL"
    echo "Discrete Utilization:   $DISCRETE_UTIL"
    echo ""
    
    SAVED_FILE=$(jq -r '.saved_file.path' "$OUTPUT_FILE" 2>/dev/null || echo "N/A")
    echo "Discrete Results Saved: $SAVED_FILE"
  fi
  
else
  echo "❌ Request failed with status $HTTP_CODE"
  echo ""
  echo "Response:"
  cat "$OUTPUT_FILE"
fi

echo ""
echo "=================================================="
echo "Full response saved to: $OUTPUT_FILE"
echo "=================================================="
