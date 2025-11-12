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
