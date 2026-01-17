#!/usr/bin/env python3
"""Simple ESP32 test - just generate code, skip Wokwi for now."""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

if not os.getenv("ANTHROPIC_API_KEY"):
    print("ERROR: ANTHROPIC_API_KEY not set")
    sys.exit(1)

import anthropic

# Simple test - just call Claude once to generate ESP32 code
client = anthropic.Anthropic()

prompt = """Generate a simple ESP32 Arduino sketch that:
1. Blinks the built-in LED every 500ms
2. Prints "blink" to Serial each time

Output ONLY the code, no explanation. Include setup() and loop()."""

print("Calling Claude API...")
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[{"role": "user", "content": prompt}],
)

print("\n=== Generated Code ===")
print(response.content[0].text)
print("\n=== Done ===")
