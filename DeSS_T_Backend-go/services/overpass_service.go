package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"time"
)

const OVERPASS_URL = "https://overpass-api.de/api/interpreter"

type OverpassBounds struct {
	MinLat float64 `json:"minlat"`
	MaxLat float64 `json:"maxlat"`
	MinLon float64 `json:"minlon"`
	MaxLon float64 `json:"maxlon"`
}

type OverpassNode struct {
	ID   int64             `json:"id"`
	Lat  float64           `json:"lat"`
	Lon  float64           `json:"lon"`
	Tags map[string]string `json:"tags,omitempty"`
}

type OverpassResponse struct {
	Elements []OverpassNode `json:"elements"`
}

// FetchAreaBounds queries Overpass API to get bounds from area code
func FetchAreaBounds(areaCode string) (*OverpassBounds, error) {
	query := fmt.Sprintf(`
		[out:json][timeout:60];
		area(%s)->.searchArea;
		(
			node["highway"="bus_stop"](area.searchArea);
		);
		out body;
	`, areaCode)

	client := &http.Client{Timeout: 70 * time.Second}
	resp, err := client.Post(OVERPASS_URL, "text/plain", bytes.NewBufferString(query))
	if err != nil {
		return nil, fmt.Errorf("overpass request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := ioutil.ReadAll(resp.Body)
		return nil, fmt.Errorf("overpass error (%d): %s", resp.StatusCode, string(body))
	}

	data, _ := ioutil.ReadAll(resp.Body)
	var result OverpassResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("invalid overpass response: %v", err)
	}

	if len(result.Elements) == 0 {
		return nil, fmt.Errorf("no bus stops found in this area")
	}

	// Calculate bounds
	minLat, minLon := 90.0, 180.0
	maxLat, maxLon := -90.0, -180.0

	for _, el := range result.Elements {
		if el.Lat < minLat {
			minLat = el.Lat
		}
		if el.Lat > maxLat {
			maxLat = el.Lat
		}
		if el.Lon < minLon {
			minLon = el.Lon
		}
		if el.Lon > maxLon {
			maxLon = el.Lon
		}
	}

	// Add padding
	padding := 0.01
	return &OverpassBounds{
		MinLat: minLat - padding,
		MaxLat: maxLat + padding,
		MinLon: minLon - padding,
		MaxLon: maxLon + padding,
	}, nil
}

// FetchBusStops queries Overpass API to get bus stops within bounds
func FetchBusStops(minLat, minLon, maxLat, maxLon float64) ([]OverpassNode, error) {
	query := fmt.Sprintf(`
		[out:json][timeout:25];
		node["highway"="bus_stop"](%f,%f,%f,%f);
		out body;
	`, minLat, minLon, maxLat, maxLon)

	resp, err := http.Post(OVERPASS_URL, "text/plain", bytes.NewBufferString(query))
	if err != nil {
		return nil, fmt.Errorf("overpass request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := ioutil.ReadAll(resp.Body)
		return nil, fmt.Errorf("overpass error (%d): %s", resp.StatusCode, string(body))
	}

	data, _ := ioutil.ReadAll(resp.Body)
	var result OverpassResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("invalid overpass response: %v", err)
	}

	return result.Elements, nil
}

// FetchBusStopsInArea queries Overpass API to get bus stops in a specific area
func FetchBusStopsInArea(areaCode string) ([]OverpassNode, error) {
	query := fmt.Sprintf(`
		[out:json][timeout:60];
		area(%s)->.searchArea;
		node["highway"="bus_stop"](area.searchArea);
		out body;
	`, areaCode)

	client := &http.Client{Timeout: 70 * time.Second}
	resp, err := client.Post(OVERPASS_URL, "text/plain", bytes.NewBufferString(query))
	if err != nil {
		return nil, fmt.Errorf("overpass request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := ioutil.ReadAll(resp.Body)
		return nil, fmt.Errorf("overpass error (%d): %s", resp.StatusCode, string(body))
	}

	data, _ := ioutil.ReadAll(resp.Body)
	var result OverpassResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("invalid overpass response: %v", err)
	}

	return result.Elements, nil
}
