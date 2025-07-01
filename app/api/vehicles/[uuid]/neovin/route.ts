import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uuid: vehicleId } = await params;

    // Get the vehicle and its VIN
    const vehicle = await db.vehicle.findUnique({
      where: { uuid: vehicleId },
      include: { neoVin: true }
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Check if NeoVin data already exists
    if (vehicle.neoVin) {
      return NextResponse.json({ 
        message: 'NeoVin data already exists', 
        neoVin: vehicle.neoVin 
      });
    }

    // Call MarketCheck API
    const apiKey = process.env.MARKETCHECK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'MarketCheck API key not configured' }, { status: 500 });
    }

    const marketCheckUrl = `https://api.marketcheck.com/v2/decode/car/neovin/${vehicle.vin}/specs?api_key=${apiKey}`;
    
    const marketCheckResponse = await fetch(marketCheckUrl);
    
    if (!marketCheckResponse.ok) {
      const errorText = await marketCheckResponse.text();
      return NextResponse.json({ 
        error: 'MarketCheck API error', 
        details: errorText 
      }, { status: marketCheckResponse.status });
    }

    const marketCheckData = await marketCheckResponse.json();

    // Create NeoVin record with all the data
    const neoVin = await db.neoVin.create({
      data: {
        vehicleId: vehicle.uuid,
        vin: marketCheckData.vin,
        squishVin: marketCheckData.squish_vin,
        year: marketCheckData.year,
        make: marketCheckData.make,
        model: marketCheckData.model,
        vehicleType: marketCheckData.vehicle_type,
        listingConfidence: marketCheckData.listing_confidence,
        trim: marketCheckData.trim,
        trimConfidence: marketCheckData.trim_confidence,
        version: marketCheckData.version,
        versionConfidence: marketCheckData.version_confidence,
        transmission: marketCheckData.transmission,
        transmissionConfidence: marketCheckData.transmission_confidence,
        transmissionDescription: marketCheckData.transmission_description,
        drivetrain: marketCheckData.drivetrain,
        powertrainType: marketCheckData.powertrain_type,
        engine: marketCheckData.engine,
        fuelType: marketCheckData.fuel_type,
        doors: marketCheckData.doors,
        bodyType: marketCheckData.body_type,
        bodySubtype: marketCheckData.body_subtype,
        weight: marketCheckData.weight,
        width: marketCheckData.width,
        height: marketCheckData.height,
        length: marketCheckData.length,
        cityMpg: marketCheckData.city_mpg,
        highwayMpg: marketCheckData.highway_mpg,
        combinedMpg: marketCheckData.combined_mpg,
        manufacturerCode: marketCheckData.manufacturer_code,
        packageCode: marketCheckData.package_code,
        msrp: marketCheckData.msrp,
        deliveryCharges: marketCheckData.delivery_charges,
        installedOptionsMsrp: marketCheckData.installed_options_msrp,
        combinedMsrp: marketCheckData.combined_msrp,
        country: marketCheckData.country,
        seatingCapacity: marketCheckData.seating_capacity,
        optionsPackages: marketCheckData.options_packages,
        
        // Create related records
        interiorColor: marketCheckData.interior_color ? {
          create: {
            code: marketCheckData.interior_color.code,
            name: marketCheckData.interior_color.name,
            confidence: marketCheckData.interior_color.confidence,
            base: marketCheckData.interior_color.base,
          }
        } : undefined,
        
        exteriorColor: marketCheckData.exterior_color ? {
          create: {
            code: marketCheckData.exterior_color.code,
            name: marketCheckData.exterior_color.name,
            msrp: marketCheckData.exterior_color.msrp,
            confidence: marketCheckData.exterior_color.confidence,
            base: marketCheckData.exterior_color.base,
          }
        } : undefined,
        
        rating: marketCheckData.rating ? {
          create: {
            safetyFront: marketCheckData.rating.safety?.front,
            safetySide: marketCheckData.rating.safety?.side,
            safetyOverall: marketCheckData.rating.safety?.overall,
            rollover: marketCheckData.rating.rollover,
            roofStrength: marketCheckData.rating.roof_strength,
          }
        } : undefined,
        
        warranty: marketCheckData.warranty ? {
          create: {
            totalDuration: marketCheckData.warranty.total?.duration,
            totalDistance: marketCheckData.warranty.total?.distance,
            powertrainDuration: marketCheckData.warranty.powertrain?.duration,
            powertrainDistance: marketCheckData.warranty.powertrain?.distance,
            antiCorrosionDuration: marketCheckData.warranty.anti_corrosion?.duration,
            antiCorrosionDistance: marketCheckData.warranty.anti_corrosion?.distance,
            roadsideAssistanceDuration: marketCheckData.warranty.roadside_assistance?.duration,
            roadsideAssistanceDistance: marketCheckData.warranty.roadside_assistance?.distance,
          }
        } : undefined,
        
        installedOptionsDetails: {
          create: marketCheckData.installed_options_details?.map((option: { 
            code: string; 
            name: string; 
            msrp?: string; 
            type?: string; 
            confidence?: string; 
            verified?: boolean; 
            rule?: string; 
            sale_price?: string 
          }) => ({
            code: option.code,
            name: option.name,
            msrp: option.msrp,
            type: option.type,
            confidence: option.confidence,
            verified: option.verified,
            rule: option.rule,
            salePrice: option.sale_price,
          })) || []
        },
        
        features: {
          create: Object.entries(marketCheckData.features || {}).flatMap(([optionCode, features]: [string, Array<{ 
            category: string; 
            feature_type: string; 
            description: string 
          }>]) =>
            features.map((feature) => ({
              optionCode,
              category: feature.category,
              featureType: feature.feature_type,
              description: feature.description,
            }))
          )
        },
        
        highValueFeatures: {
          create: Object.entries(marketCheckData.high_value_features || {}).flatMap(([optionCode, features]: [string, Array<{ 
            category: string; 
            description: string 
          }>]) =>
            features.map((feature) => ({
              optionCode,
              category: feature.category,
              description: feature.description,
            }))
          )
        },
        
        installedEquipment: {
          create: Object.entries(marketCheckData.installed_equipment || {}).flatMap(([optionCode, equipment]: [string, Array<{ 
            category: string; 
            item: string; 
            attribute: string; 
            location?: string; 
            value: string 
          }>]) =>
            equipment.map((item) => ({
              optionCode,
              category: item.category,
              item: item.item,
              attribute: item.attribute,
              location: item.location || null,
              value: item.value,
            }))
          )
        },
      },
      include: {
        interiorColor: true,
        exteriorColor: true,
        rating: true,
        warranty: true,
        installedOptionsDetails: true,
        features: true,
        highValueFeatures: true,
        installedEquipment: true,
      }
    });

    return NextResponse.json({ neoVin });
  } catch (error) {
    console.error('Error in NeoVin decode:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uuid: vehicleId } = await params;

    const neoVin = await db.neoVin.findUnique({
      where: { vehicleId },
      include: {
        interiorColor: true,
        exteriorColor: true,
        rating: true,
        warranty: true,
        installedOptionsDetails: true,
        features: true,
        highValueFeatures: true,
        installedEquipment: true,
      }
    });

    if (!neoVin) {
      return NextResponse.json({ error: 'NeoVin data not found' }, { status: 404 });
    }

    return NextResponse.json({ neoVin });
  } catch (error) {
    console.error('Error fetching NeoVin:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}