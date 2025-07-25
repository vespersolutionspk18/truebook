// Test JD Power API directly
const fetch = require('node-fetch');

async function testJDPower() {
  const apiKey = process.env.JD_POWER_API_KEY;
  const baseUrl = process.env.JD_POWER_BASE_URL || 'https://cloud.jdpower.ai/data-api/UAT/valuationservices';
  
  const vin = '1C4RJFBG2EC578342'; // The Jeep VIN
  
  // First get valuation
  const valuationParams = new URLSearchParams({
    vin: vin,
    period: '0',
    region: '1',
    mileage: '101900',
    vehicletype: 'UsedCar'
  });
  
  console.log('Fetching valuation...');
  const valuationResponse = await fetch(`${baseUrl}/valuation/defaultVehicleAndValuesByVin?${valuationParams}`, {
    headers: {
      'api-key': apiKey,
      'Accept': 'application/json'
    }
  });
  
  const valuationData = await valuationResponse.json();
  console.log('\n=== VALUATION RESPONSE ===');
  console.log('Status:', valuationResponse.status);
  console.log('First result keys:', Object.keys(valuationData.result?.[0] || {}));
  
  const ucgVehicleId = valuationData.result?.[0]?.ucgvehicleid;
  console.log('UCG Vehicle ID:', ucgVehicleId);
  
  if (ucgVehicleId) {
    // Now get accessories
    const accessoryParams = new URLSearchParams({
      vin: vin,
      ucgvehicleid: ucgVehicleId,
      period: '0',
      region: '1',
      vehicletype: 'UsedCar'
    });
    
    console.log('\nFetching accessories...');
    const accessoriesResponse = await fetch(`${baseUrl}/valuation/accessoryDataByVinAndVehicleId?${accessoryParams}`, {
      headers: {
        'api-key': apiKey,
        'Accept': 'application/json'
      }
    });
    
    const accessoriesData = await accessoriesResponse.json();
    console.log('\n=== ACCESSORIES RESPONSE ===');
    console.log('Status:', accessoriesResponse.status);
    console.log('Number of accessories:', accessoriesData.result?.length || 0);
    
    if (accessoriesData.result?.length > 0) {
      console.log('\nFirst 3 accessories:');
      accessoriesData.result.slice(0, 3).forEach((acc, i) => {
        console.log(`\nAccessory ${i + 1}:`);
        console.log('  Fields:', Object.keys(acc));
        console.log('  Data:', JSON.stringify(acc, null, 2));
      });
    }
  }
}

// Load env vars from .env.local
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

testJDPower().catch(console.error);