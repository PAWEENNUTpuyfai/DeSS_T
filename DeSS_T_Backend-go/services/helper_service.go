package services

import (
    "os"
    "path/filepath"
    "fmt"
    "time"
	"encoding/json"
	"DeSS_T_Backend-go/models"
)

func SaveSimulationJSON(data models.DiscreteSimulation) (string, error) {
    // 1. กำหนดโฟลเดอร์ที่ต้องการเก็บ (เช่น ./storage/simulations)
    folderPath := "./storage/simulations"
    
    // 2. สร้างโฟลเดอร์ถ้ายังไม่มี
    if _, err := os.Stat(folderPath); os.IsNotExist(err) {
        err := os.MkdirAll(folderPath, 0755)
        if err != nil {
            return "", err
        }
    }

    // 3. ตั้งชื่อไฟล์ (แนะนำให้ใช้ config_id หรือ timestamp เพื่อไม่ให้ซ้ำ)
    fileName := fmt.Sprintf("simulation_%s.json", data.ConfigurationDetailID)
    if data.ConfigurationDetailID == "" {
        fileName = fmt.Sprintf("simulation_%d.json", time.Now().Unix())
    }
    
    filePath := filepath.Join(folderPath, fileName)

    // 4. แปลง Struct เป็น JSON Bytes
    fileData, err := json.MarshalIndent(data, "", "  ")
    if err != nil {
        return "", err
    }

    // 5. เขียนไฟล์ลง Disk
    err = os.WriteFile(filePath, fileData, 0644)
    if err != nil {
        return "", err
    }

    return filePath, nil
}