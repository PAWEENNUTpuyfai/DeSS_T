package models

import "gorm.io/gorm"

type User struct {
    gorm.Model
    Name string `json:"name"`
    Age  int    `json:"age"`
}

type PythonLog struct {
    gorm.Model
    Result int `json:"result"`
}