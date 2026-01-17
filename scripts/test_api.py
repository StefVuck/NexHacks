#!/usr/bin/env python3
"""Test the FastAPI backend."""

import requests
import json
import time

BASE_URL = "http://localhost:8000"


def test_health():
    """Test health endpoint."""
    print("Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"✓ Health: {response.json()}")
    print()


def test_build():
    """Test build endpoint."""
    print("Testing build endpoint...")
    
    # Start a build
    build_request = {
        "description": "Simple counter test",
        "board_id": "lm3s6965",
        "nodes": [
            {
                "node_id": "counter",
                "description": "Count from 1 to 5, printing each number",
                "assertions": [
                    {"name": "has_1", "pattern": "1"},
                    {"name": "has_5", "pattern": "5"}
                ]
            }
        ]
    }
    
    response = requests.post(f"{BASE_URL}/api/build/start", json=build_request)
    result = response.json()
    print(f"✓ Build started: {result}")
    
    session_id = result["session_id"]
    print(f"  Session ID: {session_id}")
    print()
    
    # Poll status
    print("Polling build status...")
    for i in range(30):  # Poll for up to 30 seconds
        time.sleep(1)
        response = requests.get(f"{BASE_URL}/api/build/{session_id}/status")
        status = response.json()
        
        print(f"  [{i+1}s] Status: {status['status']}, Node: {status.get('current_node', 'N/A')}, Iteration: {status['current_iteration']}")
        
        if status["status"] in ["success", "failed"]:
            print()
            print(f"✓ Build completed with status: {status['status']}")
            if status["results"]:
                print(f"  Results: {json.dumps(status['results'], indent=2)}")
            break
    else:
        print("  ⚠ Build still running after 30s")
    
    print()


def test_devices():
    """Test device listing."""
    print("Testing device listing...")
    response = requests.get(f"{BASE_URL}/api/deploy/devices")
    devices = response.json()
    print(f"✓ Found {len(devices)} device(s)")
    for device in devices:
        print(f"  - {device['port']}: {device['description']}")
    print()


if __name__ == "__main__":
    print("=" * 60)
    print("Swarm Architect API Test")
    print("=" * 60)
    print()
    
    try:
        test_health()
        test_build()
        test_devices()
        
        print("=" * 60)
        print("✓ All tests completed")
        print("=" * 60)
        
    except requests.exceptions.ConnectionError:
        print("✗ Error: Could not connect to API server")
        print("  Make sure the server is running: uvicorn api.main:app --reload")
    except Exception as e:
        print(f"✗ Error: {e}")
