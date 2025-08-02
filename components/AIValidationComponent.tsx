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
  const [overriddenAccessories, setOverriddenAccessories] = useState<Set<string>>(new Set());
  const [currentBookout, setCurrentBookout] = useState<any>(null);
  
  // Debug mounting/unmounting
  useEffect(() => {
    console.log('AIValidationComponent MOUNTED');
    return () => {
      console.log('AIValidationComponent UNMOUNTED - state will be lost!');
    };
  }, []);

  const loadSessionOverrides = async (sessionId: string) => {
    try {
      console.log('Loading session overrides for:', sessionId);
      const response = await fetch(`/api/vehicles/${vehicleUuid}/validation-session/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Session details loaded:', data.session);
        setSessionDetails(data.session);
        
        // Create a map of overrides for easy lookup
        const overridesMap = new Map();
        data.session.overrides.forEach((override: any) => {
          overridesMap.set(override.accessoryCode, override);
        });
        setSessionOverrides(overridesMap);
        
        // Load overrides - accessories that user wants to keep despite AI recommendation
        const overriddenSet = new Set<string>();
        data.session.overrides.forEach((override: any) => {
          // If keepJdPower is true, it means user wants to keep the original selection
          // despite what AI recommends
          if (override.keepJdPower) {
            overriddenSet.add(override.accessoryCode);
          }
        });
        setOverriddenAccessories(overriddenSet);
        
        console.log('Loaded overrides:', {
          totalOverrides: data.session.overrides.length,
          keepingJdPower: overriddenSet.size,
          overrideCodes: Array.from(overriddenSet)
        });
      }
    } catch (err) {
      console.error('Failed to load session overrides:', err);
    }
  };

  const handleOverride = async (accessoryCode: string) => {
    if (!currentSessionId) {
      console.error('No session ID available');
      return;
    }
    
    try {
      const response = await fetch(`/api/vehicles/${vehicleUuid}/validation-session/${currentSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessoryCode })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Override response:', data);
        
        // Update local state
        const updatedOverrides = new Map(sessionOverrides);
        
        // Handle both existing and new overrides
        updatedOverrides.set(accessoryCode, {
          accessoryCode: data.override.accessoryCode,
          accessoryName: data.override.accessoryName,
          keepJdPower: data.override.keepJdPower,
          aiRecommendation: data.override.aiRecommendation || 'NO_CHANGE'
        });
        setSessionOverrides(updatedOverrides);
        
        // Update the overridden accessories set
        const newOverriddenSet = new Set(overriddenAccessories);
        if (data.override.keepJdPower) {
          newOverriddenSet.add(accessoryCode);
        } else {
          newOverriddenSet.delete(accessoryCode);
        }
        setOverriddenAccessories(newOverriddenSet);
        
        console.log('Updated overrides:', {
          accessoryCode,
          keepJdPower: data.override.keepJdPower,
          totalOverrides: newOverriddenSet.size
        });
        
        console.log(`Override updated for ${accessoryCode}: keepJdPower = ${data.override.keepJdPower}`);
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
    if (!currentSessionId) {
      setError('No validation session active');
      return;
    }
    
    setIsApplyingSession(true);
    setError(null);
    
    try {
      // Use the proper apply session endpoint
      const response = await fetch(
        `/api/vehicles/${vehicleUuid}/validation-session/${currentSessionId}/apply`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to apply session');
      }

      const result = await response.json();
      console.log('Session applied:', result);
      
      // Show detailed success message
      const changes = result.changes;
      if (changes.totalChanges > 0) {
        let message = `Bookout updated successfully!\n\n`;
        if (changes.details && changes.details.length > 0) {
          message += 'Changes made:\n';
          changes.details.forEach((change: any) => {
            message += `• ${change.name}: ${change.action}\n`;
          });
        }
        alert(message);
      } else {
        alert('No changes were made - all accessories are already as recommended.');
      }
      
      // Trigger parent component to refresh vehicle data
      if (onValidationComplete) {
        onValidationComplete();
      }
      
      // Don't clear validation state - keep it visible
      // Just mark the session as applied
      setSessionDetails(prev => prev ? { ...prev, status: 'applied' } : null);
      
      // Reload bookout data to show updated values
      await loadVehicleBookout();
      
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
      console.log('Validation comparisons:', data.result?.comparisons?.length);
      console.log('First comparison:', data.result?.comparisons?.[0]);
      setValidationResult(data.result);
      setCurrentValidationId(data.validation_id);
      setCurrentSessionId(data.session_id);
      
      // Load session overrides if session was created
      if (data.session_id) {
        await loadSessionOverrides(data.session_id);
      }
      
      // Reload bookout data to ensure we have current state
      await loadVehicleBookout();
    } catch (err) {
      console.error('Validation error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsValidating(false);
    }
  };

  // Load vehicle bookout data
  const loadVehicleBookout = async () => {
    try {
      console.log('Loading vehicle bookout data...');
      const vehicleResponse = await fetch(`/api/vehicles/${vehicleUuid}`);
      if (vehicleResponse.ok) {
        const vehicleData = await vehicleResponse.json();
        const bookout = vehicleData.bookouts?.find((b: any) => b.provider === 'jdpower');
        console.log('Found JD Power bookout:', bookout);
        if (bookout) {
          console.log('Setting currentBookout with', bookout.accessories?.length, 'accessories');
          setCurrentBookout(bookout);
        }
      }
    } catch (err) {
      console.error('Failed to load vehicle bookout:', err);
    }
  };

  // Load most recent validation result on component mount
  useEffect(() => {
    const loadMostRecentValidation = async () => {
      console.log('useEffect: Loading most recent validation for vehicle:', vehicleUuid);
      try {
        // Load vehicle bookout first
        await loadVehicleBookout();
        
        const response = await fetch(`/api/vehicles/${vehicleUuid}/ai-validations`);
        console.log('useEffect: AI validations response:', response.ok);
        if (response.ok) {
          const data = await response.json();
          console.log('useEffect: Found validations:', data.validations?.length);
          if (data.validations && data.validations.length > 0) {
            const mostRecent = data.validations[0]; // Already ordered by createdAt desc
            console.log('useEffect: Most recent validation:', mostRecent);
            
            if (mostRecent.outputData) {
              console.log('Setting validation result from DB');
              setValidationResult(mostRecent.outputData);
              setCurrentValidationId(mostRecent.id);
              
              // Check if there's a session for this validation
              // First check in outputData (for backwards compatibility)
              if (mostRecent.outputData.session?.id) {
                console.log('useEffect: Loading session overrides from outputData:', mostRecent.outputData.session.id);
                setCurrentSessionId(mostRecent.outputData.session.id);
                await loadSessionOverrides(mostRecent.outputData.session.id);
              } 
              // Then check in sessions array (new structure)
              else if (mostRecent.sessions && mostRecent.sessions.length > 0) {
                const latestSession = mostRecent.sessions[0];
                if (latestSession.status === 'pending' && new Date(latestSession.expiresAt) > new Date()) {
                  console.log('useEffect: Loading session from sessions array:', latestSession.id);
                  setCurrentSessionId(latestSession.id);
                  await loadSessionOverrides(latestSession.id);
                }
              }
            }
          } else {
            console.log('No validations found for this vehicle');
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
          {!validationResult && !isValidating && (
            <div className="text-sm text-gray-500">
              Click "Validate" to check accessories against build sheet
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {validationResult && currentSessionId && (
            <Button 
              onClick={handleApplyChanges} 
              disabled={isApplyingSession || sessionDetails?.isExpired}
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
                {validationResult ? 'Re-validate' : 'Validate'}
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
                            // ALWAYS SHOW THE OVERRIDE BUTTON FOR EVERY ACCESSORY
                            const isOverridden = overriddenAccessories.has(comparison.jd_power_accessory.code);

                            return (
                              <Button
                                size="sm"
                                variant={isOverridden ? "default" : "outline"}
                                onClick={() => {
                                  if (!currentSessionId) {
                                    alert('No validation session active. Please run validation first.');
                                    return;
                                  }
                                  handleOverride(comparison.jd_power_accessory.code);
                                }}
                                className="h-6 text-xs px-2"
                                disabled={!currentSessionId}
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