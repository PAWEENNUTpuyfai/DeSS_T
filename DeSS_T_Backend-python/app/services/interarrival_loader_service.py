"""
Service to load InterArrival data from file saved by Go backend.

The Go backend (user_config_service.go) saves InterArrival data to:
  uploads/interarrival_data.json

This service provides methods to load that data for use in simulations.
"""

import json
import os
from pathlib import Path
from typing import List, Optional, Dict, Any


class InterArrivalLoaderService:
    """Service to load and manage InterArrival data from file"""
    
    # Path to the interarrival data file (relative to project root)
    DATA_FILE = Path(__file__).parent.parent.parent / "uploads" / "interarrival_data.json"
    
    @classmethod
    def get_data_file_path(cls) -> Path:
        """Get the full path to interarrival data file"""
        return cls.DATA_FILE
    
    @classmethod
    def load_interarrival_data(cls) -> Optional[List[Dict[str, Any]]]:
        """
        Load InterArrival data from file.
        
        Returns:
            List of interarrival data records or None if file doesn't exist
        """
        file_path = cls.get_data_file_path()
        
        if not file_path.exists():
            print(f"[⚠️  INFO] No interarrival data file found at: {file_path}")
            return None
        
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            print(f"[✅ LOADED] InterArrival data loaded from: {file_path}")
            print(f"    Records: {len(data)}")
            
            return data
        
        except Exception as e:
            print(f"[❌ ERROR] Failed to load interarrival data: {e}")
            return None
    
    @classmethod
    def get_interarrival_by_station(cls, station_name: str) -> Optional[Dict[str, Any]]:
        """
        Get InterArrival data for a specific station.
        
        Args:
            station_name: Name of the station
        
        Returns:
            InterArrival data for the station or None if not found
        """
        data = cls.load_interarrival_data()
        
        if not data:
            return None
        
        for record in data:
            # Check both 'station_name' and 'station' fields
            if record.get("station_name") == station_name or record.get("station") == station_name:
                return record
        
        return None
    
    @classmethod
    def get_distribution_for_station(cls, station_name: str) -> Optional[Dict[str, str]]:
        """
        Get only the distribution type and parameters for a station.
        
        Returns:
            Dict with 'Distribution' and 'ArgumentList' or None if not found
        """
        record = cls.get_interarrival_by_station(station_name)
        
        if not record:
            return None
        
        return {
            "Distribution": record.get("Distribution", "Poisson"),
            "ArgumentList": record.get("ArgumentList", "5")
        }
    
    @classmethod
    def get_all_stations(cls) -> List[str]:
        """
        Get list of all stations that have InterArrival data.
        
        Returns:
            List of station names
        """
        data = cls.load_interarrival_data()
        
        if not data:
            return []
        
        stations = []
        for record in data:
            station = record.get("station_name") or record.get("station")
            if station:
                stations.append(station)
        
        return stations
    
    @classmethod
    def has_interarrival_data(cls) -> bool:
        """Check if interarrival data file exists and has data"""
        return cls.load_interarrival_data() is not None


def load_interarrival_data() -> Optional[List[Dict[str, Any]]]:
    """Convenience function to load interarrival data"""
    return InterArrivalLoaderService.load_interarrival_data()


def get_interarrival_by_station(station_name: str) -> Optional[Dict[str, Any]]:
    """Convenience function to get data for specific station"""
    return InterArrivalLoaderService.get_interarrival_by_station(station_name)


def get_all_stations() -> List[str]:
    """Convenience function to get all stations"""
    return InterArrivalLoaderService.get_all_stations()
