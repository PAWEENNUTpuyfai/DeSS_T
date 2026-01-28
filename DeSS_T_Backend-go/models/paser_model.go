package models

import (
	"fmt"
	"io"
	"strings"

	"github.com/xuri/excelize/v2"
)

type Record struct {
    RecordID     int     `json:"Record_ID"`
    NumericValue float64 `json:"Numeric_Value"`
}

type Item struct {
    Station        string          `json:"Station"`
    TimeRange      string          `json:"Time_Range"`
    Records []Record `json:"Records"`
}

type Data struct {
   Data []Item `json:"Data"`
}

func DistributionExcelToJSON(path string) (Data, error) {

    f, err := excelize.OpenFile(path)
    if err != nil {
        return Data{}, err
    }

    output := Data{}
    recordID := 1

    for _, sheet := range f.GetSheetList() {

        rows, _ := f.GetRows(sheet)
        if len(rows) < 2 {
            continue
        }

        headers := rows[0]

        for colIndex, header := range headers {
            if header == "" {
                continue
            }

            var recs []Record

            for rowIndex := 1; rowIndex < len(rows); rowIndex++ {
                if colIndex >= len(rows[rowIndex]) {
                    continue
                }

                val := rows[rowIndex][colIndex]
                if val == "" {
                    continue
                }

                var num float64
                fmt.Sscanf(val, "%f", &num)

                recs = append(recs, Record{
                    RecordID:     recordID,
                    NumericValue: num,
                })
                recordID++
            }

            output.Data = append(output.Data, Item{
                Station:        sheet,
                TimeRange:      header,
                Records: recs,
            })
        }
    }

    return output, nil
}

func DistributionExcelToJSONReader(
    r io.Reader,
    stationNameToID map[string]string,
) (Data, error) {

    f, err := excelize.OpenReader(r)
    if err != nil {
        return Data{}, err
    }
    defer f.Close()

    output := Data{}
    recordID := 1

    for _, sheet := range f.GetSheetList() {

        sheetKey := strings.TrimSpace(sheet)

        stationID := sheetKey
        if id, ok := stationNameToID[sheetKey]; ok {
            stationID = id
        }

        rows, err := f.GetRows(sheet)
        if err != nil || len(rows) == 0 {
            continue
        }

        headers := rows[0]
        if len(headers) == 0 {
            continue
        }

        for colIndex, header := range headers {
            if strings.TrimSpace(header) == "" {
                continue
            }

            recs := []Record{}

            for rowIndex := 1; rowIndex < len(rows); rowIndex++ {
                if colIndex >= len(rows[rowIndex]) {
                    continue
                }

                val := strings.TrimSpace(rows[rowIndex][colIndex])
                if val == "" {
                    continue
                }

                var num float64
                if _, err := fmt.Sscanf(val, "%f", &num); err != nil {
                    continue
                }

                recs = append(recs, Record{
                    RecordID:     recordID,
                    NumericValue: num,
                })
                recordID++
            }

            // ⭐ กรณี sheet ว่าง → เติมค่า 0
            if len(recs) == 0 {
                recs = append(recs, Record{
                    RecordID:     recordID,
                    NumericValue: 0,
                })
                recordID++
            }

            output.Data = append(output.Data, Item{
                Station:   stationID,
                TimeRange: header,
                Records:   recs,
            })
        }
    }

    return output, nil
}
