package services

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

func CallPythonAPI(num int) (int, error) {
    url := "http://localhost:5000/api/compute" // Flask URL

    body, _ := json.Marshal(map[string]int{"num": num})
    req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
    if err != nil {
        return 0, err
    }
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
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
    resp, err := http.Post("http://localhost:5000/api/power", "application/json", bytes.NewBuffer(data))
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

//เริ่มโค้ดของจริง
func CallPythonDistributionFit(data interface{}) (map[string]interface{}, error) {

    payload, _ := json.Marshal(data)

    resp, err := http.Post("http://localhost:5000/api/distribution_fit", "application/json", bytes.NewBuffer(payload))
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)

    return result, nil
}