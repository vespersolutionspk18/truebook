import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireOrganization } from '@/lib/auth';
import { fetchJDPowerValuation } from '@/lib/jdpower';

export const GET = requireOrganization(async (request: NextRequest, context, { params }: { params: Promise<{ uuid: string }> }) => {
  try {
    const { uuid } = await params;

    // Get vehicle
    const vehicle = await db.vehicle.findUnique({
      where: {
        uuid: uuid,
        organizationId: context.organization.id
      },
      select: {
        uuid: true,
        vin: true,
        mileage: true
      }
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Get base valuation
    const valuationData = await fetchJDPowerValuation(vehicle.vin, {
      period: '0',
      region: 1,
      mileage: vehicle.mileage || undefined,
      vehicletype: 'UsedCar'
    });

    // Get accessories if we have ucgVehicleId
    let accessoriesData = null;
    if (valuationData?.result?.[0]?.ucgvehicleid) {
      const ucgVehicleId = valuationData.result[0].ucgvehicleid;
      
      const params = new URLSearchParams({
        vin: vehicle.vin,
        ucgvehicleid: ucgVehicleId,
        period: '0',
        region: '1',
        vehicletype: 'UsedCar'
      });

      const url = `${process.env.JD_POWER_BASE_URL || 'https://cloud.jdpower.ai/data-api/UAT/valuationservices'}/valuation/accessoryDataByVinAndVehicleId?${params}`;
      
      const accessoriesResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'api-key': process.env.JD_POWER_API_KEY!,
          'Accept': 'application/json'
        }
      });

      if (accessoriesResponse.ok) {
        accessoriesData = await accessoriesResponse.json();
      }
    }

    // Return the raw responses to see what we're getting
    return NextResponse.json({
      valuation_response: valuationData,
      accessories_response: accessoriesData,
      first_vehicle: valuationData?.result?.[0] || null,
      accessories_list: accessoriesData?.result || []
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Failed to fetch JD Power data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});