import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

// PATCH - Update accessory selections and get updated valuation from JD Power
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ uuid: string; bookoutId: string }> }
) {
  try {
    const { uuid, bookoutId } = await params;
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify vehicle ownership and get bookout
    const vehicle = await db.vehicle.findUnique({
      where: {
        uuid: uuid,
        userId: user.id
      },
      include: {
        bookouts: {
          where: { id: bookoutId },
          include: { accessories: true }
        }
      }
    });

    if (!vehicle || vehicle.bookouts.length === 0) {
      return NextResponse.json({ error: 'Vehicle or bookout not found' }, { status: 404 });
    }

    const bookout = vehicle.bookouts[0];
    if (bookout.provider !== 'jdpower') {
      return NextResponse.json({ error: 'Only JD Power bookouts support accessory updates' }, { status: 400 });
    }

    const body = await request.json();
    const { selectedAccessoryCodes, changeTrackingValidationId } = body;

    if (!Array.isArray(selectedAccessoryCodes)) {
      return NextResponse.json({ error: 'selectedAccessoryCodes must be an array' }, { status: 400 });
    }

    console.log('Updating accessory selections:', selectedAccessoryCodes);
    console.log('Change tracking validation ID:', changeTrackingValidationId);

    // Initialize change tracking if validation ID provided
    let snapshotManager;
    if (changeTrackingValidationId) {
      const { BookoutSnapshotManager } = await import('@/lib/bookout-snapshot');
      snapshotManager = new BookoutSnapshotManager(changeTrackingValidationId, bookoutId);
    }

    // Get current accessory state BEFORE making changes for change tracking
    const accessoriesBeforeUpdate = await db.bookoutAccessory.findMany({
      where: { bookoutId: bookoutId }
    });

    // Update accessory selections in database
    await db.$transaction(async (tx) => {
      // First, set all accessories as not selected
      await tx.bookoutAccessory.updateMany({
        where: { bookoutId: bookoutId },
        data: { isSelected: false }
      });

      // Then select the specified accessories
      if (selectedAccessoryCodes.length > 0) {
        await tx.bookoutAccessory.updateMany({
          where: { 
            bookoutId: bookoutId,
            code: { in: selectedAccessoryCodes }
          },
          data: { isSelected: true }
        });
      }

      // LOG CHANGES IF CHANGE TRACKING IS ENABLED
      if (snapshotManager) {
        console.log('TRACKING ACCESSORY CHANGES...');
        
        // Compare before and after states and log changes
        for (const beforeAccessory of accessoriesBeforeUpdate) {
          const wasSelected = beforeAccessory.isSelected;
          const isNowSelected = selectedAccessoryCodes.includes(beforeAccessory.code);
          
          if (wasSelected !== isNowSelected) {
            snapshotManager.logAccessoryChange(
              beforeAccessory.id,
              beforeAccessory.code,
              isNowSelected,
              isNowSelected ? 'AI validation: selected per build sheet authority' : 'AI validation: deselected - not found in build sheet',
              1.0, // Full confidence since this is the result of AI validation
              isNowSelected ? 'CONFIRMED' : 'NOT_FOUND'
            );
            
            console.log(`LOGGED CHANGE: ${beforeAccessory.code} ${wasSelected ? 'DESELECTED' : 'SELECTED'}`);
          }
        }
      }

      // Apply inclusion/exclusion logic
      const allAccessories = await tx.bookoutAccessory.findMany({
        where: { bookoutId: bookoutId }
      });

      const selectedAccessories = allAccessories.filter(acc => acc.isSelected);
      
      // Handle includes/excludes logic
      const additionalSelections = new Set<string>();
      const exclusions = new Set<string>();

      for (const accessory of selectedAccessories) {
        // If this accessory includes others, add them
        if (accessory.includesCode) {
          const includedCodes = accessory.includesCode.split(',').map(c => c.trim());
          includedCodes.forEach(code => additionalSelections.add(code));
        }
        
        // If this accessory excludes others, mark them for exclusion
        if (accessory.excludesCode) {
          const excludedCodes = accessory.excludesCode.split(',').map(c => c.trim());
          excludedCodes.forEach(code => exclusions.add(code));
        }
      }

      // Apply additional selections
      if (additionalSelections.size > 0) {
        await tx.bookoutAccessory.updateMany({
          where: { 
            bookoutId: bookoutId,
            code: { in: Array.from(additionalSelections) }
          },
          data: { isSelected: true }
        });
      }

      // Apply exclusions (set as unavailable and deselect)
      if (exclusions.size > 0) {
        await tx.bookoutAccessory.updateMany({
          where: { 
            bookoutId: bookoutId,
            code: { in: Array.from(exclusions) }
          },
          data: { 
            isSelected: false,
            isAvailable: false 
          }
        });
      }

      // Reset availability for non-excluded accessories
      await tx.bookoutAccessory.updateMany({
        where: { 
          bookoutId: bookoutId,
          code: { notIn: Array.from(exclusions) }
        },
        data: { isAvailable: true }
      });
    });

    // Get updated accessory data
    const updatedAccessories = await db.bookoutAccessory.findMany({
      where: { bookoutId: bookoutId },
      orderBy: { category: 'asc' }
    });

    // Get fresh valuation from JD Power with selected accessories
    const { revaluateWithSelectedAccessories } = await import('@/lib/jdpower-revaluation');
    
    const selectedAccessoriesOnly = updatedAccessories.filter(acc => acc.isSelected);
    const selectedCodes = selectedAccessoriesOnly.map(acc => acc.code);
    
    console.log('Requesting JD Power re-valuation with accessories:', selectedCodes);

    const revaluationResult = await revaluateWithSelectedAccessories({
      vin: vehicle.vin,
      ucgVehicleId: bookout.ucgVehicleId!,
      period: '0', // Current date
      region: bookout.region || 1,
      mileage: bookout.mileage || undefined,
      selectedAccessoryCodes: selectedCodes,
      vehicletype: 'UsedCar'
    });

    // Get values before revaluation for change tracking
    const beforeValues = {
      cleanTradeIn: bookout.cleanTradeIn || 0,
      cleanRetail: bookout.cleanRetail || 0,
      loanValue: bookout.loanValue || 0
    };

    let updatedBookout;

    if (revaluationResult.success && revaluationResult.updatedValues) {
      // Use JD Power's updated values
      const values = revaluationResult.updatedValues;
      
      updatedBookout = await db.bookout.update({
        where: { id: bookoutId },
        data: {
          // Update with fresh JD Power values
          baseCleanTradeIn: values.baseCleanTradeIn,
          baseAverageTradeIn: values.baseAverageTradeIn,
          baseRoughTradeIn: values.baseRoughTradeIn,
          baseCleanRetail: values.baseCleanRetail,
          baseLoanValue: values.baseLoanValue,
          cleanTradeIn: values.adjustedCleanTradeIn,
          averageTradeIn: values.adjustedAverageTradeIn,
          roughTradeIn: values.adjustedRoughTradeIn,
          cleanRetail: values.adjustedCleanRetail,
          loanValue: values.adjustedLoanValue,
          mileageAdjustment: values.mileageAdjustment,
          vinOptionsTradeIn: values.accessoryAdjustments.tradeIn,
          vinOptionsRetail: values.accessoryAdjustments.retail,
          vinOptionsLoan: values.accessoryAdjustments.loan,
          requestId: revaluationResult.requestId
        },
        include: { accessories: true }
      });

      // Log revaluation changes if change tracking enabled
      if (snapshotManager) {
        const afterValues = {
          cleanTradeIn: values.adjustedCleanTradeIn,
          cleanRetail: values.adjustedCleanRetail,
          loanValue: values.adjustedLoanValue
        };
        
        snapshotManager.logRevaluation(beforeValues, afterValues, 'ai_validation_jdpower_revaluation');
        console.log('LOGGED REVALUATION:', { beforeValues, afterValues });
      }

      console.log('Updated bookout with JD Power re-valuation:', {
        selectedAccessories: selectedCodes.length,
        accessoryAdjustments: values.accessoryAdjustments,
        finalValues: {
          cleanTradeIn: values.adjustedCleanTradeIn,
          cleanRetail: values.adjustedCleanRetail,
          loanValue: values.adjustedLoanValue
        }
      });
    } else {
      // Fallback to client-side calculation if JD Power fails
      console.warn('JD Power re-valuation failed, using client-side calculation:', revaluationResult.error);
      
      let totalTradeAdj = 0;
      let totalRetailAdj = 0;
      let totalLoanAdj = 0;

      selectedAccessoriesOnly.forEach(acc => {
        if (!acc.isFactoryInstalled) { // Don't double-count factory installed items
          totalTradeAdj += acc.cleanTradeAdj || 0;
          totalRetailAdj += acc.cleanRetailAdj || 0;
          totalLoanAdj += acc.loanAdj || 0;
        }
      });

      const afterValues = {
        cleanTradeIn: (bookout.baseCleanTradeIn || 0) + (bookout.mileageAdjustment || 0) + totalTradeAdj,
        cleanRetail: (bookout.baseCleanRetail || 0) + totalRetailAdj,
        loanValue: (bookout.baseLoanValue || 0) + totalLoanAdj
      };

      updatedBookout = await db.bookout.update({
        where: { id: bookoutId },
        data: {
          cleanTradeIn: afterValues.cleanTradeIn,
          averageTradeIn: (bookout.baseAverageTradeIn || 0) + (bookout.mileageAdjustment || 0) + totalTradeAdj,
          roughTradeIn: (bookout.baseRoughTradeIn || 0) + (bookout.mileageAdjustment || 0) + totalTradeAdj,
          cleanRetail: afterValues.cleanRetail,
          loanValue: afterValues.loanValue,
          vinOptionsTradeIn: totalTradeAdj,
          vinOptionsRetail: totalRetailAdj,
          vinOptionsLoan: totalLoanAdj
        },
        include: { accessories: true }
      });

      // Log revaluation changes for fallback case
      if (snapshotManager) {
        snapshotManager.logRevaluation(beforeValues, afterValues, 'ai_validation_client_side_revaluation');
        console.log('LOGGED CLIENT-SIDE REVALUATION:', { beforeValues, afterValues });
      }
    }

    // SAVE ALL CHANGE TRACKING TO DATABASE
    if (snapshotManager) {
      try {
        await snapshotManager.saveChanges();
        console.log('ALL CHANGES SAVED TO DATABASE');
      } catch (saveError) {
        console.error('Failed to save change tracking:', saveError);
      }
    }

    const finalTotals = {
      selectedAccessories: selectedAccessoriesOnly.length,
      totalTradeAdjustment: updatedBookout.vinOptionsTradeIn || 0,
      totalRetailAdjustment: updatedBookout.vinOptionsRetail || 0,
      totalLoanAdjustment: updatedBookout.vinOptionsLoan || 0,
      revaluationSource: revaluationResult.success ? 'jdpower' : 'client-side'
    };

    console.log('Updated bookout values:', finalTotals);

    return NextResponse.json({
      message: 'Accessory selections updated successfully',
      bookout: updatedBookout,
      accessories: updatedAccessories,
      totals: finalTotals,
      revaluation: {
        success: revaluationResult.success,
        source: revaluationResult.success ? 'jdpower' : 'client-side',
        error: revaluationResult.error || null
      }
    });

  } catch (error: any) {
    console.error('Error updating accessory selections:', error);
    return NextResponse.json({
      error: 'Failed to update accessory selections',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Get current accessory selections for a bookout
export async function GET(
  request: Request,
  { params }: { params: Promise<{ uuid: string; bookoutId: string }> }
) {
  try {
    const { uuid, bookoutId } = await params;
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify vehicle ownership and get accessories
    const vehicle = await db.vehicle.findUnique({
      where: {
        uuid: uuid,
        userId: user.id
      },
      include: {
        bookouts: {
          where: { id: bookoutId },
          include: { 
            accessories: {
              orderBy: [
                { category: 'asc' },
                { name: 'asc' }
              ]
            }
          }
        }
      }
    });

    if (!vehicle || vehicle.bookouts.length === 0) {
      return NextResponse.json({ error: 'Vehicle or bookout not found' }, { status: 404 });
    }

    const bookout = vehicle.bookouts[0];
    const accessories = bookout.accessories;

    // Group accessories by category
    const groupedAccessories = accessories.reduce((groups: any, accessory) => {
      const category = accessory.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(accessory);
      return groups;
    }, {});

    // Calculate current totals
    const selectedAccessories = accessories.filter(acc => acc.isSelected);
    const totalTradeAdj = selectedAccessories.reduce((sum, acc) => sum + (acc.cleanTradeAdj || 0), 0);
    const totalRetailAdj = selectedAccessories.reduce((sum, acc) => sum + (acc.cleanRetailAdj || 0), 0);
    const totalLoanAdj = selectedAccessories.reduce((sum, acc) => sum + (acc.loanAdj || 0), 0);

    return NextResponse.json({
      bookout: {
        id: bookout.id,
        provider: bookout.provider,
        vehicle: {
          year: bookout.year,
          make: bookout.make,
          model: bookout.model,
          trim: bookout.trim
        },
        values: {
          baseCleanTradeIn: bookout.baseCleanTradeIn,
          baseCleanRetail: bookout.baseCleanRetail,
          baseLoanValue: bookout.baseLoanValue,
          cleanTradeIn: bookout.cleanTradeIn,
          cleanRetail: bookout.cleanRetail,
          loanValue: bookout.loanValue
        }
      },
      accessories: accessories,
      groupedAccessories: groupedAccessories,
      summary: {
        totalAccessories: accessories.length,
        selectedAccessories: selectedAccessories.length,
        availableAccessories: accessories.filter(acc => acc.isAvailable).length,
        totalTradeAdjustment: totalTradeAdj,
        totalRetailAdjustment: totalRetailAdj,
        totalLoanAdjustment: totalLoanAdj
      }
    });

  } catch (error: any) {
    console.error('Error fetching accessory data:', error);
    return NextResponse.json({
      error: 'Failed to fetch accessory data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}