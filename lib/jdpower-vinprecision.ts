import { NextResponse } from "next/server";

const JD_POWER_API_KEY = process.env.JD_POWER_API_KEY;
const JD_POWER_BASE_URL = process.env.JD_POWER_BASE_URL || 'https://cloud.jdpower.ai/data-api/UAT/valuationservices';

export interface BuildDataAvailabilityResponse {
  requestId?: string;
  result?: Array<{
    vin: string;
    buildDataAvailable: boolean;
  }>;
  error?: string;
}

export interface VINPrecisionAccessoryResponse {
  requestId?: string;
  result?: Array<{
    accdesc: string;
    acccode: string;
    tradein: number;
    retail: number;
    loan: number;
    isincluded: number;
    isadded: number;
    accessorycategory: string;
    includes: string;
    excludes: string;
  }>;
  userinfo?: string;
  authId?: string;
}

/**
 * Check if VIN Precision+ build data is available for a VIN
 */
export async function checkBuildDataAvailability(vin: string): Promise<BuildDataAvailabilityResponse> {
  if (!JD_POWER_API_KEY) {
    throw new Error('JD Power API key not configured');
  }

  try {
    const params = new URLSearchParams({
      vin: vin
    });

    const url = `${JD_POWER_BASE_URL}/build/buildDataAvailableByVin?${params}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'api-key': JD_POWER_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`JD Power build data check error: ${response.status} - ${errorText}`);
      throw new Error(`JD Power API error: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking build data availability:', error);
    throw error;
  }
}

/**
 * Get VIN Precision+ accessory data (includes factory-installed options)
 */
export async function fetchVINPrecisionAccessories(
  vin: string,
  options: {
    period?: string;
    region?: number;
    vehicletype?: string;
  }
): Promise<VINPrecisionAccessoryResponse> {
  if (!JD_POWER_API_KEY) {
    throw new Error('JD Power API key not configured');
  }

  try {
    const params = new URLSearchParams({
      vin: vin,
      period: options.period || '0',
      region: (options.region || 1).toString(),
      ...(options.vehicletype && { vehicletype: options.vehicletype })
    });

    const url = `${JD_POWER_BASE_URL}/build/buildAccessoryDataByVin?${params}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'api-key': JD_POWER_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`JD Power VIN Precision+ error: ${response.status} - ${errorText}`);
      throw new Error(`JD Power API error: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching VIN Precision+ accessories:', error);
    throw error;
  }
}

/**
 * Get the best available accessory data for a VIN
 * First tries VIN Precision+, then falls back to standard method
 */
export async function fetchBestAccessoryData(
  vin: string,
  ucgVehicleId: string,
  options: {
    period?: string;
    region?: number;
    vehicletype?: string;
  }
): Promise<any> {
  try {
    // Step 1: Check if build data is available
    console.log('Checking build data availability for VIN:', vin);
    const buildDataCheck = await checkBuildDataAvailability(vin);
    
    if (buildDataCheck.result?.[0]?.buildDataAvailable) {
      console.log('Build data available, using VIN Precision+');
      // Step 2: Use VIN Precision+ if available
      return await fetchVINPrecisionAccessories(vin, options);
    } else {
      console.log('Build data not available, using standard accessory method');
      // Step 3: Fall back to standard method
      const params = new URLSearchParams({
        vin: vin,
        ucgvehicleid: ucgVehicleId,
        period: options.period || '0',
        region: (options.region || 1).toString(),
        ...(options.vehicletype && { vehicletype: options.vehicletype })
      });

      const url = `${JD_POWER_BASE_URL}/valuation/accessoryDataByVinAndVehicleId?${params}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'api-key': JD_POWER_API_KEY,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`JD Power API error: ${response.status}`);
      }

      return await response.json();
    }
  } catch (error) {
    console.error('Error in fetchBestAccessoryData:', error);
    throw error;
  }
}