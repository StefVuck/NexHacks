#!/usr/bin/env python3
"""Simple Woodwide AI Demo - Before/After Predictions"""

import asyncio
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from api.woodwide_analytics import WoodwideAnalytics


async def main():
    print("\n" + "="*80)
    print("🚗 WOODWIDE AI DEMO - TRAFFIC PREDICTIONS")
    print("="*80 + "\n")
    
    # Load CSV
    csv_file = Path(__file__).parent.parent / "output" / "woodwide_csv" / "all_sensors_combined.csv"
    
    if not csv_file.exists():
        print("❌ No data. Run: python scripts/pittsburgh_traffic_simulator.py --sensors 5 --readings 20\n")
        return
    
    # Read actual data
    print("📊 BEFORE: Actual Traffic Data")
    print("─"*80)
    
    with open(csv_file) as f:
        lines = f.readlines()
        header = lines[0].strip()
        data_lines = lines[1:]
    
    print(f"Dataset: {len(data_lines)} readings")
    print(f"\nFirst 5 readings:")
    print(header)
    for line in data_lines[:5]:
        print(line.strip())
    
    # Count actual congestion levels
    actual_congestion = {}
    for line in data_lines:
        parts = line.strip().split(',')
        if len(parts) > 9:
            level = int(parts[9])  # congestion_level is last column
            actual_congestion[level] = actual_congestion.get(level, 0) + 1
    
    print(f"\nActual Congestion Distribution:")
    for level in sorted(actual_congestion.keys()):
        count = actual_congestion[level]
        pct = (count / len(data_lines)) * 100
        bar = "█" * int(pct / 3)
        print(f"   Level {level}: {count:>2} ({pct:>5.1f}%) {bar}")
    
    # Run Woodwide AI
    print("\n" + "="*80)
    print("🤖 WOODWIDE AI ANALYSIS")
    print("="*80)
    print("\nTraining prediction model...")
    
    try:
        woodwide = WoodwideAnalytics()
        results = await woodwide.analyze_traffic_data(csv_file, "congestion_level")
        print("✅ Analysis complete!\n")
    except Exception as e:
        print(f"❌ Failed: {e}\n")
        return
    
    # Show predictions
    print("="*80)
    print("🔮 AFTER: Woodwide AI Predictions")
    print("="*80)
    
    predictions = results["predictions"]
    pred_dict = predictions.get("prediction", {})
    
    # Convert to list
    pred_values = [pred_dict[str(i)] for i in range(len(pred_dict))]
    
    print(f"\nGenerated {len(pred_values)} predictions")
    
    # Count predicted congestion
    pred_congestion = {}
    for pred in pred_values:
        pred_congestion[pred] = pred_congestion.get(pred, 0) + 1
    
    print(f"\nPredicted Congestion Distribution:")
    for level in sorted(pred_congestion.keys()):
        count = pred_congestion[level]
        pct = (count / len(pred_values)) * 100
        bar = "█" * int(pct / 3)
        print(f"   Level {level}: {count:>2} ({pct:>5.1f}%) {bar}")
    
    # Compare predictions vs actual
    print(f"\n📊 Comparison (First 15 readings):")
    print("─"*80)
    print(f"{'#':<4} {'Actual':<8} {'Predicted':<10} {'Match'}")
    print("─"*80)
    
    correct = 0
    for i in range(min(15, len(pred_values))):
        parts = data_lines[i].strip().split(',')
        actual = int(parts[9])
        predicted = pred_values[i]
        match = "✓" if actual == predicted else "✗"
        if actual == predicted:
            correct += 1
        print(f"{i+1:<4} {actual:<8} {predicted:<10} {match}")
    
    print("─"*80)
    
    # Calculate accuracy
    total_correct = sum(1 for i in range(len(pred_values)) 
                       if pred_values[i] == int(data_lines[i].strip().split(',')[9]))
    accuracy = (total_correct / len(pred_values)) * 100
    
    print(f"\n✨ Accuracy: {total_correct}/{len(pred_values)} correct ({accuracy:.1f}%)")
    
    print("\n" + "="*80)
    print("📈 SUMMARY")
    print("="*80)
    print(f"\nBEFORE (Actual Data):")
    print(f"   Distribution: {dict(actual_congestion)}")
    print(f"\nAFTER (Woodwide Predictions):")
    print(f"   Distribution: {dict(pred_congestion)}")
    print(f"   Accuracy: {accuracy:.1f}%")
    print(f"   Model ID: {results['model_id']}")
    
    print("\n💡 Woodwide AI learned traffic patterns and predicted congestion!")
    print("   No feature engineering or model tuning required.\n")


if __name__ == "__main__":
    asyncio.run(main())
