package models

import (
    "github.com/xuri/excelize/v2"
    "fmt"
    "io"
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

func DistributionExcelToJSONReader(r io.Reader) (Data, error) {
    f, err := excelize.OpenReader(r)
    if err != nil {
        return Data{}, err
    }
    defer f.Close()

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
                Station:   sheet,
                TimeRange: header,
                Records:   recs,
            })
        }
    }

    return output, nil
}