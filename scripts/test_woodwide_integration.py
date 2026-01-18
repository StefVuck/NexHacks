#!/usr/bin/env python3
"""Test Woodwide AI Integration with Pittsburgh Traffic Data

This script:
1. Generates traffic data via backend
2. Exports CSV
3. Uploads to Woodwide AI
4. Trains prediction model
5. Gets traffic predictions and insights
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from api.woodwide_analytics import WoodwideAnalytics


async def main():
    print("\n" + "="*80)
    print("🚗 PITTSBURGH TRAFFIC + WOODWIDE AI INTEGRATION TEST")
    print("="*80)
    print("Testing numeric reasoning on traffic data")
    print("="*80 + "\n")
    
    # Check if we have CSV data
    csv_file = Path(__file__).parent.parent / "output" / "woodwide_csv" / "all_sensors_combined.csv"
    
    if not csv_file.exists():
        print("❌ No CSV data found. Run the simulator first:")
        print("   python scripts/pittsburgh_traffic_simulator.py --sensors 5 --readings 20")
        print()
        return
    
    print(f"📁 Using CSV file: {csv_file}")
    print(f"   File size: {csv_file.stat().st_size:,} bytes")
    
    # Count rows
    with open(csv_file) as f:
        num_rows = sum(1 for _ in f) - 1  # Subtract header
    print(f"   Rows: {num_rows}")
    print()
    
    # Initialize Woodwide
    try:
        woodwide = WoodwideAnalytics()
        print("✅ Woodwide AI client initialized")
        print()
    except Exception as e:
        print(f"❌ Failed to initialize Woodwide: {e}")
        print("   Make sure WOODWIDE_KEY is set in .env")
        return
    
    # Run analysis
    try:
        print("🚀 Starting Woodwide AI analysis...")
        print("   This will:")
        print("   1. Upload CSV to Woodwide")
        print("   2. Train prediction model for congestion_level")
        print("   3. Generate predictions")
        print()
        
        results = await woodwide.analyze_traffic_data(
            csv_file,
            predict_column="congestion_level"
        )
        
        print("\n" + "="*80)
        print("📊 ANALYSIS COMPLETE")
        print("="*80)
        
        print(f"\n📈 Model Info:")
        model_info = results["model_info"]
        print(f"   Model ID: {results['model_id']}")
        print(f"   Dataset ID: {results['dataset_id']}")
        print(f"   Training Status: {model_info.get('training_status')}")
        
        print(f"\n🔮 Predictions:")
        predictions = results["predictions"]
        
        # Show prediction summary
        if isinstance(predictions, dict):
            print(f"   Type: {type(predictions)}")
            if "predictions" in predictions:
                pred_list = predictions["predictions"]
                print(f"   Count: {len(pred_list)}")
                print(f"\n   First 5 predictions:")
                for i, pred in enumerate(pred_list[:5], 1):
                    print(f"      {i}. {pred}")
            else:
                print(f"   Keys: {list(predictions.keys())}")
        elif isinstance(predictions, list):
            print(f"   Count: {len(predictions)}")
            print(f"\n   First 5 predictions:")
            for i, pred in enumerate(predictions[:5], 1):
                print(f"      {i}. {pred}")
        
        # Save results
        output_file = Path(__file__).parent.parent / "output" / "woodwide_predictions.json"
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        import json
        with open(output_file, "w") as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\n💾 Full results saved to: {output_file}")
        
        print("\n" + "="*80)
        print("✨ Woodwide AI integration successful!")
        print("="*80 + "\n")
        
    except Exception as e:
        print(f"\n❌ Analysis failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
