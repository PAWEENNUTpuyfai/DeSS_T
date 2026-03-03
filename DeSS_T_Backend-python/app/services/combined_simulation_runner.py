import json
import os
from datetime import datetime
from typing import Dict, Optional
from pathlib import Path

from app.schemas.CombinedSimulation import (
    CombinedSimulationRequest,
    CombinedSimulationResponse,
    SimulationFile,
)
from app.schemas.Simulation import SimulationRequest
from app.schemas.DiscreteSimulation import DiscreteSimulationRequest, DayTemplate

from app.services.simulation_runner import run_simulation
from app.services.discrete_simulation_runner import run_discrete_simulation


class CombinedSimulationService:
    """Service to run both regular and discrete simulations together"""
    
    # Directory to save discrete simulation results
    OUTPUT_DIR = Path(__file__).parent.parent.parent / "uploads" / "simulations"
    
    # Directory to save user day_template data (login mode)
    USER_DATA_DIR = Path(__file__).parent.parent.parent / "uploads" / "user_data"
    
    @classmethod
    def ensure_output_dir(cls):
        """Create output directory if it doesn't exist"""
        cls.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        return cls.OUTPUT_DIR
    
    @classmethod
    def ensure_user_data_dir(cls, user_id: str):
        """Create user data directory if it doesn't exist"""
        user_dir = cls.USER_DATA_DIR / user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        return user_dir
    
    @classmethod
    def get_day_template_file_path(cls, user_id: str) -> Path:
        """Get path to day_template file for a user"""
        return cls.USER_DATA_DIR / user_id / "day_template.json"
    
    @classmethod
    def save_day_template(cls, user_id: str, day_template: DayTemplate) -> None:
        """Save day_template to file (overwrite if exists)"""
        user_dir = cls.ensure_user_data_dir(user_id)
        file_path = cls.get_day_template_file_path(user_id)
        
        # Convert to dict and save
        template_dict = day_template.dict(by_alias=True)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(template_dict, f, indent=2, ensure_ascii=False)
        
        # Debug log
        print(f"[✅ DEBUG] Day template saved successfully")
        print(f"    User ID: {user_id}")
        print(f"    File Path: {file_path}")
        print(f"    File Size: {file_path.stat().st_size} bytes")
        print(f"    Arrivals: {len(template_dict.get('arrivals', []))}")
    
    @classmethod
    def load_day_template(cls, user_id: str) -> Optional[DayTemplate]:
        """Load day_template from file if exists"""
        file_path = cls.get_day_template_file_path(user_id)
        
        if not file_path.exists():
            return None
        
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                template_dict = json.load(f)
            return DayTemplate(**template_dict)
        except Exception as e:
            print(f"Warning: Failed to load day_template: {e}")
            return None
    
    @classmethod
    def run_combined(cls, req: CombinedSimulationRequest) -> CombinedSimulationResponse:
        """
        Run both regular and discrete simulations.
        
        Modes:
        - Guest Mode (no user_id): Uses day_template from request only
        - Login Mode (with user_id):
          1. If day_template provided in request: Save to file, then use it
          2. If day_template not in request: Load from saved file if exists
        
        Args:
            req: CombinedSimulationRequest with config and optional day_template
        
        Returns:
            CombinedSimulationResponse with both results
        """
        
        # ===== REGULAR SIMULATION =====
        regular_req = SimulationRequest(
            time_period=req.time_period,
            time_slot=req.time_slot,
            configuration_data=req.configuration_data,
            scenario_data=req.scenario_data
        )
        
        regular_result = run_simulation(regular_req)
        combined_logs = list(regular_result.logs)
        
        # DEBUG: Log incoming request
        print(f"\n[🔍 DEBUG] run_combined() called")
        print(f"    user_id: {req.user_id}")
        print(f"    day_template provided: {req.day_template is not None}")
        if req.day_template:
            print(f"    arrivals count: {len(req.day_template.arrivals) if hasattr(req.day_template, 'arrivals') else 'N/A'}")
        
        # ===== DETERMINE WHICH DAY_TEMPLATE TO USE =====
        active_day_template = req.day_template
        
        # Login mode: handle day_template persistence
        if req.user_id:
            print(f"[🔑 DEBUG] Login Mode detected for user: {req.user_id}")
            
            if req.day_template:
                # If day_template provided: save it to file (overwrite)
                print(f"    → Saving day_template to file...")
                cls.save_day_template(req.user_id, req.day_template)
                active_day_template = req.day_template
            else:
                # If not provided: try to load from saved file
                print(f"    → Loading day_template from file...")
                loaded_template = cls.load_day_template(req.user_id)
                if loaded_template:
                    print(f"    ✓ Loaded template with {len(loaded_template.arrivals)} arrivals")
                else:
                    print(f"    ✗ No saved template found")
                active_day_template = loaded_template
        else:
            print(f"[👤 DEBUG] Guest Mode - no user_id")
        
        # ===== DISCRETE SIMULATION (if day_template exists) =====
        discrete_result = None
        saved_file = None
        
        if active_day_template:
            print(f"[▶️  DEBUG] Running discrete simulation...")
            discrete_req = DiscreteSimulationRequest(
                time_period=req.time_period,
                time_slot=req.time_slot,
                day_template=active_day_template,
                configuration_data=req.configuration_data,
                scenario_data=req.scenario_data
            )
            
            discrete_result = run_discrete_simulation(discrete_req)
            
            # Add discrete simulation logs
            combined_logs.extend(discrete_result.logs)
            
            # Save discrete simulation results to file
            print(f"[💾 DEBUG] Saving discrete simulation results...")
            saved_file = cls._save_discrete_result(
                discrete_result,
                req.output_filename
            )
            print(f"    ✓ Results saved to: {saved_file.path}")
        else:
            print(f"[⚠️  DEBUG] No day_template available - skipping discrete simulation")
        
        return CombinedSimulationResponse(
            result="success",
            regular_simulation=regular_result.simulation_result,
            discrete_simulation=discrete_result.simulation_result if discrete_result else None,
            saved_file=saved_file,
            logs=combined_logs
        )
    
    @classmethod
    def _save_discrete_result(
        cls,
        discrete_result,
        output_filename: Optional[str] = None
    ) -> SimulationFile:
        """
        Save discrete simulation results to JSON file.
        
        Args:
            discrete_result: DiscreteSimulationResponse from discrete simulation
            output_filename: Optional custom filename
        
        Returns:
            SimulationFile with file information
        """
        # Ensure output directory exists
        cls.ensure_output_dir()
        
        # Generate filename if not provided
        if not output_filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"discrete_simulation_{timestamp}.json"
        
        # Ensure .json extension
        if not output_filename.endswith(".json"):
            output_filename += ".json"
        
        # Build full path
        file_path = cls.OUTPUT_DIR / output_filename
        
        # Convert response to dict
        result_dict = {
            "timestamp": datetime.now().isoformat(),
            "result": discrete_result.result,
            "simulation_result": {
                "result_summary": discrete_result.simulation_result.result_summary.dict(),
                "result_station": [
                    s.dict() for s in discrete_result.simulation_result.result_station
                ],
                "result_route": [
                    r.dict() for r in discrete_result.simulation_result.result_route
                ]
            },
            "logs_count": len(discrete_result.logs),
            "sample_logs": [
                {
                    "time": log.get("time", log.get("time", "")).hex() if isinstance(log, dict) else log.time,
                    "component": log.get("component", "") if isinstance(log, dict) else log.component,
                    "message": log.get("message", "") if isinstance(log, dict) else log.message,
                }
                for log in discrete_result.logs[:20]  # First 20 logs
            ]
        }
        
        # Write to file
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(result_dict, f, indent=2, ensure_ascii=False)
        
        # Get file size
        file_size = file_path.stat().st_size
        
        return SimulationFile(
            filename=output_filename,
            path=str(file_path),
            size=file_size,
            created_at=datetime.now().isoformat()
        )


def run_combined_simulation(req: CombinedSimulationRequest) -> CombinedSimulationResponse:
    """
    Run combined simulation (regular + discrete).
    
    Args:
        req: CombinedSimulationRequest
    
    Returns:
        CombinedSimulationResponse with both simulation results
    """
    return CombinedSimulationService.run_combined(req)
