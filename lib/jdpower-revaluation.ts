/**
 * JD Power Re-valuation with Selected Accessories
 * 
 * This module handles sending selected accessories back to JD Power
 * to get updated valuation that reflects the actual vehicle configuration
 */

interface JDPowerRevaluationOptions {
  vin: string;
  ucgVehicleId: string;
  period: string;
  region: number;
  mileage?: number;
  selectedAccessoryCodes: string[];
  vehicletype?: string;
}

interface JDPowerRevaluationResult {
  success: boolean;
  updatedValues?: {
    baseCleanTradeIn: number;
    baseAverageTradeIn: number;
    baseRoughTradeIn: number;
    baseCleanRetail: number;
    baseLoanValue: number;
    adjustedCleanTradeIn: number;
    adjustedAverageTradeIn: number;
    adjustedRoughTradeIn: number;
    adjustedCleanRetail: number;
    adjustedLoanValue: number;
    accessoryAdjustments: {
      tradeIn: number;
      retail: number;
      loan: number;
    };
    mileageAdjustment: number;
  };
  error?: string;
  requestId?: string;
}

export async function revaluateWithSelectedAccessories(
  options: JDPowerRevaluationOptions
): Promise<JDPowerRevaluationResult> {
  try {
    const {
      vin,
      ucgVehicleId,
      period,
      region,
      mileage,
      selectedAccessoryCodes,
      vehicletype = 'UsedCar'
    } = options;

    console.log('JD Power re-valuation request:', {
      vin,
      ucgVehicleId,
      selectedAccessories: selectedAccessoryCodes.length,
      region,
      mileage
    });

    // JD Power doesn't have a direct "valuation with accessories" endpoint
    // So we need to use the base valuation + individual accessory adjustments approach
    
    // Step 1: Get fresh base valuation
    const baseParams = new URLSearchParams({
      vin: vin,
      period: period,
      region: region.toString(),
      vehicletype: vehicletype
    });

    if (mileage) {
      baseParams.append('mileage', mileage.toString());
    }

    const baseUrl = `${process.env.JD_POWER_BASE_URL || 'https://cloud.jdpower.ai/data-api/UAT/valuationservices'}/valuation/defaultVehicleAndValuesByVin?${baseParams}`;
    
    const baseResponse = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        'api-key': process.env.JD_POWER_API_KEY!,
        'Accept': 'application/json'
      }
    });

    if (!baseResponse.ok) {
      const errorText = await baseResponse.text();
      throw new Error(`JD Power base valuation failed: ${baseResponse.status} ${errorText}`);
    }

    const baseData = await baseResponse.json();
    const baseResult = baseData.result?.[0];

    if (!baseResult) {
      throw new Error('No base valuation data returned from JD Power');
    }

    // Step 2: Get accessories data to calculate adjustments
    const accessoryParams = new URLSearchParams({
      vin: vin,
      ucgvehicleid: ucgVehicleId,
      period: period,
      region: region.toString(),
      vehicletype: vehicletype
    });

    const accessoryUrl = `${process.env.JD_POWER_BASE_URL || 'https://cloud.jdpower.ai/data-api/UAT/valuationservices'}/valuation/accessoryDataByVinAndVehicleId?${accessoryParams}`;
    
    const accessoryResponse = await fetch(accessoryUrl, {
      method: 'GET',
      headers: {
        'api-key': process.env.JD_POWER_API_KEY!,
        'Accept': 'application/json'
      }
    });

    if (!accessoryResponse.ok) {
      const errorText = await accessoryResponse.text();
      throw new Error(`JD Power accessory data failed: ${accessoryResponse.status} ${errorText}`);
    }

    const accessoryData = await accessoryResponse.json();
    const accessories = accessoryData.result || [];

    // Step 3: Calculate adjustments for selected accessories
    let totalTradeAdjustment = 0;
    let totalRetailAdjustment = 0;
    let totalLoanAdjustment = 0;

    console.log('Calculating adjustments for selected accessories:', selectedAccessoryCodes);

    selectedAccessoryCodes.forEach(code => {
      const accessory = accessories.find((acc: any) => acc.acccode === code);
      if (accessory) {
        // Only add adjustments if not already included in base value
        if (accessory.isincluded !== 1) {
          totalTradeAdjustment += parseInt(accessory.tradein || '0');
          totalRetailAdjustment += parseInt(accessory.retail || '0');
          totalLoanAdjustment += parseInt(accessory.loan || '0');
        }
        console.log(`Accessory ${code}: Trade +${accessory.tradein || 0}, Retail +${accessory.retail || 0}, Loan +${accessory.loan || 0}`);
      } else {
        console.warn(`Accessory ${code} not found in JD Power data`);
      }
    });

    // Step 4: Calculate final adjusted values
    const safeParseInt = (value: any): number => {
      const parsed = parseInt(value?.toString() || '0');
      return isNaN(parsed) ? 0 : parsed;
    };

    const baseCleanTradeIn = safeParseInt(baseResult.basecleantrade);
    const baseAverageTradeIn = safeParseInt(baseResult.baseaveragetrade);
    const baseRoughTradeIn = safeParseInt(baseResult.baseroughtrade);
    const baseCleanRetail = safeParseInt(baseResult.basecleanretail);
    const baseLoanValue = safeParseInt(baseResult.baseloan);
    const mileageAdjustment = safeParseInt(baseResult.mileageadjustment);

    const updatedValues = {
      baseCleanTradeIn,
      baseAverageTradeIn,
      baseRoughTradeIn,
      baseCleanRetail,
      baseLoanValue,
      adjustedCleanTradeIn: baseCleanTradeIn + mileageAdjustment + totalTradeAdjustment,
      adjustedAverageTradeIn: baseAverageTradeIn + mileageAdjustment + totalTradeAdjustment,
      adjustedRoughTradeIn: baseRoughTradeIn + mileageAdjustment + totalTradeAdjustment,
      adjustedCleanRetail: baseCleanRetail + totalRetailAdjustment,
      adjustedLoanValue: baseLoanValue + totalLoanAdjustment,
      accessoryAdjustments: {
        tradeIn: totalTradeAdjustment,
        retail: totalRetailAdjustment,
        loan: totalLoanAdjustment
      },
      mileageAdjustment
    };

    console.log('JD Power re-valuation complete:', {
      selectedAccessories: selectedAccessoryCodes.length,
      totalAdjustments: {
        trade: totalTradeAdjustment,
        retail: totalRetailAdjustment,
        loan: totalLoanAdjustment
      },
      finalValues: {
        cleanTradeIn: updatedValues.adjustedCleanTradeIn,
        cleanRetail: updatedValues.adjustedCleanRetail,
        loanValue: updatedValues.adjustedLoanValue
      }
    });

    return {
      success: true,
      updatedValues,
      requestId: baseData.requestId
    };

  } catch (error: any) {
    console.error('JD Power re-valuation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during re-valuation'
    };
  }
}

/**
 * Alternative approach using Weekly Auction Values endpoint that accepts accessorylist
 * This is more accurate as it lets JD Power handle the calculations
 */
export async function revaluateWithAccessoryList(
  options: JDPowerRevaluationOptions
): Promise<JDPowerRevaluationResult> {
  try {
    const {
      vin,
      ucgVehicleId,
      period,
      region,
      mileage,
      selectedAccessoryCodes,
      vehicletype = 'UsedCar'
    } = options;

    // Create accessory list parameter (comma-separated codes)
    const accessoryList = selectedAccessoryCodes.join(',');

    const params = new URLSearchParams({
      ucgvehicleid: ucgVehicleId,
      period: period,
      region: region.toString(),
      vehicletype: vehicletype
    });

    if (mileage) {
      params.append('mileage', mileage.toString());
    }

    if (accessoryList) {
      params.append('accessorylist', accessoryList);
    }

    const url = `${process.env.JD_POWER_BASE_URL || 'https://cloud.jdpower.ai/data-api/UAT/valuationservices'}/valuation/weeklyAuctionValuesByVehicleId?${params}`;
    
    console.log('JD Power weekly auction values request:', { url, accessoryList });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'api-key': process.env.JD_POWER_API_KEY!,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`JD Power weekly auction values failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const result = data.result?.[0];

    if (!result) {
      throw new Error('No weekly auction values returned from JD Power');
    }

    const safeParseInt = (value: any): number => {
      const parsed = parseInt(value?.toString() || '0');
      return isNaN(parsed) ? 0 : parsed;
    };

    // Weekly auction values include accessory adjustments automatically
    const updatedValues = {
      baseCleanTradeIn: safeParseInt(result.basecleantrade),
      baseAverageTradeIn: safeParseInt(result.baseaveragetrade),
      baseRoughTradeIn: safeParseInt(result.baseroughtrade),
      baseCleanRetail: safeParseInt(result.basecleanretail),
      baseLoanValue: safeParseInt(result.baseloan),
      adjustedCleanTradeIn: safeParseInt(result.adjustedweeklycleantrade),
      adjustedAverageTradeIn: safeParseInt(result.adjustedweeklyaveragetrade),
      adjustedRoughTradeIn: safeParseInt(result.adjustedweeklyroughtrade),
      adjustedCleanRetail: safeParseInt(result.adjustedweeklycleanretail),
      adjustedLoanValue: safeParseInt(result.adjustedweeklyloan),
      accessoryAdjustments: {
        tradeIn: safeParseInt(result.accessoryadjustment) || 0,
        retail: safeParseInt(result.accessoryadjustment) || 0,
        loan: safeParseInt(result.accessoryadjustment) || 0
      },
      mileageAdjustment: safeParseInt(result.mileageadjustment)
    };

    console.log('JD Power weekly auction re-valuation complete:', updatedValues);

    return {
      success: true,
      updatedValues,
      requestId: data.requestId
    };

  } catch (error: any) {
    console.error('JD Power weekly auction re-valuation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during weekly auction re-valuation'
    };
  }
}