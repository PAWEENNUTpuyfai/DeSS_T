# core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Literal

# กำหนดชนิดของ Environment ที่เป็นไปได้
EnvironmentType = Literal["development", "production", "testing"]

class Settings(BaseSettings):
    """
    คลาส Settings นี้จะโหลดค่าจากไฟล์ .env และ Environment Variables
    """
    
    # 1. กำหนดแหล่งที่มาของการตั้งค่า
    # env_file จะบอกให้ Pydantic โหลดค่าจากไฟล์ .env ก่อน
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding='utf-8',
        extra='ignore' # ไม่สนใจตัวแปรอื่น ๆ ที่ไม่ได้กำหนดใน Model
    )
    
    # 2. ฟิลด์ Config ทั่วไป
    APP_NAME: str = Field(default="Default FastAPI App", description="ชื่อของแอปพลิเคชัน")
    ENVIRONMENT: EnvironmentType = Field(default="development", description="โหมดการทำงาน")
    DEBUG: bool = Field(default=False, description="สถานะ Debug")
    
    # 3. ฟิลด์ที่สำคัญและละเอียดอ่อน
    DATABASE_URL: str = Field(description="URL สำหรับเชื่อมต่อฐานข้อมูล")
    SECRET_KEY: str = Field(description="คีย์ลับสำหรับเข้ารหัส/ถอดรหัส")
    
    # 4. Property สำหรับตรวจสอบสถานะ
    @property
    def is_production(self) -> bool:
        """ตรวจสอบว่ากำลังอยู่ในโหมด Production หรือไม่"""
        return self.ENVIRONMENT == "production"

# สร้างอินสแตนซ์ของ Settings เพื่อใช้งาน
settings = Settings()