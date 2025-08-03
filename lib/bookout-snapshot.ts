/**
 * Bookout Snapshot and Change Tracking Utilities
 * 
 * This module handles creating snapshots of bookouts before validation
 * and tracking all changes made during the validation process
 */

import { db } from '@/lib/db';

export interface BookoutSnapshotData {
  bookout: any;
  accessories: any[];
  metadata: {
    timestamp: string;
    totalAccessories: number;
    selectedAccessories: number;
    totalValues: {
      cleanTradeIn: number;
      cleanRetail: number;
      loanValue: number;
    };
  };
}

export interface ChangeLogEntry {
  changeType: 'accessory_selected' | 'accessory_deselected' | 'value_updated' | 'bookout_revalued';
  entityType: 'bookout' | 'accessory';
  entityId?: string;
  entityCode?: string;
  fieldName: string;
  beforeValue?: string;
  afterValue?: string;
  valueDifference?: number;
  reason: string;
  confidence?: number;
  aiValidationStatus?: string;
  sequence: number;
}

export class BookoutSnapshotManager {
  private validationId: string;
  private bookoutId: string;
  private changeSequence = 0;
  private changeLogs: ChangeLogEntry[] = [];

  constructor(validationId: string, bookoutId: string) {
    this.validationId = validationId;
    this.bookoutId = bookoutId;
  }

  /**
   * Create a snapshot of the current bookout state before validation
   */
  async createSnapshot(reason = 'pre_validation', description?: string): Promise<string> {
    console.log(`Creating bookout snapshot for validation ${this.validationId}`);

    // Get complete bookout with all accessories
    const bookout = await db.bookout.findUnique({
      where: { id: this.bookoutId },
      include: { 
        accessories: {
          orderBy: { code: 'asc' }
        }
      }
    });

    if (!bookout) {
      throw new Error('Bookout not found for snapshot');
    }

    // Prepare snapshot data
    const snapshotData: BookoutSnapshotData = {
      bookout: {
        ...bookout,
        accessories: undefined // Remove accessories from bookout object since we store them separately
      },
      accessories: bookout.accessories,
      metadata: {
        timestamp: new Date().toISOString(),
        totalAccessories: bookout.accessories.length,
        selectedAccessories: bookout.accessories.filter(acc => acc.isSelected).length,
        totalValues: {
          cleanTradeIn: bookout.cleanTradeIn || 0,
          cleanRetail: bookout.cleanRetail || 0,
          loanValue: bookout.loanValue || 0
        }
      }
    };

    // Create snapshot record
    const snapshot = await db.bookoutSnapshot.create({
      data: {
        originalBookoutId: this.bookoutId,
        validationId: this.validationId,
        snapshotData: snapshotData as any,
        reason,
        description
      }
    });

    console.log(`Snapshot created with ID: ${snapshot.id}`);
    return snapshot.id;
  }

  /**
   * Log a change made during validation
   */
  logChange(entry: Omit<ChangeLogEntry, 'sequence'>): void {
    this.changeSequence++;
    this.changeLogs.push({
      ...entry,
      sequence: this.changeSequence
    });

    console.log(`Change logged [${this.changeSequence}]: ${entry.changeType} - ${entry.reason}`);
  }

  /**
   * Log accessory selection change
   */
  logAccessoryChange(
    accessoryId: string,
    accessoryCode: string,
    isSelected: boolean,
    reason: string,
    confidence?: number,
    aiStatus?: string
  ): void {
    this.logChange({
      changeType: isSelected ? 'accessory_selected' : 'accessory_deselected',
      entityType: 'accessory',
      entityId: accessoryId,
      entityCode: accessoryCode,
      fieldName: 'isSelected',
      beforeValue: (!isSelected).toString(),
      afterValue: isSelected.toString(),
      reason,
      confidence,
      aiValidationStatus: aiStatus
    });
  }

  /**
   * Log bookout value change
   */
  logValueChange(
    fieldName: string,
    beforeValue: number,
    afterValue: number,
    reason: string
  ): void {
    this.logChange({
      changeType: 'value_updated',
      entityType: 'bookout',
      fieldName,
      beforeValue: beforeValue.toString(),
      afterValue: afterValue.toString(),
      valueDifference: afterValue - beforeValue,
      reason
    });
  }

  /**
   * Log complete bookout revaluation
   */
  logRevaluation(
    beforeValues: { cleanTradeIn: number; cleanRetail: number; loanValue: number },
    afterValues: { cleanTradeIn: number; cleanRetail: number; loanValue: number },
    reason = 'jdpower_revaluation'
  ): void {
    // Log each value change
    this.logValueChange('cleanTradeIn', beforeValues.cleanTradeIn, afterValues.cleanTradeIn, reason);
    this.logValueChange('cleanRetail', beforeValues.cleanRetail, afterValues.cleanRetail, reason);
    this.logValueChange('loanValue', beforeValues.loanValue, afterValues.loanValue, reason);

    // Log overall revaluation event
    this.logChange({
      changeType: 'bookout_revalued',
      entityType: 'bookout',
      fieldName: 'complete_revaluation',
      beforeValue: JSON.stringify(beforeValues),
      afterValue: JSON.stringify(afterValues),
      valueDifference: afterValues.cleanTradeIn - beforeValues.cleanTradeIn, // Use trade-in as primary indicator
      reason
    });
  }

  /**
   * Save all logged changes to database
   */
  async saveChanges(): Promise<void> {
    if (this.changeLogs.length === 0) {
      console.log('No changes to save');
      return;
    }

    console.log(`Saving ${this.changeLogs.length} change log entries`);

    const changeLogData = this.changeLogs.map(entry => ({
      validationId: this.validationId,
      bookoutId: this.bookoutId,
      changeType: entry.changeType,
      entityType: entry.entityType,
      entityId: entry.entityId,
      entityCode: entry.entityCode,
      fieldName: entry.fieldName,
      beforeValue: entry.beforeValue,
      afterValue: entry.afterValue,
      valueDifference: entry.valueDifference,
      reason: entry.reason,
      confidence: entry.confidence,
      aiValidationStatus: entry.aiValidationStatus,
      sequence: entry.sequence
    }));

    await db.bookoutChangeLog.createMany({
      data: changeLogData
    });

    console.log('All changes saved to database');
  }

  /**
   * Get change summary for display
   */
  getChangeSummary() {
    const accessoryChanges = this.changeLogs.filter(log => log.entityType === 'accessory');
    const valueChanges = this.changeLogs.filter(log => log.entityType === 'bookout' && log.changeType === 'value_updated');
    const revaluations = this.changeLogs.filter(log => log.changeType === 'bookout_revalued');

    const selected = accessoryChanges.filter(log => log.changeType === 'accessory_selected').length;
    const deselected = accessoryChanges.filter(log => log.changeType === 'accessory_deselected').length;

    const totalValueImpact = valueChanges.reduce((sum, log) => sum + (log.valueDifference || 0), 0);

    return {
      totalChanges: this.changeLogs.length,
      accessoryChanges: {
        selected,
        deselected,
        total: selected + deselected
      },
      valueChanges: {
        count: valueChanges.length,
        totalImpact: totalValueImpact
      },
      revaluations: revaluations.length,
      hasSignificantChanges: selected > 0 || totalValueImpact !== 0
    };
  }
}

/**
 * Utility function to restore a bookout to its snapshot state
 */
export async function restoreBookoutFromSnapshot(snapshotId: string): Promise<void> {
  console.log(`Restoring bookout from snapshot ${snapshotId}`);

  const snapshot = await db.bookoutSnapshot.findUnique({
    where: { id: snapshotId }
  });

  if (!snapshot) {
    throw new Error('Snapshot not found');
  }

  const snapshotData = snapshot.snapshotData as BookoutSnapshotData;

  // Restore bookout values
  await db.bookout.update({
    where: { id: snapshot.originalBookoutId },
    data: {
      // Restore all the key values from snapshot
      cleanTradeIn: snapshotData.bookout.cleanTradeIn,
      averageTradeIn: snapshotData.bookout.averageTradeIn,
      roughTradeIn: snapshotData.bookout.roughTradeIn,
      cleanRetail: snapshotData.bookout.cleanRetail,
      loanValue: snapshotData.bookout.loanValue,
      vinOptionsTradeIn: snapshotData.bookout.vinOptionsTradeIn,
      vinOptionsRetail: snapshotData.bookout.vinOptionsRetail,
      vinOptionsLoan: snapshotData.bookout.vinOptionsLoan
    }
  });

  // Restore accessory selections
  for (const accessory of snapshotData.accessories) {
    await db.bookoutAccessory.update({
      where: { id: accessory.id },
      data: {
        isSelected: accessory.isSelected,
        isAvailable: accessory.isAvailable
      }
    });
  }

  console.log('Bookout restored from snapshot');
}

/**
 * Get comparison data between original and current state
 */
export async function getBookoutComparison(validationId: string) {
  const validation = await db.aIValidation.findUnique({
    where: { id: validationId },
    include: {
      snapshot: true,
      changeLogs: {
        orderBy: { sequence: 'asc' }
      }
    }
  });

  if (!validation || !validation.snapshot) {
    throw new Error('Validation or snapshot not found');
  }

  const snapshotData = validation.snapshot.snapshotData as BookoutSnapshotData;
  
  // Get current bookout state
  const currentBookout = await db.bookout.findUnique({
    where: { id: validation.bookoutId! },
    include: { accessories: true }
  });

  if (!currentBookout) {
    throw new Error('Current bookout not found');
  }

  // Calculate differences
  const valueDifferences = {
    cleanTradeIn: (currentBookout.cleanTradeIn || 0) - (snapshotData.bookout.cleanTradeIn || 0),
    cleanRetail: (currentBookout.cleanRetail || 0) - (snapshotData.bookout.cleanRetail || 0),
    loanValue: (currentBookout.loanValue || 0) - (snapshotData.bookout.loanValue || 0)
  };

  // Group changes by type
  const changesByType = validation.changeLogs.reduce((groups: any, log) => {
    if (!groups[log.changeType]) groups[log.changeType] = [];
    groups[log.changeType].push(log);
    return groups;
  }, {});

  return {
    original: snapshotData,
    current: {
      bookout: currentBookout,
      accessories: currentBookout.accessories
    },
    differences: valueDifferences,
    changes: validation.changeLogs,
    changesByType,
    summary: {
      totalChanges: (changesByType.accessory_selected?.length || 0) + (changesByType.accessory_deselected?.length || 0),
      valueImpact: valueDifferences.cleanTradeIn, // Use trade-in as primary metric
      accessoryChanges: (changesByType.accessory_selected?.length || 0) + (changesByType.accessory_deselected?.length || 0)
    }
  };
}