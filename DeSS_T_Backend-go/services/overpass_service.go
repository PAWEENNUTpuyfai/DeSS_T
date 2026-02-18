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
		[out:json][timeout:180];
		area(%s)->.searchArea;
		(
			node["highway"="bus_stop"](area.searchArea);
		);
		out body;
	`, areaCode)

	// Retry a few times with backoff. If still failing, return safe default bounds
	// so the frontend can continue.
	for attempt := 0; attempt < 3; attempt++ {
		client := &http.Client{Timeout: 200 * time.Second}
		resp, err := client.Post(OVERPASS_URL, "text/plain", bytes.NewBufferString(query))
		if err == nil {
			data, readErr := ioutil.ReadAll(resp.Body)
			resp.Body.Close()
			if readErr == nil && resp.StatusCode == 200 {
				var result OverpassResponse
				if err := json.Unmarshal(data, &result); err == nil && len(result.Elements) > 0 {
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
					padding := 0.01
					return &OverpassBounds{
						MinLat: minLat - padding,
						MaxLat: maxLat + padding,
						MinLon: minLon - padding,
						MaxLon: maxLon + padding,
					}, nil
				}
			}
		}
		time.Sleep(time.Duration(400*(attempt+1)) * time.Millisecond)
	}
	// Fallback around Bangkok center
	return &OverpassBounds{MinLat: 13.70, MaxLat: 13.80, MinLon: 100.45, MaxLon: 100.55}, nil
}

// FetchBusStops queries Overpass API to get bus stops within bounds
func FetchBusStops(minLat, minLon, maxLat, maxLon float64) ([]OverpassNode, error) {
	query := fmt.Sprintf(`
		[out:json][timeout:90];
		node["highway"="bus_stop"](%f,%f,%f,%f);
		out body;
	`, minLat, minLon, maxLat, maxLon)

	// Retry up to 3 times. On failure, return empty list to avoid 500s.
	for attempt := 0; attempt < 3; attempt++ {
		resp, err := http.Post(OVERPASS_URL, "text/plain", bytes.NewBufferString(query))
		if err == nil {
			data, readErr := ioutil.ReadAll(resp.Body)
			resp.Body.Close()
			if readErr == nil && resp.StatusCode == 200 {
				var result OverpassResponse
				if err := json.Unmarshal(data, &result); err == nil {
					return result.Elements, nil
				}
			}
		}
		time.Sleep(time.Duration(300*(attempt+1)) * time.Millisecond)
	}
	return []OverpassNode{}, nil
}

// FetchBusStopsInArea queries Overpass API to get bus stops in a specific area
func FetchBusStopsInArea(areaCode string) ([]OverpassNode, error) {
	query := fmt.Sprintf(`
		[out:json][timeout:180];
		area(%s)->.searchArea;
		node["highway"="bus_stop"](area.searchArea);
		out body;
	`, areaCode)

	for attempt := 0; attempt < 2; attempt++ {
		client := &http.Client{Timeout: 200 * time.Second}
		resp, err := client.Post(OVERPASS_URL, "text/plain", bytes.NewBufferString(query))
		if err == nil {
			data, readErr := ioutil.ReadAll(resp.Body)
			resp.Body.Close()
			if readErr == nil && resp.StatusCode == 200 {
				var result OverpassResponse
				if err := json.Unmarshal(data, &result); err == nil {
					fmt.Printf("✅ FetchBusStopsInArea: Found %d bus stops in area %s\n", len(result.Elements), areaCode)
					return result.Elements, nil
				} else {
					fmt.Printf("⚠️ FetchBusStopsInArea: JSON error: %v\n", err)
				}
			} else if resp.StatusCode == 429 {
				fmt.Printf("❌ FetchBusStopsInArea: Rate limited (429) - stopping\n")
				return []OverpassNode{}, fmt.Errorf("Overpass API rate limit")
			} else if resp.StatusCode == 504 {
				fmt.Printf("❌ FetchBusStopsInArea: Timeout (504) - stopping\n")
				return []OverpassNode{}, fmt.Errorf("Overpass API timeout")
			} else {
				fmt.Printf("⚠️ FetchBusStopsInArea: HTTP %d\n", resp.StatusCode)
			}
		} else {
			fmt.Printf("⚠️ FetchBusStopsInArea attempt %d: %v\n", attempt+1, err)
		}
		if attempt < 1 {
			time.Sleep(2 * time.Second)
		}
	}
	fmt.Printf("❌ FetchBusStopsInArea: Failed for area %s\n", areaCode)
	return []OverpassNode{}, fmt.Errorf("Overpass API unavailable")
}

type OverpassWay struct {
	ID    int64             `json:"id"`
	Nodes []int64           `json:"nodes"`
	Tags  map[string]string `json:"tags,omitempty"`
}

type OverpassGeometryResponse struct {
	Elements []struct {
		Type     string            `json:"type"`
		ID       int64             `json:"id"`
		Lat      float64           `json:"lat,omitempty"`
		Lon      float64           `json:"lon,omitempty"`
		Nodes    []int64           `json:"nodes,omitempty"`
		Members  []json.RawMessage `json:"members,omitempty"`
		Tags     map[string]string `json:"tags,omitempty"`
		Geometry []struct {
			Lat float64 `json:"lat"`
			Lon float64 `json:"lon"`
		} `json:"geometry,omitempty"`
	} `json:"elements"`
}

// FetchAreaGeometry queries Overpass API to get area polygon geometry
func FetchAreaGeometry(areaCode string) ([][][2]float64, error) {
	query := fmt.Sprintf(`
		[out:json][timeout:180];
		area(%s)->.searchArea;
		(
			rel(area.searchArea)["boundary"="administrative"];
			way(area.searchArea)["boundary"="administrative"];
		);
		out geom;
	`, areaCode)

	for attempt := 0; attempt < 3; attempt++ {
		client := &http.Client{Timeout: 200 * time.Second}
		resp, err := client.Post(OVERPASS_URL, "text/plain", bytes.NewBufferString(query))
		if err == nil {
			data, readErr := ioutil.ReadAll(resp.Body)
			resp.Body.Close()
			if readErr == nil && resp.StatusCode == 200 {
				var result OverpassGeometryResponse
				if err := json.Unmarshal(data, &result); err == nil {
					var polygons [][][2]float64
					for _, el := range result.Elements {
						if len(el.Geometry) > 0 {
							var poly [][2]float64
							for _, coord := range el.Geometry {
								poly = append(poly, [2]float64{coord.Lat, coord.Lon})
							}
							polygons = append(polygons, poly)
						}
					}
					if len(polygons) > 0 {
						return polygons, nil
					}
				}
			}
		}
		time.Sleep(time.Duration(400*(attempt+1)) * time.Millisecond)
	}
	// Return empty array if no geometry found
	return [][][2]float64{}, nil
}
