import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireOrganization } from '@/lib/auth';

// POST - Apply validation session changes to bookout
export const POST = requireOrganization(async (request: NextRequest, context, { params }: { params: Promise<{ uuid: string; sessionId: string }> }) => {
  try {
    const { uuid, sessionId } = await params;

    // Verify vehicle ownership
    const vehicle = await db.vehicle.findUnique({
      where: {
        uuid: uuid,
        organizationId: context.organization.id
      },
      include: {
        bookouts: {
          where: { provider: 'jdpower' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Get session with all overrides
    const session = await db.validationSession.findUnique({
      where: { id: sessionId },
      include: {
        validation: true,
        overrides: true
      }
    });

    if (!session || session.vehicleId !== uuid) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Session has already been applied or cancelled' 
      }, { status: 400 });
    }

    if (new Date() > session.expiresAt) {
      return NextResponse.json({ 
        error: 'Session has expired' 
      }, { status: 400 });
    }

    // No need to check for pending - all overrides default to following build sheet

    // Get current bookout and accessories
    const bookout = vehicle.bookouts[0];
    if (!bookout || bookout.id !== session.bookoutId) {
      return NextResponse.json({ 
        error: 'Bookout has changed since validation. Please re-validate.' 
      }, { status: 400 });
    }

    const currentAccessories = await db.bookoutAccessory.findMany({
      where: { bookoutId: bookout.id }
    });

    // Calculate final accessory selections
    const finalSelections = new Set<string>();
    const changedAccessories: Array<{code: string, name: string, action: string}> = [];
    
    // Create a map of current accessories for quick lookup
    const accessoryMap = new Map<string, any>();
    currentAccessories.forEach(acc => {
      accessoryMap.set(acc.code, acc);
    });
    
    // Process all accessories (not just those with overrides)
    currentAccessories.forEach(acc => {
      const override = session.overrides.find(o => o.accessoryCode === acc.code);
      const currentlySelected = acc.isSelected;
      let shouldBeSelected = currentlySelected;
      
      console.log(`Processing accessory ${acc.code} (${acc.name}):`, {
        currentlySelected,
        hasOverride: !!override,
        aiRecommendation: override?.aiRecommendation,
        keepJdPower: override?.keepJdPower
      });
      
      if (override) {
        if (override.keepJdPower) {
          // keepJdPower = true means "keep the current JD Power selection, ignore AI recommendation"
          // So we keep the current state unchanged
          shouldBeSelected = currentlySelected;
          console.log(`Override for ${acc.code}: keeping JD Power selection (${currentlySelected})`);
        } else {
          // Follow AI recommendation
          if (override.aiRecommendation === 'SELECT') {
            shouldBeSelected = true;
            if (!currentlySelected) {
              console.log(`Adding accessory ${acc.code} based on AI recommendation`);
              changedAccessories.push({
                code: override.accessoryCode,
                name: override.accessoryName,
                action: 'Added (AI recommendation)'
              });
            }
          } else if (override.aiRecommendation === 'DESELECT') {
            shouldBeSelected = false;
            if (currentlySelected) {
              console.log(`Removing accessory ${acc.code} based on AI recommendation`);
              changedAccessories.push({
                code: override.accessoryCode,
                name: override.accessoryName,
                action: 'Removed (AI recommendation)'
              });
            } else {
              console.log(`Accessory ${acc.code} already deselected, no change needed`);
            }
          }
          // NO_CHANGE means keep current state
        }
      } else {
        console.log(`No override found for accessory ${acc.code}, keeping current state`);
      }
      // If no override exists, keep current state
      
      console.log(`Final decision for ${acc.code}: shouldBeSelected = ${shouldBeSelected}`);
      
      if (shouldBeSelected) {
        finalSelections.add(acc.code);
      }
    });

    console.log('Apply session debug:', {
      totalAccessories: currentAccessories.length,
      totalOverrides: session.overrides.length,
      currentlySelected: currentAccessories.filter(a => a.isSelected).length,
      finalSelections: finalSelections.size,
      finalSelectionCodes: Array.from(finalSelections),
      changedAccessories: changedAccessories.length,
      overridesWithKeepJdPower: session.overrides.filter(o => o.keepJdPower).length,
      overridesWithSelect: session.overrides.filter(o => o.aiRecommendation === 'SELECT').length,
      overridesWithDeselect: session.overrides.filter(o => o.aiRecommendation === 'DESELECT').length
    });

    // If no changes, analyze why
    if (changedAccessories.length === 0) {
      console.log('NO CHANGES DETECTED - Analyzing why:');
      
      // Check DESELECT recommendations
      const deselectOverrides = session.overrides.filter(o => o.aiRecommendation === 'DESELECT');
      console.log(`Found ${deselectOverrides.length} DESELECT recommendations:`);
      
      deselectOverrides.forEach(override => {
        const accessory = currentAccessories.find(a => a.code === override.accessoryCode);
        console.log(`  - ${override.accessoryCode} (${override.accessoryName}):`);
        console.log(`    - Currently selected: ${accessory?.isSelected}`);
        console.log(`    - Keep JD Power: ${override.keepJdPower}`);
        console.log(`    - Original selected: ${override.originalSelected}`);
        
        if (!accessory?.isSelected) {
          console.log(`    → Already deselected, no change needed`);
        } else if (override.keepJdPower) {
          console.log(`    → User overrode to keep JD Power selection`);
        } else {
          console.log(`    → SHOULD BE DESELECTED BUT WASN'T - THIS IS A BUG!`);
        }
      });
      
      // Check SELECT recommendations
      const selectOverrides = session.overrides.filter(o => o.aiRecommendation === 'SELECT');
      console.log(`\nFound ${selectOverrides.length} SELECT recommendations:`);
      
      selectOverrides.forEach(override => {
        const accessory = currentAccessories.find(a => a.code === override.accessoryCode);
        console.log(`  - ${override.accessoryCode} (${override.accessoryName}):`);
        console.log(`    - Currently selected: ${accessory?.isSelected}`);
        console.log(`    - Keep JD Power: ${override.keepJdPower}`);
        
        if (accessory?.isSelected) {
          console.log(`    → Already selected, no change needed`);
        } else if (override.keepJdPower) {
          console.log(`    → User overrode to keep JD Power selection`);
        } else {
          console.log(`    → SHOULD BE SELECTED BUT WASN'T - THIS IS A BUG!`);
        }
      });
    }
    
    // Debug: Show details of DESELECT overrides
    const deselectOverrides = session.overrides.filter(o => o.aiRecommendation === 'DESELECT');
    console.log('DESELECT overrides details:', deselectOverrides.map(o => ({
      code: o.accessoryCode,
      name: o.accessoryName,
      keepJdPower: o.keepJdPower,
      originalSelected: o.originalSelected
    })));

    // Check if there are actually any changes to make
    const currentSelections = new Set(currentAccessories.filter(a => a.isSelected).map(a => a.code));
    const selectionsMatch = currentSelections.size === finalSelections.size && 
                           Array.from(currentSelections).every(code => finalSelections.has(code));
    
    if (selectionsMatch && changedAccessories.length === 0) {
      console.log('CRITICAL: No actual changes to make - current selections already match final selections');
      console.log('Current selections:', Array.from(currentSelections));
      console.log('Final selections:', Array.from(finalSelections));
    }

    // Update accessories directly in database
    await db.$transaction(async (tx) => {
      // First, set all accessories as not selected
      await tx.bookoutAccessory.updateMany({
        where: { bookoutId: bookout.id },
        data: { isSelected: false }
      });

      // Then select the specified accessories
      if (finalSelections.size > 0) {
        await tx.bookoutAccessory.updateMany({
          where: { 
            bookoutId: bookout.id,
            code: { in: Array.from(finalSelections) }
          },
          data: { isSelected: true }
        });
      }
    });

    // *** CRITICAL: UPDATE ACCESSORY SELECTION STATES IN DATABASE ***
    console.log('Updating accessory selection states in database...');
    
    // Update all accessories to reflect their new selection state
    for (const acc of currentAccessories) {
      const shouldBeSelected = finalSelections.has(acc.code);
      
      if (acc.isSelected !== shouldBeSelected) {
        console.log(`Updating accessory ${acc.code}: ${acc.isSelected} → ${shouldBeSelected}`);
        await db.bookoutAccessory.update({
          where: { id: acc.id },
          data: { isSelected: shouldBeSelected }
        });
      }
    }

    // Get updated accessories for revaluation
    const updatedAccessories = await db.bookoutAccessory.findMany({
      where: { bookoutId: bookout.id, isSelected: true }
    });
    const selectedCodes = updatedAccessories.map(acc => acc.code);
    
    console.log('Updated accessories in database:', {
      totalAccessories: currentAccessories.length,
      selectedAccessories: updatedAccessories.length,
      selectedCodes: selectedCodes
    });

    // Get fresh valuation from JD Power
    const { revaluateWithSelectedAccessories } = await import('@/lib/jdpower-revaluation');
    const revaluationResult = await revaluateWithSelectedAccessories({
      vin: vehicle.vin,
      ucgVehicleId: bookout.ucgVehicleId!,
      period: '0',
      region: bookout.region || 1,
      mileage: bookout.mileage || undefined,
      selectedAccessoryCodes: selectedCodes,
      vehicletype: 'UsedCar'
    });

    let updatedBookout;
    if (revaluationResult.success && revaluationResult.updatedValues) {
      const values = revaluationResult.updatedValues;
      console.log('Updating bookout with revaluation results:', {
        cleanTradeIn: values.adjustedCleanTradeIn,
        cleanRetail: values.adjustedCleanRetail,
        loanValue: values.adjustedLoanValue,
        accessoryAdjustments: values.accessoryAdjustments
      });
      
      updatedBookout = await db.bookout.update({
        where: { id: bookout.id },
        data: {
          cleanTradeIn: values.adjustedCleanTradeIn,
          cleanRetail: values.adjustedCleanRetail,
          loanValue: values.adjustedLoanValue,
          averageTradeIn: values.adjustedAverageTradeIn,
          roughTradeIn: values.adjustedRoughTradeIn,
          vinOptionsTradeIn: values.accessoryAdjustments.tradeIn,
          vinOptionsRetail: values.accessoryAdjustments.retail,
          vinOptionsLoan: values.accessoryAdjustments.loan
        }
      });
      
      console.log('Bookout updated successfully:', updatedBookout.id);
    } else {
      // Fallback calculation if JD Power fails
      console.warn('JD Power revaluation failed, using fallback calculation');
      updatedBookout = bookout;
    }

    // Mark session as applied
    await db.validationSession.update({
      where: { id: sessionId },
      data: { 
        status: 'applied',
        appliedAt: new Date()
      }
    });

    // Create individual change log entries for each accessory change
    let sequenceCounter = 1;
    
    for (const change of changedAccessories) {
      const changeType = change.action.includes('Added') ? 'accessory_selected' : 'accessory_deselected';
      const accessory = currentAccessories.find(a => a.code === change.code);
      
      await db.bookoutChangeLog.create({
        data: {
          validationId: session.validationId,
          bookoutId: bookout.id,
          changeType: changeType,
          entityType: 'accessory',
          entityId: accessory?.id,
          entityCode: change.code,
          fieldName: 'isSelected',
          beforeValue: changeType === 'accessory_selected' ? 'false' : 'true',
          afterValue: changeType === 'accessory_selected' ? 'true' : 'false',
          reason: change.action,
          sequence: sequenceCounter++
        }
      });
    }
    
    // Overall bookout revaluation log
    if (changedAccessories.length > 0) {
      await db.bookoutChangeLog.create({
        data: {
          validationId: session.validationId,
          bookoutId: bookout.id,
          changeType: 'bookout_revalued',
          entityType: 'bookout',
          fieldName: 'accessories_updated',
          beforeValue: JSON.stringify({ selectedCount: currentAccessories.filter(a => a.isSelected).length }),
          afterValue: JSON.stringify({ selectedCount: finalSelections.size, changes: changedAccessories }),
          reason: 'Applied AI validation with user overrides',
          sequence: sequenceCounter
        }
      });
    }

    // CRITICAL DEBUG: Explain why no changes were made
    if (changedAccessories.length === 0) {
      console.log('=== NO CHANGES ANALYSIS ===');
      console.log('Selected accessories before:', currentAccessories.filter(a => a.isSelected).map(a => a.code));
      console.log('Selected accessories after:', Array.from(finalSelections));
      console.log('Accessories that should be deselected (NOT_FOUND):');
      
      deselectOverrides.forEach(override => {
        const currentAccessory = currentAccessories.find(a => a.code === override.accessoryCode);
        console.log(`  ${override.accessoryCode}: currently=${currentAccessory?.isSelected}, keepJdPower=${override.keepJdPower}, should=${!override.keepJdPower ? 'DESELECT' : 'KEEP'}`);
      });
      
      console.log('Reason for no changes: Either accessories already deselected OR all NOT_FOUND accessories have been overridden by user');
    }

    return NextResponse.json({
      message: 'Validation session applied successfully',
      session: {
        id: session.id,
        status: 'applied',
        appliedAt: new Date()
      },
      bookout: updatedBookout,
      changes: {
        totalChanges: changedAccessories.length,
        keptJdPower: session.overrides.filter(o => o.keepJdPower).length,
        followedBuildSheet: session.overrides.filter(o => !o.keepJdPower).length,
        finalSelections: finalSelections.size,
        details: changedAccessories,
        revaluation: revaluationResult.success ? 'success' : 'fallback'
      }
    });

  } catch (error: any) {
    console.error('Error applying validation session:', error);
    return NextResponse.json({
      error: 'Failed to apply validation session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});