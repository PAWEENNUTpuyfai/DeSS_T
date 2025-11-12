package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
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

    fmt.Println("✅ Database connected")
    DB = db
}
