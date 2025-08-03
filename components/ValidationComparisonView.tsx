'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  DollarSign,
  Zap
} from 'lucide-react';

interface ValidationComparisonViewProps {
  vehicleUuid: string;
  validationId: string;
}

interface ComparisonData {
  validation: {
    id: string;
    provider: string;
    validationType: string;
    createdAt: string;
    outputData: any;
  };
  original: {
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
  };
  current: {
    bookout: any;
    accessories: any[];
  };
  differences: {
    cleanTradeIn: number;
    cleanRetail: number;
    loanValue: number;
  };
  changes: {
    total: number;
    byType: any;
    timeline: any[];
  };
  summary: {
    totalChanges: number;
    valueImpact: number;
    accessoryChanges: number;
    hasSnapshot: boolean;
    snapshotCreatedAt: string;
    significantChanges: boolean;
  };
}

export default function ValidationComparisonView({ vehicleUuid, validationId }: ValidationComparisonViewProps) {
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchComparisonData();
  }, [vehicleUuid, validationId]);

  const fetchComparisonData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/vehicles/${vehicleUuid}/ai-validation/${validationId}/comparison`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch comparison data');
      }

      const data = await response.json();
      setComparisonData(data);
    } catch (err) {
      console.error('Error fetching comparison data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!comparisonData || !confirm('Are you sure you want to restore the bookout to its original state? This will undo all changes made during validation.')) {
      return;
    }

    try {
      setIsRestoring(true);
      const response = await fetch(`/api/vehicles/${vehicleUuid}/ai-validation/${validationId}/comparison`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to restore bookout');
      }

      // Refresh the page to show restored state
      window.location.reload();
    } catch (err) {
      console.error('Error restoring bookout:', err);
      alert('Failed to restore bookout: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsRestoring(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatValueChange = (difference: number) => {
    if (difference === 0) return null;
    
    const isPositive = difference > 0;
    return (
      <span className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isPositive ? '+' : ''}{formatCurrency(difference)}
      </span>
    );
  };

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'accessory_selected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'accessory_deselected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'value_updated':
        return <DollarSign className="h-4 w-4 text-blue-600" />;
      case 'bookout_revalued':
        return <Zap className="h-4 w-4 text-purple-600" />;
      default:
        return <Eye className="h-4 w-4 text-gray-600" />;
    }
  };

  const getChangeTypeLabel = (changeType: string) => {
    switch (changeType) {
      case 'accessory_selected': return 'Accessory Selected';
      case 'accessory_deselected': return 'Accessory Deselected';
      case 'value_updated': return 'Value Updated';
      case 'bookout_revalued': return 'Bookout Revalued';
      default: return changeType;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-gray-600">Loading comparison data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!comparisonData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>No comparison data available</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with restore option */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Validation Comparison</h3>
          <p className="text-sm text-gray-600">
            {comparisonData.validation.provider} validation from {new Date(comparisonData.validation.createdAt).toLocaleString()}
          </p>
        </div>
        {comparisonData.summary.hasSnapshot && comparisonData.summary.significantChanges && (
          <Button
            onClick={handleRestore}
            disabled={isRestoring}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            {isRestoring ? 'Restoring...' : 'Restore Original'}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Changes</p>
                <p className="text-2xl font-bold">{comparisonData.summary.totalChanges}</p>
              </div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Accessories Changed</p>
                <p className="text-2xl font-bold text-blue-600">{comparisonData.summary.accessoryChanges}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Value Impact</p>
                <p className={`text-2xl font-bold ${comparisonData.summary.valueImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(comparisonData.summary.valueImpact)}
                </p>
              </div>
              {comparisonData.summary.valueImpact >= 0 ? 
                <TrendingUp className="h-8 w-8 text-green-400" /> : 
                <TrendingDown className="h-8 w-8 text-red-400" />
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Snapshot</p>
                <p className="text-sm text-green-600">
                  {comparisonData.summary.hasSnapshot ? 'Available' : 'None'}
                </p>
              </div>
              <RotateCcw className={`h-8 w-8 ${comparisonData.summary.hasSnapshot ? 'text-green-400' : 'text-gray-400'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Comparison View */}
      <Tabs defaultValue="values" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="values">Value Comparison</TabsTrigger>
          <TabsTrigger value="accessories">Accessory Changes</TabsTrigger>
        </TabsList>

        <TabsContent value="values" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Before vs After Values</CardTitle>
              <CardDescription>
                Comparison of key bookout values before and after AI validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Clean Trade-In */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Clean Trade-In</p>
                      <p className="text-sm text-gray-500">Before</p>
                      <p className="text-lg font-bold">{formatCurrency(comparisonData.original.metadata.totalValues.cleanTradeIn)}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Clean Trade-In</p>
                      <p className="text-sm text-gray-500">After</p>
                      <p className="text-lg font-bold">{formatCurrency(comparisonData.current.bookout.cleanTradeIn || 0)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {formatValueChange(comparisonData.differences.cleanTradeIn)}
                  </div>
                </div>

                {/* Clean Retail */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Clean Retail</p>
                      <p className="text-sm text-gray-500">Before</p>
                      <p className="text-lg font-bold">{formatCurrency(comparisonData.original.metadata.totalValues.cleanRetail)}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Clean Retail</p>
                      <p className="text-sm text-gray-500">After</p>
                      <p className="text-lg font-bold">{formatCurrency(comparisonData.current.bookout.cleanRetail || 0)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {formatValueChange(comparisonData.differences.cleanRetail)}
                  </div>
                </div>

                {/* Loan Value */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Loan Value</p>
                      <p className="text-sm text-gray-500">Before</p>
                      <p className="text-lg font-bold">{formatCurrency(comparisonData.original.metadata.totalValues.loanValue)}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Loan Value</p>
                      <p className="text-sm text-gray-500">After</p>
                      <p className="text-lg font-bold">{formatCurrency(comparisonData.current.bookout.loanValue || 0)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {formatValueChange(comparisonData.differences.loanValue)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accessories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Accessory Selection Comparison</CardTitle>
              <CardDescription>
                Side-by-side comparison of accessory selections before and after validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Original Bookout Accessories */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Original Selection
                  </h4>
                  <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                      {comparisonData.original.accessories
                        .filter((acc: any) => acc.isSelected)
                        .map((accessory: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                            <div>
                              <p className="font-medium text-sm">{accessory.name}</p>
                              <p className="text-xs text-gray-600">Code: {accessory.code}</p>
                              {accessory.category && (
                                <div className="mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {accessory.category}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <div className="text-right text-xs">
                              {accessory.isFactoryInstalled && (
                                <Badge className="bg-blue-100 text-blue-800 text-xs">Factory</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      {comparisonData.original.accessories.filter((acc: any) => acc.isSelected).length === 0 && (
                        <p className="text-center text-gray-500 py-4 text-sm">No accessories were originally selected</p>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    Total: {comparisonData.original.accessories.filter((acc: any) => acc.isSelected).length} accessories
                  </div>
                </div>

                {/* Current Bookout Accessories */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Updated Selection
                  </h4>
                  <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                      {comparisonData.current.accessories
                        .filter((acc: any) => acc.isSelected)
                        .map((accessory: any, index: number) => {
                          const wasOriginallySelected = comparisonData.original.accessories
                            .find((orig: any) => orig.code === accessory.code)?.isSelected;
                          const isNewSelection = !wasOriginallySelected;
                          
                          return (
                            <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                              <div>
                                <div className="font-medium text-sm flex items-center gap-2">
                                  <span>{accessory.name}</span>
                                  {isNewSelection && (
                                    <Badge className="bg-green-100 text-green-800 text-xs">NEW</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600">Code: {accessory.code}</p>
                                {accessory.category && (
                                  <div className="mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {accessory.category}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                              <div className="text-right text-xs">
                                {accessory.isFactoryInstalled && (
                                  <Badge className="bg-blue-100 text-blue-800 text-xs">Factory</Badge>
                                )}
                                {accessory.cleanTradeAdj && accessory.cleanTradeAdj > 0 && (
                                  <p className="text-green-600 font-medium">+${accessory.cleanTradeAdj}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      {comparisonData.current.accessories.filter((acc: any) => acc.isSelected).length === 0 && (
                        <p className="text-center text-gray-500 py-4 text-sm">No accessories are currently selected</p>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    Total: {comparisonData.current.accessories.filter((acc: any) => acc.isSelected).length} accessories
                  </div>
                </div>
              </div>

              {/* Debug Info */}
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded text-xs">
                <p><strong>Debug:</strong> Changes found: {comparisonData.changes.total}</p>
                <p>Selected changes: {comparisonData.changes.byType.accessory_selected?.length || 0}</p>
                <p>Deselected changes: {comparisonData.changes.byType.accessory_deselected?.length || 0}</p>
                <p>Original selected: {comparisonData.original.accessories.filter((acc: any) => acc.isSelected).length}</p>
                <p>Current selected: {comparisonData.current.accessories.filter((acc: any) => acc.isSelected).length}</p>
              </div>

              {/* Changes Summary */}
              {(comparisonData.changes.byType.accessory_selected || comparisonData.changes.byType.accessory_deselected) && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Change Summary</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {comparisonData.changes.byType.accessory_selected && (
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">
                          ✓ {comparisonData.changes.byType.accessory_selected.length} accessories added
                        </p>
                        <ul className="text-xs text-gray-600 mt-1 space-y-1">
                          {comparisonData.changes.byType.accessory_selected.map((change: any, index: number) => (
                            <li key={index}>• {change.entityCode}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {comparisonData.changes.byType.accessory_deselected && (
                      <div>
                        <p className="text-sm font-medium text-red-700 dark:text-red-400">
                          ✗ {comparisonData.changes.byType.accessory_deselected.length} accessories removed
                        </p>
                        <ul className="text-xs text-gray-600 mt-1 space-y-1">
                          {comparisonData.changes.byType.accessory_deselected.map((change: any, index: number) => (
                            <li key={index}>• {change.entityCode}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}