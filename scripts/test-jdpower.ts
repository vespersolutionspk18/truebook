import { fetchJDPowerValuation, fetchJDPowerLowValuation, fetchJDPowerHighValuation, fetchJDPowerWeeklyValuation } from '../lib/jdpower';

const TEST_VIN = '1C4RJFBG7EC231971';

async function testJDPowerAPI() {
  console.log('Testing JD Power API with VIN:', TEST_VIN);
  console.log('API Key:', process.env.JD_POWER_API_KEY ? 'Set' : 'Not Set');
  console.log('Base URL:', process.env.JD_POWER_BASE_URL || 'Using default UAT URL');
  console.log('---');

  try {
    // Test default valuation
    console.log('1. Testing Default Valuation...');
    const defaultValuation = await fetchJDPowerValuation(TEST_VIN, {
      region: 1, // Eastern region
      mileage: 50000, // Example mileage
      vehicletype: 'UsedCar'
    });
    console.log('Default Valuation Result:');
    console.log(JSON.stringify(defaultValuation, null, 2));
    console.log('---');

    // Test low valuation
    console.log('2. Testing Low Valuation...');
    const lowValuation = await fetchJDPowerLowValuation(TEST_VIN, {
      region: 1,
      mileage: 50000,
      vehicletype: 'UsedCar'
    });
    console.log('Low Valuation Result:');
    console.log(JSON.stringify(lowValuation, null, 2));
    console.log('---');

    // Test high valuation
    console.log('3. Testing High Valuation...');
    const highValuation = await fetchJDPowerHighValuation(TEST_VIN, {
      region: 1,
      mileage: 50000,
      vehicletype: 'UsedCar'
    });
    console.log('High Valuation Result:');
    console.log(JSON.stringify(highValuation, null, 2));
    console.log('---');

    // Test weekly valuation
    console.log('4. Testing Weekly Valuation...');
    const weeklyValuation = await fetchJDPowerWeeklyValuation(TEST_VIN, {
      region: 1,
      mileage: 50000,
      vehicletype: 'UsedCar'
    });
    console.log('Weekly Valuation Result:');
    console.log(JSON.stringify(weeklyValuation, null, 2));

  } catch (error) {
    console.error('Error testing JD Power API:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testJDPowerAPI();