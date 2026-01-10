package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	// "DeSS_T_Backend-go/models"
	"DeSS_T_Backend-go/model_database"
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
		&model_database.User{},
		&model_database.CoverImageProject{},
		&model_database.CoverImageConf{},
		&model_database.PublicScenario{},
		&model_database.UserScenario{},
		&model_database.ScenarioDetail{},
		&model_database.BusScenario{},
		&model_database.ScheduleData{},
		&model_database.BusInformation{},
		&model_database.RouteScenario{},
		&model_database.RoutePath{},
		&model_database.Order{},
		&model_database.UserConfiguration{},
		&model_database.PublicConfiguration{},
		&model_database.ConfigurationDetail{},
		&model_database.AlightingData{},
		&model_database.InterArrivalData{},
		&model_database.NetworkModel{},
		&model_database.StationDetail{},
		&model_database.StationPair{},
		&model_database.RouteBetween{},
	)

	if err != nil {
		log.Fatal("❌ AutoMigrate failed:", err)
	}

	DB = db
	fmt.Println("✅ Migration complete")
}
