import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
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

    // Get the vehicle and its VIN - ensure it belongs to user's organization
    const vehicle = await db.vehicle.findFirst({
      where: { 
        uuid: vehicleId,
        organization: {
          users: {
            some: {
              userId: session.user.id
            }
          }
        }
      },
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
    
    console.log('Calling MarketCheck API:', marketCheckUrl.replace(apiKey, 'REDACTED'));
    
    const marketCheckResponse = await fetch(marketCheckUrl);
    
    console.log('MarketCheck response status:', marketCheckResponse.status);
    
    if (!marketCheckResponse.ok) {
      const errorText = await marketCheckResponse.text();
      return NextResponse.json({ 
        error: 'MarketCheck API error', 
        details: errorText 
      }, { status: marketCheckResponse.status });
    }

    const marketCheckData = await marketCheckResponse.json();
    
    // Check if marketCheckData is valid
    if (!marketCheckData || typeof marketCheckData !== 'object') {
      console.error('Invalid MarketCheck response:', marketCheckData);
      return NextResponse.json({ 
        error: 'Invalid response from MarketCheck API',
        details: 'Response was null or not an object'
      }, { status: 500 });
    }
    
    console.log('MarketCheck data received:', {
      hasData: !!marketCheckData,
      vin: marketCheckData.vin,
      hasInteriorColor: !!marketCheckData.interior_color,
      hasExteriorColor: !!marketCheckData.exterior_color,
      hasRating: !!marketCheckData.rating,
      hasWarranty: !!marketCheckData.warranty,
      hasInstalledOptionsDetails: !!marketCheckData.installed_options_details,
      hasFeatures: !!marketCheckData.features,
      hasHighValueFeatures: !!marketCheckData.high_value_features,
      hasInstalledEquipment: !!marketCheckData.installed_equipment
    });
    
    // Log sample data to debug
    if (marketCheckData.features) {
      const firstFeatureKey = Object.keys(marketCheckData.features)[0];
      if (firstFeatureKey) {
        console.log('Sample feature:', {
          optionCode: firstFeatureKey,
          features: marketCheckData.features[firstFeatureKey]
        });
      }
    }
    
    if (marketCheckData.installed_equipment) {
      const firstEquipKey = Object.keys(marketCheckData.installed_equipment)[0];
      if (firstEquipKey) {
        console.log('Sample equipment:', {
          optionCode: firstEquipKey,
          equipment: marketCheckData.installed_equipment[firstEquipKey]
        });
      }
    }

    // Create NeoVin record with all the data
    let neoVin;
    try {
      neoVin = await db.neoVin.create({
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
        interiorColor: marketCheckData.interior_color && typeof marketCheckData.interior_color === 'object' ? {
          create: {
            code: marketCheckData.interior_color.code || null,
            name: marketCheckData.interior_color.name || null,
            confidence: marketCheckData.interior_color.confidence || null,
            base: marketCheckData.interior_color.base || null,
          }
        } : undefined,
        
        exteriorColor: marketCheckData.exterior_color && typeof marketCheckData.exterior_color === 'object' ? {
          create: {
            code: marketCheckData.exterior_color.code || null,
            name: marketCheckData.exterior_color.name || null,
            msrp: marketCheckData.exterior_color.msrp || null,
            confidence: marketCheckData.exterior_color.confidence || null,
            base: marketCheckData.exterior_color.base || null,
          }
        } : undefined,
        
        rating: marketCheckData.rating && typeof marketCheckData.rating === 'object' ? {
          create: {
            safetyFront: marketCheckData.rating.safety?.front || null,
            safetySide: marketCheckData.rating.safety?.side || null,
            safetyOverall: marketCheckData.rating.safety?.overall || null,
            rollover: marketCheckData.rating.rollover || null,
            roofStrength: marketCheckData.rating.roof_strength || null,
          }
        } : undefined,
        
        warranty: marketCheckData.warranty && typeof marketCheckData.warranty === 'object' ? {
          create: {
            totalDuration: marketCheckData.warranty.total?.duration || null,
            totalDistance: marketCheckData.warranty.total?.distance || null,
            powertrainDuration: marketCheckData.warranty.powertrain?.duration || null,
            powertrainDistance: marketCheckData.warranty.powertrain?.distance || null,
            antiCorrosionDuration: marketCheckData.warranty.anti_corrosion?.duration || null,
            antiCorrosionDistance: marketCheckData.warranty.anti_corrosion?.distance || null,
            roadsideAssistanceDuration: marketCheckData.warranty.roadside_assistance?.duration || null,
            roadsideAssistanceDistance: marketCheckData.warranty.roadside_assistance?.distance || null,
          }
        } : undefined,
        
        installedOptionsDetails: marketCheckData.installed_options_details && Array.isArray(marketCheckData.installed_options_details) ? {
          create: marketCheckData.installed_options_details.map((option: { 
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
          }))
        } : undefined,
        
        features: marketCheckData.features && Object.keys(marketCheckData.features).length > 0 ? {
          create: Object.entries(marketCheckData.features).flatMap(([optionCode, features]: [string, Array<{ 
            category: string; 
            feature_type: string; 
            description: string 
          }>]) =>
            Array.isArray(features) ? features
              .filter(feature => feature && feature.category && feature.feature_type && feature.description)
              .map((feature) => ({
                optionCode,
                category: feature.category,
                featureType: feature.feature_type,
                description: feature.description,
              })) : []
          )
        } : undefined,
        
        highValueFeatures: marketCheckData.high_value_features && Object.keys(marketCheckData.high_value_features).length > 0 ? {
          create: Object.entries(marketCheckData.high_value_features).flatMap(([optionCode, features]: [string, Array<{ 
            category: string; 
            description: string 
          }>]) =>
            Array.isArray(features) ? features
              .filter(feature => feature && feature.category && feature.description)
              .map((feature) => ({
                optionCode,
                category: feature.category,
                description: feature.description,
              })) : []
          )
        } : undefined,
        
        installedEquipment: marketCheckData.installed_equipment && Object.keys(marketCheckData.installed_equipment).length > 0 ? {
          create: Object.entries(marketCheckData.installed_equipment).flatMap(([optionCode, equipment]: [string, Array<{ 
            category: string; 
            item: string; 
            attribute: string; 
            location?: string; 
            value: string 
          }>]) =>
            Array.isArray(equipment) ? equipment
              .filter(item => item && item.category && item.item && item.attribute && item.value)
              .map((item) => ({
                optionCode,
                category: item.category,
                item: item.item,
                attribute: item.attribute,
                location: item.location || null,
                value: item.value,
              })) : []
          )
        } : undefined,
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
    } catch (dbError) {
      console.log('Database error creating NeoVin');
      if (dbError instanceof Error) {
        console.log('Error name:', dbError.name);
        console.log('Error message:', dbError.message);
        console.log('Error stack:', dbError.stack);
      } else {
        console.log('Unknown error type:', typeof dbError);
        console.log('Error stringified:', JSON.stringify(dbError, null, 2));
      }
      
      // Log the data that was being inserted
      console.log('Failed data:', {
        vehicleId: vehicle.uuid,
        vin: marketCheckData.vin,
        hasInteriorColor: !!marketCheckData.interior_color,
        interiorColorData: marketCheckData.interior_color,
        hasExteriorColor: !!marketCheckData.exterior_color,
        exteriorColorData: marketCheckData.exterior_color,
        hasRating: !!marketCheckData.rating,
        ratingData: marketCheckData.rating,
        hasWarranty: !!marketCheckData.warranty,
        warrantyData: marketCheckData.warranty
      });
      
      throw dbError;
    }

    return NextResponse.json({ neoVin });
  } catch (error) {
    console.log('Error in NeoVin decode');
    if (error instanceof Error) {
      console.log('Error message:', error.message);
      return NextResponse.json({ 
        error: 'Internal server error', 
        details: error.message
      }, { status: 500 });
    }
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: 'Unknown error' 
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

    // Find NeoVin data for vehicle that belongs to user's organization
    const neoVin = await db.neoVin.findFirst({
      where: { 
        vehicleId,
        vehicle: {
          organization: {
            users: {
              some: {
                userId: session.user.id
              }
            }
          }
        }
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

    if (!neoVin) {
      return NextResponse.json({ error: 'NeoVin data not found' }, { status: 404 });
    }

    return NextResponse.json({ neoVin });
  } catch (error) {
    console.log('Error fetching NeoVin');
    if (error instanceof Error) {
      console.log('Error message:', error.message);
      return NextResponse.json({ 
        error: 'Internal server error', 
        details: error.message
      }, { status: 500 });
    }
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: 'Unknown error' 
    }, { status: 500 });
  }
}