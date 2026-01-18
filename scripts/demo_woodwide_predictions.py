#!/usr/bin/env python3
"""Woodwide AI Demo - Before/After Predictions

Shows actual traffic data vs Woodwide AI predictions side-by-side.
"""

import asyncio
import sys
import json
import pandas as pd
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from api.woodwide_analytics import WoodwideAnalytics


def print_section(title):
    """Print a section header."""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80 + "\n")


async def main():
    print("\n" + "╔"+"═"*78+"╗")
    print("║" + " "*78 + "║")
    print("║" + "  🚗 WOODWIDE AI DEMO - BEFORE/AFTER PREDICTIONS".center(78) + "║")
    print("║" + " "*78 + "║")
    print("╚"+"═"*78+"╝")
    
    # Check CSV file
    csv_file = Path(__file__).parent.parent / "output" / "woodwide_csv" / "all_sensors_combined.csv"
    
    if not csv_file.exists():
        print("\n❌ No CSV data found. Run:")
        print("   python scripts/pittsburgh_traffic_simulator.py --sensors 5 --readings 20\n")
        return
    
    # Load actual data
    print_section("📊 STEP 1: ACTUAL TRAFFIC DATA (Before Predictions)")
    
    df = pd.read_csv(csv_file)
    print(f"Dataset: {len(df)} readings from {df['node_id'].nunique()} sensors")
    print(f"Locations: {', '.join(df['location'].unique()[:3])}...")
    print()
    
    # Show sample of actual data
    print("Sample of ACTUAL traffic data:")
    print("─"*80)
    sample_cols = ['location', 'frequency_of_cars_ph', 'average_speed_kmh', 
                   'traffic_density_percent', 'congestion_level']
    print(df[sample_cols].head(10).to_string(index=False))
    print("─"*80)
    
    # Statistics on actual data
    print("\n📈 Actual Data Statistics:")
    print(f"   Congestion Levels Distribution:")
    congestion_counts = df['congestion_level'].value_counts().sort_index()
    for level, count in congestion_counts.items():
        pct = (count / len(df)) * 100
        bar = "█" * int(pct / 2)
        print(f"      Level {level}: {count:>3} readings ({pct:>5.1f}%) {bar}")
    
    print(f"\n   Average Speed: {df['average_speed_kmh'].mean():.1f} km/h")
    print(f"   Average Density: {df['traffic_density_percent'].mean():.1f}%")
    print(f"   Average Cars/Hour: {df['frequency_of_cars_ph'].mean():.0f}")
    
    # Run Woodwide AI
    print_section("🤖 STEP 2: WOODWIDE AI ANALYSIS")
    
    try:
        woodwide = WoodwideAnalytics()
        print("✅ Woodwide AI initialized")
    except Exception as e:
        print(f"❌ Failed: {e}\n")
        return
    
    print("\n🚀 Running analysis (this may take 30-60 seconds)...")
    print("   • Uploading dataset to Woodwide AI")
    print("   • Training prediction model")
    print("   • Generating predictions")
    print()
    
    try:
        results = await woodwide.analyze_traffic_data(
            csv_file,
            predict_column="congestion_level"
        )
        
        print("\n✅ Analysis complete!")
        
    except Exception as e:
        print(f"\n❌ Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Show predictions
    print_section("🔮 STEP 3: WOODWIDE AI PREDICTIONS (After Analysis)")
    
    predictions = results["predictions"]
    
    # Extract prediction arrays
    if "prediction" in predictions:
        pred_dict = predictions["prediction"]
        pred_probs_dict = predictions.get("prediction_prob", {})
        
        # Convert dict to list (keys are string indices)
        pred_values = [pred_dict[str(i)] for i in range(len(pred_dict))]
        pred_probs = []
        if pred_probs_dict:
            for i in range(len(pred_probs_dict)):
                if str(i) in pred_probs_dict:
                    pred_probs.append(pred_probs_dict[str(i)])
        
        print(f"Generated {len(pred_values)} predictions")
        print()
        
        # Show sample predictions
        print("Sample PREDICTIONS vs ACTUAL:")
        print("─"*80)
        print(f"{'Location':<35} {'Actual':<8} {'Predicted':<10} {'Confidence'}")
        print("─"*80)
        
        for i in range(min(15, len(pred_values))):
            location = df.iloc[i]['location'][:33]
            actual = df.iloc[i]['congestion_level']
            predicted = pred_values[i]
            
            # Get confidence for predicted class
            if pred_probs and i < len(pred_probs):
                confidence = pred_probs[i][predicted] if predicted < len(pred_probs[i]) else 0
                conf_str = f"{confidence*100:.1f}%"
            else:
                conf_str = "N/A"
            
            # Mark if correct
            match = "✓" if actual == predicted else "✗"
            
            print(f"{location:<35} {actual:<8} {predicted:<10} {conf_str:<12} {match}")
        
        print("─"*80)
        
        # Calculate accuracy
        correct = sum(1 for i in range(len(pred_values)) if pred_values[i] == df.iloc[i]['congestion_level'])
        accuracy = (correct / len(pred_values)) * 100
        
        print(f"\n📊 Prediction Accuracy: {correct}/{len(pred_values)} correct ({accuracy:.1f}%)")
        
        # Predicted distribution
        print(f"\n📈 Predicted Congestion Distribution:")
        from collections import Counter
        pred_counts = Counter(pred_values)
        for level in sorted(pred_counts.keys()):
            count = pred_counts[level]
            pct = (count / len(pred_values)) * 100
            bar = "█" * int(pct / 2)
            print(f"      Level {level}: {count:>3} predictions ({pct:>5.1f}%) {bar}")
        
    else:
        print("Predictions format:")
        print(json.dumps(predictions, indent=2)[:500])
    
    # Comparison
    print_section("📊 STEP 4: BEFORE vs AFTER COMPARISON")
    
    print("ACTUAL DATA (Before):")
    print(f"   • {len(df)} traffic readings")
    print(f"   • Avg Speed: {df['average_speed_kmh'].mean():.1f} km/h")
    print(f"   • Avg Density: {df['traffic_density_percent'].mean():.1f}%")
    print(f"   • Congestion Distribution: {dict(congestion_counts)}")
    
    print("\nWOODWIDE AI PREDICTIONS (After):")
    print(f"   • {len(pred_values)} predictions generated")
    print(f"   • Accuracy: {accuracy:.1f}%")
    print(f"   • Predicted Distribution: {dict(pred_counts)}")
    print(f"   • Model ID: {results['model_id']}")
    
    print("\n💡 INSIGHTS:")
    print(f"   • Woodwide AI learned traffic patterns from {len(df)} examples")
    print(f"   • Model can predict congestion with {accuracy:.1f}% accuracy")
    print(f"   • Predictions include confidence scores for each level")
    print(f"   • No feature engineering or model tuning required!")
    
    # Save detailed comparison
    comparison_file = Path(__file__).parent.parent / "output" / "woodwide_comparison.json"
    comparison = {
        "actual_data": {
            "count": len(df),
            "avg_speed": float(df['average_speed_kmh'].mean()),
            "avg_density": float(df['traffic_density_percent'].mean()),
            "congestion_distribution": {int(k): int(v) for k, v in congestion_counts.items()}
        },
        "predictions": {
            "count": len(pred_values),
            "accuracy": float(accuracy),
            "predicted_distribution": {int(k): int(v) for k, v in pred_counts.items()},
            "model_id": results['model_id']
        },
        "sample_predictions": [
            {
                "location": df.iloc[i]['location'],
                "actual": int(df.iloc[i]['congestion_level']),
                "predicted": int(pred_values[i]),
                "correct": pred_values[i] == df.iloc[i]['congestion_level']
            }
            for i in range(min(20, len(pred_values)))
        ]
    }
    
    with open(comparison_file, "w") as f:
        json.dump(comparison, f, indent=2)
    
    print(f"\n💾 Detailed comparison saved to: {comparison_file}")
    
    print("\n" + "╔"+"═"*78+"╗")
    print("║" + " "*78 + "║")
    print("║" + "  ✨ DEMO COMPLETE - Woodwide AI Successfully Predicted Traffic!".center(78) + "║")
    print("║" + " "*78 + "║")
    print("╚"+"═"*78+"╝\n")


if __name__ == "__main__":
    asyncio.run(main())
