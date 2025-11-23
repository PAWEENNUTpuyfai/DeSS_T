package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"DeSS_T_Backend-go/models"
)

var DB *gorm.DB

func ConnectDatabase() {
	// โหลดไฟล์ .env
	err := godotenv.Load()
	if err != nil {
		log.Println("⚠️  Warning: .env file not found, using system environment variables")
	}

	// ดึงค่าจาก .env
	host := os.Getenv("DB_HOST")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")
	port := os.Getenv("DB_PORT")

	// สร้าง DSN string
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		host, user, password, dbname, port,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("❌ Failed to connect database:", err)
	}

	// ⭐ กำหนดว่าตารางไหนจะถูกสร้างขึ้น
	// err = db.AutoMigrate(
	// 	&models.User{},
	// 	&models.PythonLog{},
	// )
	err = db.AutoMigrate(
		&models.User{},
		&models.CoverImageProject{},
		&models.CoverImageConf{},
		&models.PublicScenario{},
		&models.UserScenario{},
		&models.ScenarioDetail{},
		&models.BusScenario{},
		&models.ScheduleData{},
		&models.BusInformation{},
		&models.RouteScenario{},
		&models.RoutePath{},
		&models.Order{},
		&models.UserConfiguration{},
		&models.PublicConfiguration{},
		&models.ConfigurationDetail{},
		&models.AlightingData{},
		&models.InterArrivalData{},
		&models.NetworkModel{},
		&models.StationDetail{},
		&models.StationPair{},
		&models.RouteBetween{},
	)

	if err != nil {
		log.Fatal("❌ AutoMigrate failed:", err)
	}

	DB = db
	fmt.Println("✅ Migration complete")
}
