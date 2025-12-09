package services

import (
    "bytes"
    "encoding/json"
    "errors"
    "fmt"
    "io/ioutil"
    "net/http"

    "DeSS_T_Backend-go/models"
)

/* ================== helper struct สำหรับ ORS ================== */

type ORSMatrixResponse struct {
    Distances [][]float64 `json:"distances"`
    Durations [][]float64 `json:"durations"`
}

type ORSRouteResponse struct {
    Routes []struct {
        Geometry struct {
            Coordinates [][]float64 `json:"coordinates"`
        } `json:"geometry"`
    } `json:"routes"`
}

/* ================== GET ROUTE BETWEEN 2 POINTS ================== */

func getRouteGeometry(start, end [2]float64, apiKey string) ([][2]float64, error) {

    url := fmt.Sprintf(
        "https://api.openrouteservice.org/v2/directions/driving-car?api_key=%s&start=%f,%f&end=%f,%f",
        apiKey, start[0], start[1], end[0], end[1],
    )

    res, err := http.Get(url)
    if err != nil {
        return [][2]float64{start, end}, err
    }
    defer res.Body.Close()

    if res.StatusCode != 200 {
        return [][2]float64{start, end}, nil
    }

    body, _ := ioutil.ReadAll(res.Body)

    var ors ORSRouteResponse
    if err := json.Unmarshal(body, &ors); err != nil {
        return [][2]float64{start, end}, nil
    }

    if len(ors.Routes) == 0 {
        return [][2]float64{start, end}, nil
    }

    coords := ors.Routes[0].Geometry.Coordinates
    output := make([][2]float64, len(coords))

    for i, c := range coords {
        output[i] = [2]float64{c[0], c[1]}
    }

    return output, nil
}

/* ================== MAIN FUNCTION (แบบ JS เดิม) ================== */

func BuildNetworkModel(
    stations []models.Station_Detail,
    networkName string,
    apiKey string,
) (*models.Network_Model, error) {

    if len(stations) == 0 {
        return nil, errors.New("station list empty")
    }

    /* ---- เตรียม locations: ORS ต้องการ [lon, lat] ---- */
    locations := make([][2]float64, len(stations))
    for i, s := range stations {
        locations[i] = s.Location.Coordinates
    }

    matrixBody := map[string]interface{}{
        "locations": locations,
        "metrics":   []string{"distance", "duration"},
        "units":     "m",
    }

    jsonBody, _ := json.Marshal(matrixBody)

    req, _ := http.NewRequest("POST",
        "https://api.openrouteservice.org/v2/matrix/driving-car",
        bytes.NewBuffer(jsonBody),
    )
    req.Header.Set("Authorization", apiKey)
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    res, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer res.Body.Close()

    body, _ := ioutil.ReadAll(res.Body)

    if res.StatusCode != 200 {
        return nil, fmt.Errorf("ORS Matrix error: %s", string(body))
    }

    var matrix ORSMatrixResponse
    json.Unmarshal(body, &matrix)

    /* ---- สร้าง StationPair ทั้งหมด ---- */

    pairs := []models.Station_Pair{}

    for i := range stations {
        for j := range stations {
            if i == j {
                continue
            }

            dist := matrix.Distances[i][j]
            dur := matrix.Durations[i][j]

            start := stations[i].Location.Coordinates
            end := stations[j].Location.Coordinates

            routeCoords, _ := getRouteGeometry(start, end, apiKey)

            pairs = append(pairs, models.Station_Pair{
                FstStation: stations[i].StationID,
                SndStation: stations[j].StationID,
                RouteBetween: models.Route_Between{
                    RouteBetweenID: stations[i].StationID + "-" + stations[j].StationID,
                    TravelTime:     dur,
                    Distance:       dist,
                    Route: models.GeoLineString{
                        Type:        "LineString",
                        Coordinates: routeCoords,
                    },
                },
            })
        }
    }

    out := &models.Network_Model{
        NetworkModel:  networkName,
        StationDetail: stations,
        StationPair:   pairs,
    }

    return out, nil
}
