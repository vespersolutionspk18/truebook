import { NextRequest, NextResponse } from 'next/server';
import { requireOrganization } from '@/lib/auth';
import { db } from '@/lib/db';
import { fetchJDPowerValuation } from '@/lib/jdpower';

export const POST = requireOrganization(
  async (req: NextRequest, context, { params }: { params: Promise<{ uuid: string }> }) => {
    try {
      const { uuid } = await params;
      console.log('POST /api/vehicles/[uuid]/bookout/jdpower - UUID:', uuid);

      if (!uuid) {
        return NextResponse.json({ error: 'UUID is required' }, { status: 400 });
      }

    // Get vehicle with mileage
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

    const body = await req.json();
    const region = body.region || 1; // Default to Eastern region if not provided

    console.log('Fetching JD Power valuation for:', {
      vin: vehicle.vin,
      mileage: vehicle.mileage,
      region
    });

    // Step 1: Get base valuation
    const valuationData = await fetchJDPowerValuation(vehicle.vin, {
      period: '0', // Current date
      region: region,
      mileage: vehicle.mileage || undefined,
      vehicletype: 'UsedCar'
    });

    console.log('Valuation response:', JSON.stringify(valuationData, null, 2));

    if (!valuationData || !valuationData.result || valuationData.result.length === 0) {
      return NextResponse.json({ 
        error: 'No valuation data available for this vehicle' 
      }, { status: 404 });
    }

    const vehicleResult = valuationData.result[0];
    console.log('Vehicle result data:', JSON.stringify(vehicleResult, null, 2));
    const ucgVehicleId = vehicleResult.ucgvehicleid;

    // Step 2: Get accessories data
    let accessoriesData = null;
    if (ucgVehicleId) {
      try {
        const params = new URLSearchParams({
          vin: vehicle.vin,
          ucgvehicleid: ucgVehicleId,
          period: '0',
          region: region.toString(),
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
          console.log('Accessories data:', JSON.stringify(accessoriesData, null, 2));
          console.log('Accessories result array:', accessoriesData?.result);
          console.log('First accessory:', accessoriesData?.result?.[0]);
        } else {
          console.error('Accessories response not OK:', accessoriesResponse.status, accessoriesResponse.statusText);
          const errorText = await accessoriesResponse.text();
          console.error('Accessories error response:', errorText);
        }
      } catch (error) {
        console.error('Error fetching accessories:', error);
        // Continue without accessories data
      }
    }

    // Helper function to safely parse integers
    const safeParseInt = (value: any): number | null => {
      if (value === null || value === undefined || value === '' || value === 'N/A') return null;
      const parsed = parseInt(value.toString());
      return isNaN(parsed) ? null : parsed;
    };

    // Helper function to handle N/A values
    const handleNA = (value: any): string | null => {
      if (value === null || value === undefined || value === '' || value === 'N/A') return null;
      return value.toString();
    };

    // Delete all previous JD Power bookouts for this vehicle
    await db.bookout.deleteMany({
      where: {
        vehicleId: vehicle.uuid,
        provider: 'jdpower'
      }
    });
    console.log('Deleted all previous JD Power bookouts for vehicle:', vehicle.uuid);

    // Save bookout to database - SAVE EVERY FUCKING PIECE OF DATA
    try {
      // Prepare the data
      const bookoutData = {
        vehicleId: vehicle.uuid,
        provider: 'jdpower',
        mileage: vehicle.mileage,
        region: region,
        
        // Vehicle details - ALL OF THEM
        year: safeParseInt(vehicleResult.modelyear),
        make: handleNA(vehicleResult.make),
        model: handleNA(vehicleResult.model),
        trim: handleNA(vehicleResult.trim),
        trim2: handleNA(vehicleResult.trim2),
        bodyStyle: handleNA(vehicleResult.body),
        bodyType: handleNA(vehicleResult.bodytype),
        doors: safeParseInt(vehicleResult.doors),
        drivetrain: handleNA(vehicleResult.drivetype),
        engine: vehicleResult.liters && vehicleResult.cylinders 
          ? `${vehicleResult.liters}L ${vehicleResult.engineconfiguration || ''}${vehicleResult.engineconfiguration ? ' ' : ''}${vehicleResult.cylinders ? `${vehicleResult.cylinders}-cyl` : ''}`.trim()
          : null,
        transmission: handleNA(vehicleResult.transmission),
        fuelType: handleNA(vehicleResult.fueltype),
        vehicleType: handleNA(vehicleResult.vehicletype),
        ucgVehicleId: handleNA(vehicleResult.ucgvehicleid),
        ucgSubsegment: handleNA(vehicleResult.ucgsubsegment),
        modelNumber: handleNA(vehicleResult.modelnumber),
        
        // Physical specs
        liters: handleNA(vehicleResult.liters),
        cylinders: safeParseInt(vehicleResult.cylinders),
        curbWeight: safeParseInt(vehicleResult.curbweight),
        
        // Base values - ALL OF THEM
        baseMsrp: safeParseInt(vehicleResult.basemsrp),
        baseCleanTradeIn: safeParseInt(vehicleResult.basecleantrade),
        baseAverageTradeIn: safeParseInt(vehicleResult.baseaveragetrade),
        baseRoughTradeIn: safeParseInt(vehicleResult.baseroughtrade),
        baseCleanRetail: safeParseInt(vehicleResult.basecleanretail),
        baseLoanValue: safeParseInt(vehicleResult.baseloan),
        
        // Adjusted values - ALL OF THEM
        cleanTradeIn: safeParseInt(vehicleResult.adjustedcleantrade),
        averageTradeIn: safeParseInt(vehicleResult.adjustedaveragetrade),
        roughTradeIn: safeParseInt(vehicleResult.adjustedroughtrade),
        cleanRetail: safeParseInt(vehicleResult.adjustedcleanretail),
        loanValue: safeParseInt(vehicleResult.adjustedloan),
        
        // Mileage data - ALL OF IT
        mileageAdjustment: safeParseInt(vehicleResult.mileageadjustment),
        averageMileage: safeParseInt(vehicleResult.averagemileage),
        maxMileageAdj: safeParseInt(vehicleResult.maxmileageadj),
        minMileageAdj: safeParseInt(vehicleResult.minmileageadj),
        mileageClass: handleNA(vehicleResult.mileageclass),
        
        // VIN options adjustments
        vinOptionsTradeIn: safeParseInt(vehicleResult.vinoptionstrade),
        vinOptionsRetail: safeParseInt(vehicleResult.vinoptionsretail),
        vinOptionsLoan: safeParseInt(vehicleResult.vinoptionsloan),
        
        // Minimum adjustments - ALL OF THEM
        minAdjRetail: safeParseInt(vehicleResult.minadjretail),
        minAdjCleanTrade: safeParseInt(vehicleResult.minadjcleantrade),
        minAdjAverageTrade: safeParseInt(vehicleResult.minadjaveragetrade),
        minAdjRoughTrade: safeParseInt(vehicleResult.minadjroughtrade),
        minAdjLoan: safeParseInt(vehicleResult.minadjloan),
        minAdjRetailForLoan: safeParseInt(vehicleResult.minadjretailforloan),
        
        // JD Power specific IDs
        vid: handleNA(vehicleResult.vid),
        rollupVehicleId: handleNA(vehicleResult.rollupvehicleid),
        requestId: handleNA(valuationData.requestId),
        authId: handleNA(valuationData.authId),
        
        // Store ABSOLUTELY EVERYTHING in raw data
        rawData: {
          valuation: valuationData,
          accessories: accessoriesData,
          vehicleResult: vehicleResult
        }
      };

      console.log('Creating bookout with data:', JSON.stringify(bookoutData, null, 2));

      let bookout;
      try {
        // Create bookout with accessories in a transaction
        bookout = await db.$transaction(async (tx) => {
          // First create the bookout
          const newBookout = await tx.bookout.create({
            data: bookoutData
          });

          // Then create accessories if we have them
          if (accessoriesData?.result && Array.isArray(accessoriesData.result)) {
            console.log(`Creating ${accessoriesData.result.length} accessories for bookout ${newBookout.id}`);
            
            const accessoryPromises = accessoriesData.result.map((accessory: any, index: number) => {
              console.log(`Processing accessory ${index}:`, accessory);
              
              // Log all available fields to understand the structure
              console.log(`Accessory ${index} fields:`, Object.keys(accessory));
              
              const accessoryData = {
                bookoutId: newBookout.id,
                // JD Power uses 'acccode' for the code
                code: accessory.acccode || accessory.code || `UNK${index}`,
                // JD Power uses 'accdesc' for the description
                name: accessory.accdesc || accessory.description || 'Unknown Accessory',
                // Type and category
                type: handleNA(accessory.type || accessory.accessorytype),
                category: handleNA(accessory.accessorycategory || accessory.category),
                // Price/MSRP - JD Power doesn't seem to provide MSRP in this endpoint
                msrp: safeParseInt(accessory.msrp || accessory.price),
                // Value adjustments - JD Power uses 'tradein', 'retail', 'loan'
                // If isincluded = 1, the accessory value is already in base values, so adjustments are 0
                cleanTradeAdj: accessory.isincluded === 1 ? 0 : safeParseInt(accessory.tradein),
                averageTradeAdj: accessory.isincluded === 1 ? 0 : safeParseInt(accessory.tradein),
                roughTradeAdj: accessory.isincluded === 1 ? 0 : safeParseInt(accessory.tradein),
                cleanRetailAdj: accessory.isincluded === 1 ? 0 : safeParseInt(accessory.retail),
                loanAdj: accessory.isincluded === 1 ? 0 : safeParseInt(accessory.loan),
                // Option logic
                includesCode: handleNA(accessory.includes),
                excludesCode: handleNA(accessory.excludes),
                // Installation status - 'isadded' indicates if it's factory installed
                // 'isincluded' means it's already included in the base value
                isFactoryInstalled: accessory.isadded === 1 || accessory.isadded === '1' || accessory.isadded === true || accessory.isincluded === 1,
                // Selection state - NEW FIELDS
                // Initially select accessories that are factory installed or included in base value
                isSelected: accessory.isadded === 1 || accessory.isadded === '1' || accessory.isadded === true || accessory.isincluded === 1,
                // All accessories are initially available
                isAvailable: true
              };
              
              console.log(`Creating accessory with data:`, accessoryData);
              
              return tx.bookoutAccessory.create({
                data: accessoryData
              });
            });

            const createdAccessories = await Promise.all(accessoryPromises);
            console.log(`Created ${createdAccessories.length} accessories`);
            
            // Calculate total equipment value impact from the stored accessories
            const storedAccessories = await tx.bookoutAccessory.findMany({
              where: { bookoutId: newBookout.id }
            });
            
            let totalTradeIn = 0;
            let totalRetail = 0; 
            let totalLoan = 0;
            
            storedAccessories.forEach((accessory) => {
              totalTradeIn += accessory.cleanTradeAdj || 0;
              totalRetail += accessory.cleanRetailAdj || 0;
              totalLoan += accessory.loanAdj || 0;
            });
            
            console.log('Calculated equipment totals from stored accessories:', { 
              totalTradeIn, 
              totalRetail, 
              totalLoan,
              accessoryCount: storedAccessories.length 
            });
            
            // Update the bookout with calculated equipment values
            await tx.bookout.update({
              where: { id: newBookout.id },
              data: {
                vinOptionsTradeIn: totalTradeIn,
                vinOptionsRetail: totalRetail,
                vinOptionsLoan: totalLoan
              }
            });
          } else {
            console.log('No accessories to create:', {
              hasAccessoriesData: !!accessoriesData,
              hasResult: !!accessoriesData?.result,
              isArray: Array.isArray(accessoriesData?.result),
              resultLength: accessoriesData?.result?.length
            });
          }

          // Return the bookout with accessories
          return await tx.bookout.findUnique({
            where: { id: newBookout.id },
            include: { accessories: true }
          });
        });
      } catch (prismaError: any) {
        console.error('Prisma error details:', {
          message: prismaError.message,
          code: prismaError.code,
          meta: prismaError.meta
        });
        
        // Log each field to identify which one is causing the issue
        console.error('Data being saved:');
        Object.entries(bookoutData).forEach(([key, value]) => {
          console.error(`  ${key}: ${JSON.stringify(value)} (type: ${typeof value})`);
        });
        
        throw prismaError;
      }

      // Format the response with the saved bookout data - FULL FUCKING BOOKOUT
      const responseData = {
        id: bookout.id,
        provider: bookout.provider,
        region: bookout.region,
        vehicle: {
          vin: vehicle.vin,
          mileage: bookout.mileage || 0,
          year: bookout.year || 0,
          make: bookout.make || '',
          model: bookout.model || '',
          trim: bookout.trim || '',
          trim2: bookout.trim2 || '',
          bodyStyle: bookout.bodyStyle || '',
          bodyType: bookout.bodyType || '',
          doors: bookout.doors || 0,
          drivetrain: bookout.drivetrain || '',
          engine: bookout.engine || '',
          transmission: bookout.transmission || '',
          fuelType: bookout.fuelType || '',
          vehicleType: bookout.vehicleType || '',
          ucgVehicleId: bookout.ucgVehicleId || '',
          ucgSubsegment: bookout.ucgSubsegment || '',
          modelNumber: bookout.modelNumber || '',
          liters: bookout.liters || '',
          cylinders: bookout.cylinders || 0,
          curbWeight: bookout.curbWeight || 0
        },
        values: {
          // Base values
          baseMsrp: bookout.baseMsrp || 0,
          baseCleanTradeIn: bookout.baseCleanTradeIn || 0,
          baseAverageTradeIn: bookout.baseAverageTradeIn || 0,
          baseRoughTradeIn: bookout.baseRoughTradeIn || 0,
          baseCleanRetail: bookout.baseCleanRetail || 0,
          baseLoanValue: bookout.baseLoanValue || 0,
          
          // Adjusted values (with mileage + options)
          cleanTradeIn: bookout.cleanTradeIn || 0,
          averageTradeIn: bookout.averageTradeIn || 0,
          roughTradeIn: bookout.roughTradeIn || 0,
          cleanRetail: bookout.cleanRetail || 0,
          loanValue: bookout.loanValue || 0,
          
          // Mileage adjustments
          mileageAdjustment: bookout.mileageAdjustment || 0,
          averageMileage: bookout.averageMileage || 0,
          maxMileageAdj: bookout.maxMileageAdj || 0,
          minMileageAdj: bookout.minMileageAdj || 0,
          mileageClass: bookout.mileageClass || '',
          
          // VIN options adjustments
          vinOptionsTradeIn: bookout.vinOptionsTradeIn || 0,
          vinOptionsRetail: bookout.vinOptionsRetail || 0,
          vinOptionsLoan: bookout.vinOptionsLoan || 0,
          
          // Minimum adjustments
          minAdjRetail: bookout.minAdjRetail || 0,
          minAdjCleanTrade: bookout.minAdjCleanTrade || 0,
          minAdjAverageTrade: bookout.minAdjAverageTrade || 0,
          minAdjRoughTrade: bookout.minAdjRoughTrade || 0,
          minAdjLoan: bookout.minAdjLoan || 0,
          minAdjRetailForLoan: bookout.minAdjRetailForLoan || 0
        },
        accessories: bookout.accessories || [],
        jdpowerIds: {
          vid: bookout.vid || '',
          rollupVehicleId: bookout.rollupVehicleId || '',
          requestId: bookout.requestId || '',
          authId: bookout.authId || ''
        },
        rawData: bookout.rawData,
        createdAt: bookout.createdAt.toISOString()
      };

      return NextResponse.json(responseData);
    } catch (dbError: any) {
      console.log('Database save error:', dbError?.message || 'Unknown database error');
      throw new Error(`Failed to save bookout to database: ${dbError?.message || 'Unknown error'}`);
    }
  } catch (error: any) {
    console.log('Error creating JD Power bookout:', error?.message || 'Unknown error');
    
    if (error instanceof Error) {
      
      // Check for specific error types
      if (error.message.includes('JD Power API key not configured')) {
        return NextResponse.json({ 
          error: 'JD Power API key not configured',
          details: 'Please ensure JD_POWER_API_KEY is set in your environment variables'
        }, { status: 500 });
      }
      
      if (error.message.includes('No valuation data available')) {
        return NextResponse.json({ 
          error: 'No valuation data available for this vehicle',
          details: 'JD Power may not have data for this VIN'
        }, { status: 404 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to create bookout',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});