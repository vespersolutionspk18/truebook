#!/bin/bash

# Test JD Power API with curl commands
# Replace YOUR_API_KEY with your actual API key

API_KEY="${JD_POWER_API_KEY}"
BASE_URL="${JD_POWER_BASE_URL:-https://cloud.jdpower.ai/data-api/UAT/valuationservices}"
VIN="1C4RJFBG7EC231971"

echo "Testing JD Power API with VIN: $VIN"
echo "API Key: ${API_KEY:0:10}..." # Show first 10 chars only
echo "Base URL: $BASE_URL"
echo "---"

# Test 1: Default Valuation
echo "1. Testing Default Vehicle and Values by VIN..."
curl -X GET "$BASE_URL/valuation/defaultVehicleAndValuesByVin?vin=$VIN&period=0&region=1&mileage=50000&vehicletype=UsedCar" \
  -H "api-key: $API_KEY" \
  -H "Accept: application/json" | jq '.'

echo -e "\n---"

# Test 2: Low Valuation
echo "2. Testing Low Vehicle and Values by VIN..."
curl -X GET "$BASE_URL/valuation/lowVehicleAndValuesByVin?vin=$VIN&period=0&region=1&mileage=50000&vehicletype=UsedCar" \
  -H "api-key: $API_KEY" \
  -H "Accept: application/json" | jq '.'

echo -e "\n---"

# Test 3: High Valuation
echo "3. Testing High Vehicle and Values by VIN..."
curl -X GET "$BASE_URL/valuation/highVehicleAndValuesByVin?vin=$VIN&period=0&region=1&mileage=50000&vehicletype=UsedCar" \
  -H "api-key: $API_KEY" \
  -H "Accept: application/json" | jq '.'

echo -e "\n---"

# Test 4: Weekly Valuation
echo "4. Testing Weekly Default Vehicle and Used Values by VIN..."
curl -X GET "$BASE_URL/valuation/weeklyDefaultVehicleAndUsedValuesByVin?vin=$VIN&period=0&region=1&mileage=50000&vehicletype=UsedCar" \
  -H "api-key: $API_KEY" \
  -H "Accept: application/json" | jq '.'