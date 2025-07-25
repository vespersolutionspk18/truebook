import { NextResponse } from "next/server";

const JD_POWER_API_KEY = process.env.JD_POWER_API_KEY;
const JD_POWER_BASE_URL = process.env.JD_POWER_BASE_URL || 'https://cloud.jdpower.ai/data-api/UAT/valuationservices';

interface JDPowerVehicleData {
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  bodyType?: string;
  engineType?: string;
  transmission?: string;
  drivetrain?: string;
  fuelType?: string;
  msrp?: number;
  [key: string]: any;
}

interface JDPowerValuationResponse {
  vehicle?: {
    vin: string;
    year: number;
    make: string;
    model: string;
    trim?: string;
    [key: string]: any;
  };
  values?: {
    cleanTradeIn?: number;
    averageTradeIn?: number;
    roughTradeIn?: number;
    cleanRetail?: number;
    averageRetail?: number;
    [key: string]: any;
  };
  mileageAdjustment?: number;
  [key: string]: any;
}

export async function fetchJDPowerData(vin: string): Promise<JDPowerVehicleData> {
  if (!JD_POWER_API_KEY) {
    throw new Error('JD Power API key not configured');
  }

  try {
    // JD Power API endpoint for VIN decode
    const url = `${JD_POWER_BASE_URL}/vin/${vin}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': JD_POWER_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`JD Power API error: ${response.status} - ${errorText}`);
      throw new Error(`JD Power API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform JD Power response to our format
    return {
      vin: vin,
      year: data.modelYear,
      make: data.make,
      model: data.model,
      trim: data.trim,
      bodyType: data.bodyType,
      engineType: data.engine,
      transmission: data.transmission,
      drivetrain: data.drivetrain,
      fuelType: data.fuelType,
      msrp: data.msrp,
      ...data // Include all other fields
    };
  } catch (error) {
    console.error('Error fetching JD Power data:', error);
    throw error;
  }
}

export async function fetchJDPowerValuation(
  vin: string, 
  options?: {
    period?: string;
    region?: number;
    mileage?: number;
    vehicletype?: string;
    userinfo?: string;
    vpp?: number;
    vinsourcedetail?: number;
  }
): Promise<JDPowerValuationResponse> {
  if (!JD_POWER_API_KEY) {
    throw new Error('JD Power API key not configured');
  }

  try {
    // Build query params according to JD Power API spec
    const params = new URLSearchParams({
      vin: vin,
      period: options?.period || '0', // 0 means current date
      region: (options?.region || 1).toString(), // Default to Eastern region
      ...(options?.mileage && { mileage: options.mileage.toString() }),
      ...(options?.vehicletype && { vehicletype: options.vehicletype }),
      ...(options?.userinfo && { userinfo: options.userinfo }),
      ...(options?.vpp && { vpp: options.vpp.toString() }),
      ...(options?.vinsourcedetail && { vinsourcedetail: options.vinsourcedetail.toString() })
    });

    const url = `${JD_POWER_BASE_URL}/valuation/defaultVehicleAndValuesByVin?${params}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'api-key': JD_POWER_API_KEY, // Note: header is 'api-key' not 'x-api-key'
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`JD Power API error: ${response.status} - ${errorText}`);
      throw new Error(`JD Power API error: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching JD Power valuation:', error);
    throw error;
  }
}

// Additional valuation methods
export async function fetchJDPowerLowValuation(vin: string, options?: Parameters<typeof fetchJDPowerValuation>[1]) {
  const url = `${JD_POWER_BASE_URL}/valuation/lowVehicleAndValuesByVin`;
  return fetchJDPowerValuationByEndpoint(url, vin, options);
}

export async function fetchJDPowerHighValuation(vin: string, options?: Parameters<typeof fetchJDPowerValuation>[1]) {
  const url = `${JD_POWER_BASE_URL}/valuation/highVehicleAndValuesByVin`;
  return fetchJDPowerValuationByEndpoint(url, vin, options);
}

export async function fetchJDPowerWeeklyValuation(vin: string, options?: Parameters<typeof fetchJDPowerValuation>[1]) {
  const url = `${JD_POWER_BASE_URL}/valuation/weeklyDefaultVehicleAndUsedValuesByVin`;
  return fetchJDPowerValuationByEndpoint(url, vin, options);
}

// Helper function for different endpoints
async function fetchJDPowerValuationByEndpoint(
  endpoint: string,
  vin: string,
  options?: Parameters<typeof fetchJDPowerValuation>[1]
): Promise<JDPowerValuationResponse> {
  if (!JD_POWER_API_KEY) {
    throw new Error('JD Power API key not configured');
  }

  try {
    const params = new URLSearchParams({
      vin: vin,
      period: options?.period || '0',
      region: (options?.region || 1).toString(),
      ...(options?.mileage && { mileage: options.mileage.toString() }),
      ...(options?.vehicletype && { vehicletype: options.vehicletype }),
      ...(options?.userinfo && { userinfo: options.userinfo }),
      ...(options?.vpp && { vpp: options.vpp.toString() }),
      ...(options?.vinsourcedetail && { vinsourcedetail: options.vinsourcedetail.toString() })
    });

    const url = `${endpoint}?${params}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'api-key': JD_POWER_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`JD Power API error: ${response.status} - ${errorText}`);
      throw new Error(`JD Power API error: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching JD Power valuation:', error);
    throw error;
  }
}