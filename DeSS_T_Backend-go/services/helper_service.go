package services

import (
	"DeSS_T_Backend-go/models"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

func SaveSimulationJSON(data models.DiscreteSimulation) (string, error) {
	// 1. กำหนดโฟลเดอร์เก็บไฟล์ถาวร
	folderPath := filepath.Join(".", "storage", "simulations")

	// 2. สร้างโฟลเดอร์ถ้ายังไม่มี (0755 คือสิทธิ์อ่านเขียนที่เหมาะสม)
	if err := os.MkdirAll(folderPath, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	// 3. ตั้งชื่อไฟล์ตาม UUID จริงที่ได้รับมาจาก Database
	// การใช้ ID ตรงๆ จะช่วยให้ฟังก์ชัน Get หรือ Load ดึงข้อมูลง่ายขึ้น
	targetID := data.ConfigurationDetailID
	if targetID == "" {
		targetID = fmt.Sprintf("unknown_%d", time.Now().Unix())
	}
	fileName := targetID + ".json"
	filePath := filepath.Join(folderPath, fileName)

	// 4. แปลงเป็น JSON (MarshalIndent เพื่อให้มนุษย์อ่านง่ายตอน Debug)
	fileData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal json: %w", err)
	}

	// 5. เขียนไฟล์ลง Disk (0644 คือสิทธิ์อ่านเขียนไฟล์ทั่วไป)
	err = os.WriteFile(filePath, fileData, 0644)
	if err != nil {
		return "", fmt.Errorf("failed to write file to disk: %w", err)
	}

	return filePath, nil
}