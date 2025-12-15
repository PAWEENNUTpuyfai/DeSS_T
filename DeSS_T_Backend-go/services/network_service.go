package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"math"
	"net/http"

	"DeSS_T_Backend-go/models"
)

/* ───────────────────────────── ORS MATRIX ───────────────────────────── */

type ORSMatrixRequest struct {
	Locations [][]float64 `json:"locations"`
	Metrics   []string    `json:"metrics"`
	Units     string      `json:"units"`
}

type ORSMatrixResponse struct {
	Distances [][]float64 `json:"distances"`
	Durations [][]float64 `json:"durations"`
}

func OrsMatrix(stations []models.Station_Detail, key string) (*ORSMatrixResponse, error) {

	locations := [][]float64{}
	for _, s := range stations {
		locations = append(locations, []float64{
			s.Location.Coordinates[0],
			s.Location.Coordinates[1],
		})
	}

	body := ORSMatrixRequest{
		Locations: locations,
		Metrics:   []string{"distance", "duration"},
		Units:     "m",
	}

	b, _ := json.Marshal(body)

	req, _ := http.NewRequest(
		"POST",
		"https://api.openrouteservice.org/v2/matrix/driving-car",
		bytes.NewBuffer(b),
	)
	req.Header.Set("Authorization", key)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ORS Matrix request failed: %v", err)
	}
	defer resp.Body.Close()

	data, _ := ioutil.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("ORS Matrix error (%d): %s", resp.StatusCode, string(data))
	}

	var result ORSMatrixResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("Invalid ORS Matrix response: %v", err)
	}

	return &result, nil
}

/* ───────────────────────────── ORS ROUTE ───────────────────────────── */

func OrsRoute(start [2]float64, end [2]float64, key string) ([][2]float64, error) {

	url := fmt.Sprintf(
		"https://api.openrouteservice.org/v2/directions/driving-car?api_key=%s&start=%f,%f&end=%f,%f",
		key, start[0], start[1], end[0], end[1],
	)

	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("ORS Route request failed: %v", err)
	}
	defer resp.Body.Close()

	data, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("ORS Route error: %s", string(data))
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(data, &parsed); err != nil {
		// If parsing fails, fallback to straight line
		return [][2]float64{start, end}, nil
	}

	routesAny, ok := parsed["routes"]
	if !ok || routesAny == nil {
		return [][2]float64{start, end}, nil
	}
	routes, ok := routesAny.([]interface{})
	if !ok || len(routes) == 0 {
		return [][2]float64{start, end}, nil
	}

	first, ok := routes[0].(map[string]interface{})
	if !ok {
		return [][2]float64{start, end}, nil
	}
	geomAny, ok := first["geometry"]
	if !ok || geomAny == nil {
		return [][2]float64{start, end}, nil
	}
	geom, ok := geomAny.(map[string]interface{})
	if !ok {
		return [][2]float64{start, end}, nil
	}
	coordsAny, ok := geom["coordinates"]
	if !ok || coordsAny == nil {
		return [][2]float64{start, end}, nil
	}
	rawCoords, ok := coordsAny.([]interface{})
	if !ok || len(rawCoords) == 0 {
		return [][2]float64{start, end}, nil
	}

	result := [][2]float64{}
	for _, c := range rawCoords {
		p, ok := c.([]interface{})
		if !ok || len(p) < 2 {
			continue
		}
		lon, lonOk := p[0].(float64)
		lat, latOk := p[1].(float64)
		if !lonOk || !latOk {
			continue
		}
		result = append(result, [2]float64{lon, lat})
	}

	if len(result) == 0 {
		return [][2]float64{start, end}, nil
	}
	return result, nil
}

/* ──────────────────────── FALLBACK (LOCAL) MATRIX ──────────────────────── */

// haversineDistance returns meters between two lon/lat points
func haversineDistance(a [2]float64, b [2]float64) float64 {
	const R = 6371000.0 // Earth radius meters
	lon1 := a[0] * math.Pi / 180.0
	lat1 := a[1] * math.Pi / 180.0
	lon2 := b[0] * math.Pi / 180.0
	lat2 := b[1] * math.Pi / 180.0

	dlon := lon2 - lon1
	dlat := lat2 - lat1
	sinDLat := math.Sin(dlat / 2)
	sinDLon := math.Sin(dlon / 2)
	h := sinDLat*sinDLat + math.Cos(lat1)*math.Cos(lat2)*sinDLon*sinDLon
	c := 2 * math.Atan2(math.Sqrt(h), math.Sqrt(1-h))
	return R * c
}

// LocalMatrix computes distances and durations using straight-line distance
// and a constant speed (e.g., 30 km/h ≈ 8.333 m/s). Returns same shape as ORS
// matrix to allow seamless fallback.
func LocalMatrix(stations []models.Station_Detail, metersPerSecond float64) (*ORSMatrixResponse, error) {
	n := len(stations)
	distances := make([][]float64, n)
	durations := make([][]float64, n)
	for i := 0; i < n; i++ {
		distances[i] = make([]float64, n)
		durations[i] = make([]float64, n)
		for j := 0; j < n; j++ {
			if i == j {
				distances[i][j] = 0
				durations[i][j] = 0
				continue
			}
			a := stations[i].Location.Coordinates
			b := stations[j].Location.Coordinates
			d := haversineDistance(a, b) // meters
			distances[i][j] = d
			if metersPerSecond > 0 {
				durations[i][j] = d / metersPerSecond // seconds
			} else {
				durations[i][j] = 0
			}
		}
	}
	return &ORSMatrixResponse{Distances: distances, Durations: durations}, nil
}
