package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"time"

	"DeSS_T_Backend-go/models"
)

/* ───────────────────────────── ORS MATRIX ───────────────────────────── */

type ORSMatrixRequest struct {
	Locations    [][]float64 `json:"locations"`
	Metrics      []string    `json:"metrics"`
	Units        string      `json:"units"`
	Sources      []int       `json:"sources,omitempty"`
	Destinations []int       `json:"destinations,omitempty"`
}

type ORSMatrixResponse struct {
	Distances [][]float64 `json:"distances"`
	Durations [][]float64 `json:"durations"`
}

const (
	orsMatrixURL       = "https://api.openrouteservice.org/v2/matrix/driving-car"
	orsMatrixChunkSize = 30
)

func OrsMatrix(stations []models.StationDetail, key string) (*ORSMatrixResponse, error) {
	n := len(stations)
	if n == 0 {
		return &ORSMatrixResponse{}, nil
	}

	client := &http.Client{Timeout: 60 * time.Second}

	if n <= orsMatrixChunkSize {
		locations := buildLocations(stations, nil)
		reqBody := ORSMatrixRequest{Locations: locations, Metrics: []string{"distance", "duration"}, Units: "m"}
		return doOrsMatrix(reqBody, key, client)
	}

	distances := make([][]float64, n)
	durations := make([][]float64, n)
	for i := range distances {
		distances[i] = make([]float64, n)
		durations[i] = make([]float64, n)
	}

	for si := 0; si < n; si += orsMatrixChunkSize {
		srcEnd := minInt(si+orsMatrixChunkSize, n)
		srcBlock := stations[si:srcEnd]

		for di := 0; di < n; di += orsMatrixChunkSize {
			dstEnd := minInt(di+orsMatrixChunkSize, n)
			dstBlock := stations[di:dstEnd]

			locations := buildLocations(srcBlock, dstBlock)
			body := ORSMatrixRequest{
				Locations:    locations,
				Metrics:      []string{"distance", "duration"},
				Units:        "m",
				Sources:      makeIndices(0, len(srcBlock)),
				Destinations: makeIndices(len(srcBlock), len(srcBlock)+len(dstBlock)),
			}

			chunk, err := doOrsMatrix(body, key, client)
			if err != nil {
				return nil, fmt.Errorf("ORS Matrix chunk (%d-%d,%d-%d) failed: %w", si, srcEnd, di, dstEnd, err)
			}

			for i := range chunk.Distances {
				for j := range chunk.Distances[i] {
					distances[si+i][di+j] = chunk.Distances[i][j]
					durations[si+i][di+j] = chunk.Durations[i][j]
				}
			}
		}
	}

	return &ORSMatrixResponse{Distances: distances, Durations: durations}, nil
}

func doOrsMatrix(body ORSMatrixRequest, key string, client *http.Client) (*ORSMatrixResponse, error) {
	b, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", orsMatrixURL, bytes.NewBuffer(b))
	req.Header.Set("Authorization", key)
	req.Header.Set("Content-Type", "application/json")

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

func buildLocations(src []models.StationDetail, dst []models.StationDetail) [][]float64 {
	locations := make([][]float64, 0, len(src)+len(dst))
	for _, s := range src {
		locations = append(locations, []float64{s.Location.Coordinates[0], s.Location.Coordinates[1]})
	}
	for _, s := range dst {
		locations = append(locations, []float64{s.Location.Coordinates[0], s.Location.Coordinates[1]})
	}
	return locations
}

func makeIndices(start, end int) []int {
	indices := make([]int, end-start)
	for i := range indices {
		indices[i] = start + i
	}
	return indices
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

/* ───────────────────────────── ORS ROUTE ───────────────────────────── */

func OrsRoute(start [2]float64, end [2]float64, key string) ([][2]float64, error) {
	// Use /geojson suffix in URL path to get GeoJSON format
	url := "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
	body := map[string]interface{}{
		"coordinates": [][]float64{
			{start[0], start[1]},
			{end[0], end[1]},
		},
	}

	b, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(b))
	req.Header.Set("Authorization", key)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("❌ ORS request failed: %v\n", err)
		return nil, fmt.Errorf("ORS Route request failed: %v", err)
	}
	defer resp.Body.Close()

	data, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("ORS Route error (%d): %s", resp.StatusCode, string(data))
	}

	// Parse GeoJSON FeatureCollection
	var parsed struct {
		Features []struct {
			Geometry struct {
				Coordinates [][]float64 `json:"coordinates"`
			} `json:"geometry"`
		} `json:"features"`
	}

	if err := json.Unmarshal(data, &parsed); err != nil {
		return nil, fmt.Errorf("ORS parse error: %v", err)
	}
	if len(parsed.Features) == 0 {
		return nil, fmt.Errorf("ORS returned no features")
	}

	coords := parsed.Features[0].Geometry.Coordinates
	if len(coords) == 0 {
		return nil, fmt.Errorf("ORS returned empty coordinates")
	}

	result := make([][2]float64, 0, len(coords))
	for _, c := range coords {
		if len(c) >= 2 {
			result = append(result, [2]float64{c[0], c[1]})
		}
	}

	if len(result) == 0 {
		return nil, fmt.Errorf("ORS coordinates invalid")
	}

	return result, nil
}

/* ────────────────────────── END ORS MATRIX/ROUTE ────────────────────────── */
