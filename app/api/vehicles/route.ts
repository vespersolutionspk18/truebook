import { NextResponse, NextRequest } from 'next/server';
import { requireOrganization } from '@/lib/auth';
import { db } from '@/lib/db';
// import { logger, logError } from '@/lib/logger';

export const GET = requireOrganization(async (req, context) => {
  try {
    // Get organization's vehicles
    const vehicles = await db.vehicle.findMany({
      where: {
        organizationId: context.organization.id
      },
      include: {
        vehiclePairs: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Track usage
    await db.usageRecord.create({
      data: {
        organizationId: context.organization.id,
        feature: 'vehicle_list',
        metadata: { count: vehicles.length }
      }
    });

    return NextResponse.json(vehicles);
  } catch (error) {
    console.log('GET /api/vehicles error occurred');
    if (error instanceof Error) {
      console.log('Error message:', error.message);
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
});

export const POST = requireOrganization(async (req, context) => {
  try {
    const body = await req.json();
    console.log('POST /api/vehicles - Request body:', JSON.stringify(body, null, 2));
    const { vin, vehiclePairs, mileage } = body;

    if (!vin || !vehiclePairs || !Array.isArray(vehiclePairs)) {
      console.error('Invalid request data:', { vin: !!vin, vehiclePairs: !!vehiclePairs, isArray: Array.isArray(vehiclePairs) });
      return NextResponse.json(
        { message: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Remove limits for now - fuck the limits
    // const vehicleCount = await db.vehicle.count({
    //   where: { organizationId: context.organization.id }
    // });

    // const limits = {
    //   FREE: 5,
    //   BRONZE: 20,
    //   SILVER: 100,
    //   GOLD: 500,
    //   ENTERPRISE: -1 // unlimited
    // };

    // const limit = limits[context.organization.plan as keyof typeof limits];
    // if (limit !== -1 && vehicleCount >= limit) {
    //   return NextResponse.json(
    //     { message: `Vehicle limit reached for ${context.organization.plan} plan` },
    //     { status: 403 }
    //   );
    // }

    // Validate and sanitize vehiclePairs data
    const sanitizedPairs = vehiclePairs
      .filter(pair => 
        pair && 
        typeof pair.property === 'string' && 
        (typeof pair.value === 'string' || typeof pair.value === 'number') && 
        pair.property.trim() !== ''
      )
      .map(pair => ({
        property: pair.property.trim(),
        value: pair.value ? pair.value.toString().trim() : ''
      }));

    if (sanitizedPairs.length === 0) {
      return NextResponse.json(
        { message: 'No valid vehicle data provided' },
        { status: 400 }
      );
    }

    // Create vehicle with pairs in a transaction
    const vehicle = await db.$transaction(async (tx) => {
      // Check if VIN already exists in this organization
      console.log('Checking for existing vehicle...');
      const existingVehicle = await tx.vehicle.findUnique({
        where: {
          organizationId_vin: {
            organizationId: context.organization.id,
            vin
          }
        }
      });
    
      if (existingVehicle) {
        throw new Error('Vehicle with this VIN already exists in your organization');
      }
      
      // Check if VIN exists in Monroney or NeoVin tables for vehicles in this organization
      console.log('Checking for existing Monroney in organization...');
      const existingMonroney = await tx.monroney.findFirst({
        where: { 
          vin,
          vehicle: {
            organizationId: context.organization.id
          }
        }
      });
      
      if (existingMonroney) {
        console.log('Found existing Monroney with VIN in organization:', vin);
        throw new Error('A vehicle with this VIN already has Monroney data in your organization');
      }
      
      console.log('Checking for existing NeoVin in organization...');
      const existingNeoVin = await tx.neoVin.findFirst({
        where: { 
          vin,
          vehicle: {
            organizationId: context.organization.id
          }
        }
      });
      
      if (existingNeoVin) {
        console.log('Found existing NeoVin with VIN in organization:', vin);
        throw new Error('A vehicle with this VIN already has NeoVin data in your organization');
      }
    
      // Create vehicle first without pairs
      console.log('Creating vehicle with data:', {
        vin,
        mileage: mileage || null,
        organizationId: context.organization.id,
        pairsCount: sanitizedPairs.length,
        firstPair: sanitizedPairs[0]
      });
      
      let newVehicle;
      try {
        // Create vehicle without pairs first
        newVehicle = await tx.vehicle.create({
          data: {
            vin,
            mileage: mileage || null,
            organizationId: context.organization.id
          }
        });
        console.log('Vehicle created with UUID:', newVehicle.uuid);
        
        // Then create pairs separately
        if (sanitizedPairs.length > 0) {
          console.log('Creating vehicle pairs...');
          await tx.vehiclePair.createMany({
            data: sanitizedPairs.map(pair => ({
              ...pair,
              vehicleId: newVehicle.uuid
            }))
          });
          console.log('Vehicle pairs created successfully');
        }
        
        // Fetch the complete vehicle with pairs
        newVehicle = await tx.vehicle.findUnique({
          where: { uuid: newVehicle.uuid },
          include: { vehiclePairs: true }
        });
      } catch (createError) {
        console.log('Error creating vehicle');
        if (createError instanceof Error) {
          console.log('Error type:', createError.constructor.name);
          console.log('Error message:', createError.message);
          console.log('Error stack:', createError.stack);
        } else {
          console.log('Unknown error:', JSON.stringify(createError, null, 2));
        }
        throw createError;
      }
      console.log('Vehicle created successfully:', newVehicle.uuid);

      // Track usage
      console.log('Creating usage record...');
      await tx.usageRecord.create({
        data: {
          organizationId: context.organization.id,
          feature: 'vehicle_create',
          metadata: { vin: vin || 'unknown' }
        }
      });
      console.log('Usage record created');

      // Audit log
      console.log('Creating audit log...');
      const auditData = {
        organizationId: context.organization.id,
        userId: context.user.id,
        action: 'vehicle.created',
        resource: newVehicle.uuid,
        metadata: { vin: vin || 'unknown' },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown'
      };
      console.log('Audit data:', auditData);
      await tx.auditLog.create({
        data: auditData
      });
      console.log('Audit log created');

      return newVehicle;
    });

    // logger.info('Vehicle created', {
    //   organizationId: context.organization.id,
    //   userId: context.user.id,
    //   vehicleId: vehicle.uuid,
    //   vin: vehicle.vin
    // });

    return NextResponse.json(vehicle);
  } catch (error) {
    // Safely log the error
    console.log('POST /api/vehicles error occurred');
    if (error instanceof Error) {
      console.log('Error message:', error.message);
      console.log('Error stack:', error.stack);
      const status = error.message.includes('already exists') ? 409 : 500;
      return NextResponse.json(
        { message: error.message },
        { status }
      );
    } else {
      console.log('Unknown error type:', typeof error);
      console.log('Error stringified:', JSON.stringify(error, null, 2));
    }
    
    return NextResponse.json(
      { message: 'An unexpected error occurred while creating the vehicle' },
      { status: 500 }
    );
  }
});