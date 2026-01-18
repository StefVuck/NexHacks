"""Woodwide AI Routes - Traffic Predictions and Analytics

Endpoints for getting AI-powered predictions on traffic data.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional
from pathlib import Path

from api.woodwide_analytics import WoodwideAnalytics
from api.woodwide_service import get_woodwide_service

router = APIRouter(prefix="/api/woodwide/ai", tags=["woodwide-ai"])


@router.post("/analyze")
async def analyze_traffic_data(predict_column: str = "congestion_level"):
    """Analyze traffic data with Woodwide AI.
    
    This will:
    1. Export current buffered data to CSV
    2. Upload to Woodwide AI
    3. Train prediction model
    4. Return predictions and insights
    
    Args:
        predict_column: Column to predict (default: congestion_level)
    """
    # Get CSV service
    csv_service = get_woodwide_service()
    
    # Export to CSV
    csv_file = csv_service.export_to_csv(clear_buffer=False)
    
    if not csv_file.exists() or csv_file.stat().st_size == 0:
        raise HTTPException(status_code=400, detail="No data available for analysis")
    
    # Initialize Woodwide
    try:
        woodwide = WoodwideAnalytics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Woodwide initialization failed: {e}")
    
    # Run analysis
    try:
        results = await woodwide.analyze_traffic_data(csv_file, predict_column)
        
        return {
            "status": "success",
            "dataset_id": results["dataset_id"],
            "model_id": results["model_id"],
            "training_status": results["model_info"].get("training_status"),
            "predictions": results["predictions"],
            "csv_file": str(csv_file)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")


@router.get("/predictions/{model_id}")
async def get_predictions(model_id: str, dataset_id: Optional[str] = None):
    """Get predictions from a trained Woodwide model.
    
    Args:
        model_id: Woodwide model ID
        dataset_id: Optional dataset ID (uses current data if not provided)
    """
    try:
        woodwide = WoodwideAnalytics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Woodwide initialization failed: {e}")
    
    # If no dataset_id, export current data
    if not dataset_id:
        csv_service = get_woodwide_service()
        csv_file = csv_service.export_to_csv(clear_buffer=False)
        
        if not csv_file.exists():
            raise HTTPException(status_code=400, detail="No data available")
        
        # Upload to Woodwide
        import time
        dataset_name = f"traffic_data_{int(time.time())}"
        dataset_id = await woodwide.upload_dataset(csv_file, dataset_name)
    
    # Get predictions
    try:
        predictions = await woodwide.predict(model_id, dataset_id)
        return {
            "status": "success",
            "model_id": model_id,
            "dataset_id": dataset_id,
            "predictions": predictions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")


@router.get("/insights")
async def get_traffic_insights():
    """Get AI-powered insights on current traffic data.
    
    Returns summary statistics and predictions.
    """
    csv_service = get_woodwide_service()
    
    # Get basic stats
    stats = csv_service.get_stats()
    
    if stats.get("count", 0) == 0:
        raise HTTPException(status_code=400, detail="No data available")
    
    # Add AI insights
    insights = {
        "basic_stats": stats,
        "ai_insights": {
            "status": "ready",
            "message": "Use POST /api/woodwide/ai/analyze to get AI predictions"
        }
    }
    
    return insights
