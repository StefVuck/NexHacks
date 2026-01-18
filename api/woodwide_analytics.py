"""Woodwide AI Integration - Traffic Data Analysis

Integrates with Woodwide AI to provide predictions and insights on traffic data.
"""

import os
import httpx
import time
from pathlib import Path
from typing import Optional, Dict, Any


class WoodwideAnalytics:
    """Woodwide AI integration for traffic analytics."""
    
    def __init__(self, api_key: Optional[str] = None, base_url: str = "https://beta.woodwide.ai"):
        self.api_key = api_key or os.getenv("WOODWIDE_KEY")
        self.base_url = base_url.rstrip("/")
        
        if not self.api_key:
            raise ValueError("WOODWIDE_KEY not found in environment")
        
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "accept": "application/json"
        }
    
    async def upload_dataset(self, csv_file: Path, dataset_name: str) -> str:
        """Upload CSV dataset to Woodwide.
        
        Returns:
            dataset_id
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            with open(csv_file, "rb") as f:
                files = {"file": (csv_file.name, f, "text/csv")}
                data = {
                    "name": dataset_name,
                    "overwrite": "true"
                }
                
                response = await client.post(
                    f"{self.base_url}/api/datasets",
                    headers=self.headers,
                    files=files,
                    data=data
                )
                
                if response.status_code != 200:
                    raise Exception(f"Upload failed: {response.status_code} - {response.text}")
                
                result = response.json()
                return result["id"]
    
    async def train_prediction_model(
        self,
        dataset_name: str,
        model_name: str,
        label_column: str
    ) -> str:
        """Train a prediction model on the dataset.
        
        Returns:
            model_id
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/api/models/prediction/train",
                headers=self.headers,
                params={"dataset_name": dataset_name},
                data={
                    "model_name": model_name,
                    "label_column": label_column,
                    "overwrite": "true"
                }
            )
            
            if response.status_code != 200:
                raise Exception(f"Training failed: {response.status_code} - {response.text}")
            
            result = response.json()
            return result["id"]
    
    async def wait_for_training(self, model_id: str, timeout: int = 300) -> Dict[str, Any]:
        """Wait for model training to complete.
        
        Returns:
            model info
        """
        start_time = time.time()
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            while True:
                response = await client.get(
                    f"{self.base_url}/api/models/{model_id}",
                    headers=self.headers
                )
                
                if response.status_code != 200:
                    raise Exception(f"Status check failed: {response.status_code}")
                
                model_info = response.json()
                status = model_info.get("training_status")
                
                if status == "COMPLETE":
                    return model_info
                elif status == "FAILED":
                    raise Exception(f"Training failed: {model_info}")
                
                if time.time() - start_time > timeout:
                    raise Exception(f"Training timeout after {timeout}s")
                
                await asyncio.sleep(2)
    
    async def predict(self, model_id: str, dataset_id: str) -> Dict[str, Any]:
        """Run predictions on a dataset.
        
        Returns:
            prediction results
        """
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/api/models/prediction/{model_id}/infer",
                headers=self.headers,
                params={"dataset_id": dataset_id}
            )
            
            if response.status_code != 200:
                raise Exception(f"Prediction failed: {response.status_code} - {response.text}")
            
            return response.json()
    
    async def analyze_traffic_data(
        self,
        csv_file: Path,
        predict_column: str = "congestion_level"
    ) -> Dict[str, Any]:
        """Complete workflow: upload, train, predict.
        
        Args:
            csv_file: Path to CSV file
            predict_column: Column to predict
            
        Returns:
            Analysis results including predictions
        """
        import asyncio
        
        dataset_name = f"traffic_data_{int(time.time())}"
        model_name = f"traffic_model_{int(time.time())}"
        
        print(f"📊 Uploading dataset to Woodwide AI...")
        dataset_id = await self.upload_dataset(csv_file, dataset_name)
        print(f"   ✅ Dataset uploaded: {dataset_id}")
        
        print(f"\n🤖 Training prediction model for '{predict_column}'...")
        model_id = await self.train_prediction_model(
            dataset_name,
            model_name,
            predict_column
        )
        print(f"   ✅ Training started: {model_id}")
        
        print(f"\n⏳ Waiting for training to complete...")
        model_info = await self.wait_for_training(model_id)
        print(f"   ✅ Training complete!")
        
        print(f"\n🔮 Running predictions...")
        predictions = await self.predict(model_id, dataset_id)
        print(f"   ✅ Predictions generated!")
        
        return {
            "dataset_id": dataset_id,
            "model_id": model_id,
            "model_info": model_info,
            "predictions": predictions
        }


# Import asyncio at module level
import asyncio
