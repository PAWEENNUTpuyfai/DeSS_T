package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// getPythonServiceBaseURL returns the base URL for the Python service.
// It reads `PYTHON_SERVICE_URL` from the environment and falls back to
// `http://localhost:5000` when not set. The returned URL has no trailing slash.
func getPythonServiceBaseURL() string {
	base := os.Getenv("PYTHON_SERVICE_URL")
	if base == "" {
		// base = "http://localhost:5000"
		base = "http://10.10.184.122:5000"
		// base = "http://127.0.0.1:5000"
		// base = "http://40.81.22.119:5000"
		// base = "http://backend-python:5000"

	}
	return strings.TrimRight(base, "/")
}

func CallPythonAPI(num int) (int, error) {
	base := getPythonServiceBaseURL()
	url := base + "/api/compute" // Flask URL

	body, _ := json.Marshal(map[string]int{"num": num})
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return 0, err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("failed to call Python API: %v", err)
	}
	defer res.Body.Close()

	responseData, _ := io.ReadAll(res.Body)
	var data map[string]interface{}
	json.Unmarshal(responseData, &data)

	if val, ok := data["result"].(float64); ok {
		return int(val), nil
	}

	return 0, fmt.Errorf("unexpected response: %s", string(responseData))
}

func CallPythonAPIPOWER(number int) (int, error) {
	payload := map[string]int{"number": number}
	data, _ := json.Marshal(payload)

	// URL ต้องตรงกับ prefix + router path
	base := getPythonServiceBaseURL()
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Post(base+"/api/power", "application/json", bytes.NewBuffer(data))
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	var res map[string]int
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return 0, err
	}

	return res["result"], nil
}

// เริ่มโค้ดของจริง
func CallPythonDistributionFit(data interface{}) (map[string]interface{}, error) {

	payload, _ := json.Marshal(data)

	base := getPythonServiceBaseURL()
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Post(base+"/api/distribution_fit", "application/json", bytes.NewBuffer(payload))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	responseData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response body: %v", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("python service returned status %d: %s", resp.StatusCode, string(responseData))
	}

	var result map[string]interface{}
	if err := json.Unmarshal(responseData, &result); err != nil {
		return nil, fmt.Errorf("decoding json response: %v; body: %s", err, string(responseData))
	}

	return result, nil
}

func CallPythonSimulation(data interface{}) (map[string]interface{}, error) {
    payload, _ := json.Marshal(data)

    base := getPythonServiceBaseURL()
    resp, err := http.Post(base+"/api/simulate", "application/json", bytes.NewBuffer(payload))  
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    responseData, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, fmt.Errorf("reading response body: %v", err)
    }
    if resp.StatusCode < 200 || resp.StatusCode >= 300 {
        return nil, fmt.Errorf("python service returned status %d: %s", resp.StatusCode, string(responseData))
    }
    var result map[string]interface{}
    if err := json.Unmarshal(responseData, &result); err != nil {
        return nil, fmt.Errorf("decoding json response: %v; body: %s", err, string(responseData))
    }
    return result, nil
}

