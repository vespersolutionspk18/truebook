'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ValidationComparisonView from '@/components/ValidationComparisonView';
import { 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Search, 
  Package, 
  FileSearch,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Shield,
  BarChart3,
  Eye,
  GitCompare
} from 'lucide-react';

interface AIValidationComponentProps {
  vehicleUuid: string;
  onValidationComplete?: () => void;
}

interface ValidationSummary {
  total_accessories: number;
  confirmed_matches: number;
  partial_matches: number;
  not_found: number;
  requires_review: number;
  package_items: number;
  overall_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface AccessoryComparison {
  jd_power_accessory: {
    code: string;
    name: string;
    type: string;
    category: string;
    trade_value: number;
    retail_value: number;
    loan_value: number;
  };
  build_sheet_match: {
    matched_feature: string | null;
    feature_value: string | null;
  };
  validation_status: 'CONFIRMED' | 'PARTIAL_MATCH' | 'NOT_FOUND' | 'REQUIRES_REVIEW' | 'PACKAGE_ITEM';
  confidence_score: number;
  notes: string;
  value_assessment: 'APPROPRIATE' | 'HIGH' | 'LOW' | 'UNKNOWN';
  recommendations: string;
}

interface ValidationResult {
  summary: ValidationSummary;
  comparisons: AccessoryComparison[];
  insights: {
    missing_from_bookout: string[];
    potential_overvaluation: string[];
    potential_undervaluation: string[];
    trim_level_analysis: string;
  };
  auto_selection?: {
    applied: boolean;
    accessories_added?: number;
    accessories_removed?: number;
    total_accessories_changed?: number;
    final_selected_count?: number;
    total_value_impact?: any;
    revaluation_source?: string;
    reason?: string;
    error?: string;
    changes_detail?: {
      added?: string[];
      removed?: string[];
    };
    updated_bookout?: any;
  };
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'CONFIRMED':
      return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    case 'PARTIAL_MATCH':
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    case 'NOT_FOUND':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'REQUIRES_REVIEW':
      return <Search className="h-4 w-4 text-blue-600" />;
    case 'PACKAGE_ITEM':
      return <Package className="h-4 w-4 text-violet-600" />;
    default:
      return null;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'CONFIRMED':
      return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 whitespace-nowrap">
        <CheckCircle className="h-3 w-3 mr-1" />
        Confirmed
      </Badge>;
    case 'PARTIAL_MATCH':
      return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 whitespace-nowrap">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Partial Match
      </Badge>;
    case 'NOT_FOUND':
      return <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 whitespace-nowrap">
        <XCircle className="h-3 w-3 mr-1" />
        Not Found
      </Badge>;
    case 'REQUIRES_REVIEW':
      return <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 whitespace-nowrap">
        <Search className="h-3 w-3 mr-1" />
        Review Needed
      </Badge>;
    case 'PACKAGE_ITEM':
      return <Badge className="bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-50 whitespace-nowrap">
        <Package className="h-3 w-3 mr-1" />
        Package Item
      </Badge>;
    default:
      return <Badge variant="outline" className="whitespace-nowrap">{status}</Badge>;
  }
};

const getValueAssessmentBadge = (assessment: string) => {
  switch (assessment) {
    case 'APPROPRIATE':
      return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 whitespace-nowrap">
        <Shield className="h-3 w-3 mr-1" />
        Appropriate
      </Badge>;
    case 'HIGH':
      return <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 hover:text-red-700 whitespace-nowrap">
        <TrendingUp className="h-3 w-3 mr-1" />
        Overvalued
      </Badge>;
    case 'LOW':
      return <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 hover:text-blue-700 whitespace-nowrap">
        <TrendingDown className="h-3 w-3 mr-1" />
        Undervalued
      </Badge>;
    case 'UNKNOWN':
      return <Badge variant="outline" className="hover:bg-transparent hover:text-current whitespace-nowrap">
        <Eye className="h-3 w-3 mr-1" />
        Unknown
      </Badge>;
    default:
      return <Badge variant="outline" className="hover:bg-transparent hover:text-current whitespace-nowrap">{assessment}</Badge>;
  }
};

export default function AIValidationComponent({ vehicleUuid, onValidationComplete }: AIValidationComponentProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentValidationId, setCurrentValidationId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionOverrides, setSessionOverrides] = useState<Map<string, any>>(new Map());
  const [isApplyingSession, setIsApplyingSession] = useState(false);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [localOverrides, setLocalOverrides] = useState<Set<string>>(new Set());

  const loadSessionOverrides = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleUuid}/validation-session/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSessionDetails(data.session);
        
        // Create a map of overrides for easy lookup
        const overridesMap = new Map();
        data.session.overrides.forEach((override: any) => {
          overridesMap.set(override.accessoryCode, override);
        });
        setSessionOverrides(overridesMap);
        
        // Also update local overrides based on keepJdPower flag
        const localOverridesSet = new Set<string>();
        data.session.overrides.forEach((override: any) => {
          if (override.keepJdPower) {
            localOverridesSet.add(override.accessoryCode);
          }
        });
        setLocalOverrides(localOverridesSet);
      }
    } catch (err) {
      console.error('Failed to load session overrides:', err);
    }
  };

  const handleOverride = async (accessoryCode: string) => {
    if (!currentSessionId) return;
    
    try {
      const response = await fetch(`/api/vehicles/${vehicleUuid}/validation-session/${currentSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessoryCode })
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state
        const updatedOverrides = new Map(sessionOverrides);
        const existingOverride = updatedOverrides.get(accessoryCode);
        if (existingOverride) {
          updatedOverrides.set(accessoryCode, {
            ...existingOverride,
            keepJdPower: data.override.keepJdPower
          });
          setSessionOverrides(updatedOverrides);
        }
      } else {
        const error = await response.json();
        alert(`Failed to update override: ${error.error}`);
      }
    } catch (err) {
      console.error('Error updating override:', err);
      alert('Failed to update override');
    }
  };

  const handleApplyChanges = async () => {
    if (!validationResult) return;
    
    setIsApplyingSession(true);
    setError(null);
    
    try {
      // Get the vehicle data with bookouts
      const vehicleResponse = await fetch(`/api/vehicles/${vehicleUuid}`);
      if (!vehicleResponse.ok) {
        throw new Error('Failed to get vehicle data');
      }
      const vehicleData = await vehicleResponse.json();
      
      // Find the latest JD Power bookout
      const currentBookout = vehicleData.bookouts?.find((b: any) => b.provider === 'jdpower');
      
      if (!currentBookout) {
        throw new Error('No JD Power bookout found');
      }

      // Calculate which accessories should be selected
      const finalSelections = new Set<string>();
      const currentSelections = new Set<string>();
      
      // Track current selections
      currentBookout.accessories.forEach((acc: any) => {
        if (acc.isSelected) {
          currentSelections.add(acc.code);
          finalSelections.add(acc.code);
        }
      });

      console.log('Current selections:', Array.from(currentSelections));
      console.log('Overrides:', Array.from(localOverrides));

      // Apply AI recommendations (unless overridden)
      let addedCount = 0;
      let removedCount = 0;
      
      validationResult.comparisons.forEach((comp: any) => {
        const accessoryCode = comp.jd_power_accessory.code;
        const isOverridden = localOverrides.has(accessoryCode);
        const isCurrentlySelected = currentSelections.has(accessoryCode);
        
        if (!isOverridden) {
          // Follow AI recommendation
          if (comp.validation_status === 'CONFIRMED' || comp.validation_status === 'PARTIAL_MATCH') {
            if (!isCurrentlySelected) {
              finalSelections.add(accessoryCode);
              addedCount++;
              console.log(`Adding: ${accessoryCode} - ${comp.jd_power_accessory.name}`);
            }
          } else if (comp.validation_status === 'NOT_FOUND') {
            if (isCurrentlySelected) {
              finalSelections.delete(accessoryCode);
              removedCount++;
              console.log(`Removing: ${accessoryCode} - ${comp.jd_power_accessory.name}`);
            }
          }
        } else {
          console.log(`Overridden (keeping original): ${accessoryCode} - ${comp.jd_power_accessory.name}`);
        }
      });

      console.log(`Changes: ${addedCount} added, ${removedCount} removed`);
      console.log('Final selections:', Array.from(finalSelections));

      // Update the bookout with change tracking
      const updateResponse = await fetch(
        `/api/vehicles/${vehicleUuid}/bookout/${currentBookout.id}/accessories`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selectedAccessoryCodes: Array.from(finalSelections),
            changeTrackingValidationId: currentValidationId // Pass validation ID for change tracking
          })
        }
      );

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Failed to update bookout');
      }

      const updateResult = await updateResponse.json();
      console.log('Bookout updated:', updateResult);
      
      // Trigger parent component to refresh vehicle data
      if (onValidationComplete) {
        onValidationComplete();
      }
      
      // Show success message with details
      if (addedCount > 0 || removedCount > 0) {
        alert(`Bookout updated successfully!\n${addedCount} accessories added\n${removedCount} accessories removed`);
      } else {
        alert('No changes were made - all accessories are already correctly selected according to the build sheet.');
      }
      
      // Reset state
      setLocalOverrides(new Set());
      
      // Reload the validation to show updated comparison
      if (currentValidationId) {
        const validationResponse = await fetch(`/api/vehicles/${vehicleUuid}/ai-validations/${currentValidationId}`);
        if (validationResponse.ok) {
          const validationData = await validationResponse.json();
          if (validationData.validation?.outputData) {
            setValidationResult(validationData.validation.outputData);
          }
        }
      }
      
    } catch (err) {
      console.error('Error applying changes:', err);
      setError(err instanceof Error ? err.message : 'Failed to apply changes');
    } finally {
      setIsApplyingSession(false);
    }
  };

  const handleValidate = async () => {
    console.log('Validate button clicked for vehicle:', vehicleUuid);
    setIsValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      console.log('Making API request to:', `/api/vehicles/${vehicleUuid}/ai-validation`);
      const response = await fetch(`/api/vehicles/${vehicleUuid}/ai-validation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to validate accessories');
      }

      const data = await response.json();
      console.log('API Response data:', data);
      console.log('Setting validation result:', data.result);
      setValidationResult(data.result);
      setCurrentValidationId(data.validation_id);
      setCurrentSessionId(data.session_id);
      
      // Load session overrides if session was created
      if (data.session_id) {
        await loadSessionOverrides(data.session_id);
      }
    } catch (err) {
      console.error('Validation error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsValidating(false);
    }
  };

  // Load most recent validation result on component mount
  useEffect(() => {
    const loadMostRecentValidation = async () => {
      try {
        const response = await fetch(`/api/vehicles/${vehicleUuid}/ai-validations`);
        if (response.ok) {
          const data = await response.json();
          if (data.validations && data.validations.length > 0) {
            const mostRecent = data.validations[0]; // Already ordered by createdAt desc
            if (mostRecent.outputData) {
              setValidationResult(mostRecent.outputData);
              setCurrentValidationId(mostRecent.id);
              
              // Check if there's a session for this validation
              if (mostRecent.outputData.session?.id) {
                setCurrentSessionId(mostRecent.outputData.session.id);
                await loadSessionOverrides(mostRecent.outputData.session.id);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load most recent validation:', err);
      }
    };
    
    loadMostRecentValidation();
  }, [vehicleUuid]);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'HIGH': return 'text-green-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };


  return (
    <div className="space-y-6">
      {/* Validation Controls */}
      <div className="flex items-center justify-between">
        <div>
          {sessionDetails && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">{sessionDetails.summary.totalChanges}</span> changes recommended
              {sessionDetails.summary.keepingJdPower > 0 && (
                <span className="ml-2">
                  ({sessionDetails.summary.keepingJdPower} overridden)
                </span>
              )}
              {sessionDetails.isExpired && (
                <Badge variant="destructive" className="ml-2">Session Expired</Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {validationResult && (
            <Button 
              onClick={handleApplyChanges} 
              disabled={isApplyingSession}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isApplyingSession ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating Bookout...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Update Bookout
                </>
              )}
            </Button>
          )}
          <Button 
            onClick={handleValidate} 
            disabled={isValidating}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Validating...
              </>
            ) : (
              <>
                <FileSearch className="h-4 w-4 mr-2" />
                Validate
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}


      {/* Main Content - Tabbed Interface */}
      {(validationResult || currentValidationId) && (
        <Tabs defaultValue="results" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="results" disabled={!validationResult}>Validation Results</TabsTrigger>
            <TabsTrigger value="comparison" disabled={!currentValidationId}>Before/After Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="space-y-6">
            {validationResult && (
              <div className="space-y-6">

          {/* Summary Section */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Validation Summary</h4>
              <Badge 
                variant={validationResult.summary.overall_confidence === 'HIGH' ? 'default' : 
                        validationResult.summary.overall_confidence === 'MEDIUM' ? 'secondary' : 'destructive'}
              >
                {validationResult.summary.overall_confidence} Confidence
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {validationResult.summary.total_accessories}
                </div>
                <div className="text-xs font-medium text-gray-500 uppercase">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {validationResult.summary.confirmed_matches}
                </div>
                <div className="text-xs font-medium text-gray-500 uppercase">Confirmed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {validationResult.summary.partial_matches}
                </div>
                <div className="text-xs font-medium text-gray-500 uppercase">Partial</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {validationResult.summary.not_found}
                </div>
                <div className="text-xs font-medium text-gray-500 uppercase">Not Found</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {validationResult.summary.requires_review}
                </div>
                <div className="text-xs font-medium text-gray-500 uppercase">Review</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {validationResult.summary.package_items}
                </div>
                <div className="text-xs font-medium text-gray-500 uppercase">Package</div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Accuracy Score</span>
                <span className="text-lg font-bold text-red-600">
                  {Math.round(((validationResult.summary.confirmed_matches + validationResult.summary.partial_matches) / 
                    validationResult.summary.total_accessories) * 100)}%
                </span>
              </div>
              <Progress 
                value={((validationResult.summary.confirmed_matches + validationResult.summary.partial_matches) / 
                  validationResult.summary.total_accessories) * 100} 
                className="h-2"
              />
            </div>
          </div>

          {/* Detailed Comparison */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
            <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Detailed Comparison</h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-red-50 dark:bg-red-950">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        JD Power Bookout
                      </div>
                    </TableHead>
                    <TableHead className="bg-green-50 dark:bg-green-950">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        Build Sheet Match
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Value Assessment</TableHead>
                    <TableHead>Values ($)</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationResult.comparisons.map((comparison, index) => (
                    <TableRow key={index}>
                      <TableCell className="bg-red-50/50 dark:bg-red-950/50 py-2 px-3">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                            {comparison.jd_power_accessory.name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs h-5 px-1">
                              {comparison.jd_power_accessory.code}
                            </Badge>
                            {comparison.jd_power_accessory.category && (
                              <Badge variant="secondary" className="text-xs h-5 px-1">
                                {comparison.jd_power_accessory.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="bg-green-50/50 dark:bg-green-950/50 py-2 px-3">
                        {comparison.build_sheet_match.matched_feature ? (
                          <div>
                            <div className="font-medium text-green-700 dark:text-green-400 text-sm">
                              {comparison.build_sheet_match.matched_feature}
                            </div>
                            {comparison.build_sheet_match.feature_value && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {comparison.build_sheet_match.feature_value}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-gray-500 dark:text-gray-400 italic text-sm">
                            No match found
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-2 px-3">
                        {getStatusBadge(comparison.validation_status)}
                      </TableCell>
                      <TableCell className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <Progress value={comparison.confidence_score} className="h-1.5 w-12" />
                          <span className="text-xs">{comparison.confidence_score}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-3">
                        {getValueAssessmentBadge(comparison.value_assessment)}
                      </TableCell>
                      <TableCell className="py-2 px-3">
                        <div className="text-xs space-y-0.5">
                          <div>T: ${comparison.jd_power_accessory.trade_value || 0}</div>
                          <div>R: ${comparison.jd_power_accessory.retail_value || 0}</div>
                          <div>L: ${comparison.jd_power_accessory.loan_value || 0}</div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs py-2 px-3">
                        <div className="space-y-2">
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {comparison.notes}
                          </div>
                          {comparison.recommendations && (
                            <div className="text-xs text-red-600 dark:text-red-400">
                              {comparison.recommendations}
                            </div>
                          )}
                          {(() => {
                            // Only show override button if build sheet would change the selection
                            const isNotFound = comparison.validation_status === 'NOT_FOUND';
                            const isConfirmed = comparison.validation_status === 'CONFIRMED' || comparison.validation_status === 'PARTIAL_MATCH';
                            
                            if (!isNotFound && !isConfirmed) {
                              return null; // No change recommended
                            }

                            const isOverridden = localOverrides.has(comparison.jd_power_accessory.code);

                            return (
                              <Button
                                size="sm"
                                variant={isOverridden ? "default" : "outline"}
                                onClick={() => {
                                  const newOverrides = new Set(localOverrides);
                                  if (isOverridden) {
                                    newOverrides.delete(comparison.jd_power_accessory.code);
                                  } else {
                                    newOverrides.add(comparison.jd_power_accessory.code);
                                  }
                                  setLocalOverrides(newOverrides);
                                  if (currentSessionId) {
                                    handleOverride(comparison.jd_power_accessory.code);
                                  }
                                }}
                                className="h-6 text-xs px-2"
                              >
                                {isOverridden ? 'Overridden' : 'Override'}
                              </Button>
                            );
                          })()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* AI Market Intelligence */}
          {validationResult.insights && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
              <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-red-600" />
                Market Intelligence
              </h4>
              
              {validationResult.insights.trim_level_analysis && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg mb-4">
                  <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-red-600" />
                    Vehicle Assessment
                  </h5>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {validationResult.insights.trim_level_analysis}
                  </p>
                </div>
              )}

              <div className="grid md:grid-cols-3 gap-4">
                {validationResult.insights.missing_from_bookout.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200 dark:border-red-800">
                    <h5 className="font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Unvalued Features
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Features present but not reflected in valuation</p>
                    <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
                      {validationResult.insights.missing_from_bookout.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {validationResult.insights.potential_overvaluation.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                    <h5 className="font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Pricing Concerns
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">May be priced above market value</p>
                    <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
                      {validationResult.insights.potential_overvaluation.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {validationResult.insights.potential_undervaluation.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <h5 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Value Opportunities
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">May warrant higher market pricing</p>
                    <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
                      {validationResult.insights.potential_undervaluation.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

              </div>
            )}
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            {currentValidationId && (
              <ValidationComparisonView 
                vehicleUuid={vehicleUuid} 
                validationId={currentValidationId} 
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}