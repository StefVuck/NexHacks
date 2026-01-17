#!/bin/bash
# Test the complete build flow

echo "=========================================="
echo "Testing Swarm Architect API Build Flow"
echo "=========================================="
echo ""

# 1. Health check
echo "1. Health Check..."
curl -s http://localhost:8000/health | jq '.'
echo ""

# 2. List available devices
echo "2. List USB Devices..."
curl -s http://localhost:8000/api/deploy/devices | jq '.'
echo ""

# 3. Start a build
echo "3. Starting Build..."
BUILD_RESPONSE=$(curl -s -X POST http://localhost:8000/api/build/start \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Temperature monitoring system",
    "board_id": "lm3s6965",
    "nodes": [{
      "node_id": "temp_sensor",
      "description": "Simulate temperature sensor reading. Print temperature values from 20 to 25 degrees Celsius, one per second, in format: temp=XX°C",
      "assertions": [
        {"name": "has_temp", "pattern": "temp="},
        {"name": "has_celsius", "pattern": "°C"}
      ]
    }]
  }')

echo "$BUILD_RESPONSE" | jq '.'
SESSION_ID=$(echo "$BUILD_RESPONSE" | jq -r '.session_id')
echo ""
echo "Session ID: $SESSION_ID"
echo ""

# 4. Poll build status
echo "4. Monitoring Build Progress..."
for i in {1..30}; do
  sleep 1
  STATUS=$(curl -s "http://localhost:8000/api/build/$SESSION_ID/status")
  BUILD_STATUS=$(echo "$STATUS" | jq -r '.status')
  CURRENT_NODE=$(echo "$STATUS" | jq -r '.current_node // "N/A"')
  ITERATION=$(echo "$STATUS" | jq -r '.current_iteration')
  
  echo "  [$i] Status: $BUILD_STATUS | Node: $CURRENT_NODE | Iteration: $ITERATION"
  
  if [ "$BUILD_STATUS" = "success" ] || [ "$BUILD_STATUS" = "failed" ]; then
    echo ""
    echo "Build completed with status: $BUILD_STATUS"
    echo ""
    echo "Full Results:"
    echo "$STATUS" | jq '.'
    break
  fi
done

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
