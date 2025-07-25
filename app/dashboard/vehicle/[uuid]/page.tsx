'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { NeoVinDisplay } from '@/components/ui/neovin-display';

interface VehiclePair {
  property: string;
  value: string;
}

interface BookoutAccessory {
  id: string;
  code: string;
  name: string;
  type?: string | null;
  category?: string | null;
  msrp?: number | null;
  cleanTradeAdj?: number | null;
  averageTradeAdj?: number | null;
  roughTradeAdj?: number | null;
  cleanRetailAdj?: number | null;
  loanAdj?: number | null;
  includesCode?: string | null;
  excludesCode?: string | null;
  isFactoryInstalled: boolean;
}

interface Bookout {
  id: string;
  provider: string;
  mileage?: number | null;
  
  // Vehicle details
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  bodyStyle?: string | null;
  drivetrain?: string | null;
  engine?: string | null;
  transmission?: string | null;
  fuelType?: string | null;
  
  // Base values
  baseCleanTradeIn?: number | null;
  baseAverageTradeIn?: number | null;
  baseRoughTradeIn?: number | null;
  baseCleanRetail?: number | null;
  baseLoanValue?: number | null;
  
  // Adjusted values
  cleanTradeIn?: number | null;
  averageTradeIn?: number | null;
  roughTradeIn?: number | null;
  cleanRetail?: number | null;
  loanValue?: number | null;
  
  // Mileage data
  mileageAdjustment?: number | null;
  averageMileage?: number | null;
  maxMileageAdj?: number | null;
  minMileageAdj?: number | null;
  
  // ACCESSORIES - THE FUCKING ACCESSORIES!
  accessories?: BookoutAccessory[];
  
  // Other data
  ucgVehicleId?: string | null;
  requestId?: string | null;
  rawData?: any;
  
  createdAt: string;
}

interface VehicleDetails {
  uuid: string;
  vin: string;
  mileage?: number | null;
  vehiclePairs: VehiclePair[];
  createdAt: string;
  bookouts?: Bookout[];
  neoVin?: {
    id: string;
    vin: string;
    year?: number;
    make?: string;
    model?: string;
    [key: string]: unknown;
  };
}

export default function VehicleDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<VehicleDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingNeoVin, setIsLoadingNeoVin] = useState(false);
  const [neoVinError, setNeoVinError] = useState<string | null>(null);
  const [mileage, setMileage] = useState<string>('');
  const [isSavingMileage, setIsSavingMileage] = useState(false);
  const mileageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoadingBookout, setIsLoadingBookout] = useState(false);
  const [bookoutError, setBookoutError] = useState<string | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);


  const handleDecodeVIN = async () => {
    if (!vehicle?.uuid) return;
    
    setIsLoadingNeoVin(true);
    setNeoVinError(null);
    
    try {
      const response = await fetch(`/api/vehicles/${vehicle.uuid}/neovin`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to decode VIN');
      }

      const { neoVin } = await response.json();
      console.log('NeoVin data received:', neoVin);
      
      // Update the vehicle state with the new NeoVin data
      setVehicle(prevVehicle => ({
        ...prevVehicle!,
        neoVin
      }));
    } catch (error) {
      console.error('Error decoding VIN:', error);
      setNeoVinError(error instanceof Error ? error.message : 'Failed to decode VIN');
    } finally {
      setIsLoadingNeoVin(false);
    }
  };

  const handleCreateBookout = async (provider: string) => {
    if (provider !== 'jdpower') return; // Only handle JD Power for now
    
    if (!vehicle?.uuid) return;
    
    setIsLoadingBookout(true);
    setBookoutError(null);
    
    try {
      const response = await fetch(`/api/vehicles/${vehicle.uuid}/bookout/jdpower`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          region: 1 // Default to Eastern region, can be made configurable
        }),
      });

      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);

      if (!response.ok) {
        let errorMessage = 'Failed to create bookout';
        let errorDetails = '';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details || '';
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
      }

      if (!responseText) {
        throw new Error('Empty response from server');
      }

      const data = JSON.parse(responseText);
      console.log('New bookout created:', data);
      
      // Refresh vehicle data to get the new bookout
      const vehicleResponse = await fetch(`/api/vehicles/${vehicle.uuid}`);
      if (vehicleResponse.ok) {
        const updatedVehicle = await vehicleResponse.json();
        setVehicle(updatedVehicle);
        setMileage(updatedVehicle.mileage?.toString() || '');
        // Expand the JD Power section to show the new bookout
        setExpandedProvider('jdpower');
      }
    } catch (error) {
      console.error('Error creating bookout:', error);
      setBookoutError(error instanceof Error ? error.message : 'Failed to create bookout');
    } finally {
      setIsLoadingBookout(false);
    }
  };

  const getLatestBookout = (provider: string) => {
    const bookout = vehicle?.bookouts?.find(b => b.provider === provider);
    if (bookout && provider === 'jdpower') {
      console.log('JD Power bookout:', bookout);
      console.log('Accessories:', bookout.accessories);
      console.log('Accessories length:', bookout.accessories?.length);
    }
    return bookout;
  };

  useEffect(() => {
    const fetchVehicleDetails = async () => {
      try {
        const response = await fetch(`/api/vehicles/${params.uuid}?include=neovin`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Vehicle not found');
          }
          if (response.status === 401) {
            throw new Error('You must be logged in to view vehicle details');
          }
          throw new Error('Failed to fetch vehicle details');
        }
        const data = await response.json();
        console.log('Vehicle data loaded:', data);
        setVehicle(data);
        setMileage(data.mileage?.toString() || '');

        // Log VIN, Model Year, and Make
        const modelYear = data.vehiclePairs.find((pair: VehiclePair) => pair.property === 'Model Year')?.value || 'N/A';
        const make = data.vehiclePairs.find((pair: VehiclePair) => pair.property === 'Make')?.value || 'N/A';
        console.log('VIN:', data.vin);
        console.log('data-year:', modelYear);
        console.log('data-make:', make);
      } catch (error) {
        console.error('Error fetching vehicle details:', error);
        setVehicle(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.uuid) {
      fetchVehicleDetails();
    }
  }, [params.uuid]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (mileageTimeoutRef.current) {
        clearTimeout(mileageTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading vehicle details...</p>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p>Vehicle not found</p>
        <Button onClick={() => window.history.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-screen overflow-y-auto pb-6">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-gray-900">Truebook</Link>
        <span className="text-gray-400">/</span>
        <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
        <span className="text-gray-400">/</span>
        <Link href="/dashboard/saved-vehicles" className="hover:text-gray-900">Inventory</Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900">{vehicle.vin}</span>
      </nav>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Vehicle Details</h2>
          <p className="text-sm text-muted-foreground">VIN: {vehicle.vin}</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2">
            <label htmlFor="mileage" className="text-sm font-medium">Mileage:</label>
            <Input
              id="mileage"
              type="number"
              value={mileage}
              onChange={(e) => {
                const value = e.target.value;
                setMileage(value);
                
                // Clear existing timeout
                if (mileageTimeoutRef.current) {
                  clearTimeout(mileageTimeoutRef.current);
                }
                
                // Set new timeout for auto-save
                mileageTimeoutRef.current = setTimeout(async () => {
                  if (vehicle && value !== vehicle.mileage?.toString()) {
                    setIsSavingMileage(true);
                    try {
                      const response = await fetch(`/api/vehicles/${vehicle.uuid}`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          mileage: value ? parseInt(value, 10) : null
                        }),
                      });
                      
                      if (!response.ok) {
                        const errorText = await response.text();
                        console.error('API Error:', response.status, errorText);
                        throw new Error(`Failed to update mileage: ${response.status} ${errorText}`);
                      }
                      
                      const updatedVehicle = await response.json();
                      setVehicle(prev => prev ? { ...prev, mileage: updatedVehicle.mileage } : null);
                    } catch (error) {
                      console.error('Error updating mileage:', error);
                      // Revert to previous value on error
                      setMileage(vehicle.mileage?.toString() || '');
                    } finally {
                      setIsSavingMileage(false);
                    }
                  }
                }, 1000); // 1 second debounce
              }}
              placeholder="Miles"
              className="w-20 h-8 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              disabled={isSavingMileage}
            />
            {isSavingMileage && <span className="text-xs text-muted-foreground">Saving...</span>}
          </div>
          <Button
            onClick={() => setIsDeleteDialogOpen(true)}
            variant="destructive"
            disabled={isDeleting}
            size="sm"
            className="h-8"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="vehicle-info" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vehicle-info">Vehicle Information</TabsTrigger>
          <TabsTrigger value="build-sheet">Build Sheet</TabsTrigger>
          <TabsTrigger value="ai-comparison">AI Comparison</TabsTrigger>
          <TabsTrigger value="bookout">Bookout</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicle-info">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[calc(100vh-370px)] overflow-y-auto scrollbar-hide">
                <div className="grid gap-4">
                  {vehicle.vehiclePairs
                    .filter(pair => pair.value && pair.value.trim() !== '')
                    .map((pair, index) => (
                      <div key={index} className="grid grid-cols-2 gap-4 border-b pb-2">
                        <p className="text-sm font-medium text-muted-foreground">{pair.property}</p>
                        <p className="text-sm">{pair.value}</p>
                      </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="build-sheet">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Build Sheet</CardTitle>
              {!vehicle.neoVin && (
                <Button 
                  variant="default" 
                  size="sm" 
                  className="ml-2"
                  onClick={handleDecodeVIN}
                  disabled={isLoadingNeoVin}
                >
                  {isLoadingNeoVin ? 'Decoding...' : 'Decode VIN'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {neoVinError ? (
                <p className="text-sm text-red-500">{neoVinError}</p>
              ) : vehicle.neoVin ? (
                <NeoVinDisplay data={vehicle.neoVin} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No build sheet data available. Click "Decode VIN" to fetch vehicle specifications.
                  </p>
                  <div className="text-sm text-muted-foreground">
                    <p>VIN: {vehicle.vin}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-comparison">
          <Card>
            <CardHeader>
              <CardTitle>AI Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">AI comparison feature coming soon.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookout" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bookout</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-4">
                      <div className="font-medium">JD Power</div>
                      {getLatestBookout('jdpower') && (
                        <span className="text-xs text-muted-foreground">
                          Last bookout: {new Date(getLatestBookout('jdpower')!.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getLatestBookout('jdpower') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedProvider(expandedProvider === 'jdpower' ? null : 'jdpower')}
                        >
                          {expandedProvider === 'jdpower' ? 'Hide' : 'Show'}
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCreateBookout('jdpower')}
                        disabled={!mileage || isLoadingBookout}
                      >
                        {isLoadingBookout ? 'Creating...' : 'Create Bookout'}
                      </Button>
                    </div>
                  </div>
                  
                  {bookoutError && (
                    <div className="border-t p-4 bg-red-50 dark:bg-red-900/20">
                      <p className="text-sm text-red-600 dark:text-red-400">Error: {bookoutError}</p>
                    </div>
                  )}
                  
                  {expandedProvider === 'jdpower' && getLatestBookout('jdpower') && (
                    <div className="border-t bg-gray-50 dark:bg-gray-900 space-y-4">
                      {/* Vehicle Details */}
                      <div className="p-4 border-b">
                        <h4 className="font-semibold mb-2">Vehicle Details</h4>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Year:</span> {getLatestBookout('jdpower')!.year}</div>
                          <div><span className="text-muted-foreground">Make:</span> {getLatestBookout('jdpower')!.make}</div>
                          <div><span className="text-muted-foreground">Model:</span> {getLatestBookout('jdpower')!.model}</div>
                          <div><span className="text-muted-foreground">Trim:</span> {getLatestBookout('jdpower')!.trim}</div>
                          <div><span className="text-muted-foreground">Body:</span> {getLatestBookout('jdpower')!.bodyStyle}</div>
                          <div><span className="text-muted-foreground">Drivetrain:</span> {getLatestBookout('jdpower')!.drivetrain}</div>
                          <div><span className="text-muted-foreground">Engine:</span> {getLatestBookout('jdpower')!.engine}</div>
                          <div><span className="text-muted-foreground">Transmission:</span> {getLatestBookout('jdpower')!.transmission || 'N/A'}</div>
                          <div><span className="text-muted-foreground">Fuel:</span> {getLatestBookout('jdpower')!.fuelType}</div>
                        </div>
                      </div>
                      
                      {/* Adjusted Values */}
                      <div className="p-4 border-b">
                        <h4 className="font-semibold mb-2">Current Market Values (Mileage Adjusted)</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Clean Trade-In</p>
                            <p className="font-semibold text-green-600">
                              ${getLatestBookout('jdpower')!.cleanTradeIn?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Average Trade-In</p>
                            <p className="font-semibold">
                              ${getLatestBookout('jdpower')!.averageTradeIn?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Rough Trade-In</p>
                            <p className="font-semibold text-orange-600">
                              ${getLatestBookout('jdpower')!.roughTradeIn?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Clean Retail</p>
                            <p className="font-semibold text-blue-600">
                              ${getLatestBookout('jdpower')!.cleanRetail?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Loan Value</p>
                            <p className="font-semibold">
                              ${getLatestBookout('jdpower')!.loanValue?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Mileage Adjustment</p>
                            <p className="font-semibold ${getLatestBookout('jdpower')!.mileageAdjustment! > 0 ? 'text-green-600' : 'text-red-600'}">
                              ${getLatestBookout('jdpower')!.mileageAdjustment?.toLocaleString() || '0'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Base Values */}
                      <div className="p-4 border-b">
                        <h4 className="font-semibold mb-2">Base Values (Average Mileage)</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Base Clean Trade-In</p>
                            <p className="font-semibold">
                              ${getLatestBookout('jdpower')!.baseCleanTradeIn?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Base Average Trade-In</p>
                            <p className="font-semibold">
                              ${getLatestBookout('jdpower')!.baseAverageTradeIn?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Base Rough Trade-In</p>
                            <p className="font-semibold">
                              ${getLatestBookout('jdpower')!.baseRoughTradeIn?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Base Clean Retail</p>
                            <p className="font-semibold">
                              ${getLatestBookout('jdpower')!.baseCleanRetail?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Mileage Info */}
                      <div className="p-4 border-b">
                        <h4 className="font-semibold mb-2">Mileage Analysis</h4>
                        <div className="text-xs space-y-1">
                          <p><span className="text-muted-foreground">Vehicle Mileage:</span> {getLatestBookout('jdpower')!.mileage?.toLocaleString() || 'N/A'}</p>
                          <p><span className="text-muted-foreground">Average Mileage for this Vehicle:</span> {getLatestBookout('jdpower')!.averageMileage?.toLocaleString() || 'N/A'}</p>
                          <p><span className="text-muted-foreground">Max Positive Adjustment:</span> ${getLatestBookout('jdpower')!.maxMileageAdj?.toLocaleString() || 'N/A'}</p>
                          <p><span className="text-muted-foreground">Max Negative Adjustment:</span> ${getLatestBookout('jdpower')!.minMileageAdj?.toLocaleString() || 'N/A'}</p>
                        </div>
                      </div>
                      
                      {/* ACCESSORIES - THE FUCKING ACCESSORIES! */}
                      {getLatestBookout('jdpower')!.accessories && getLatestBookout('jdpower')!.accessories.length > 0 && (
                        <div className="p-4 border-b">
                          <h4 className="font-semibold mb-2">Vehicle Equipment & Options ({getLatestBookout('jdpower')!.accessories.length} items)</h4>
                          
                          {/* Group accessories by category */}
                          <div className="space-y-4 max-h-96 overflow-y-auto">
                            {Object.entries(
                              getLatestBookout('jdpower')!.accessories.reduce((groups: any, accessory: any) => {
                                const category = accessory.category || 'Other';
                                if (!groups[category]) groups[category] = [];
                                groups[category].push(accessory);
                                return groups;
                              }, {})
                            ).map(([category, accessories]: [string, any]) => (
                              <div key={category}>
                                <h5 className="text-xs font-medium text-muted-foreground mb-2 uppercase">{category}</h5>
                                <div className="space-y-2">
                                  {accessories.map((accessory: any, index: number) => {
                                    const isIncluded = accessory.cleanTradeAdj === 0 && accessory.cleanRetailAdj === 0 && accessory.loanAdj === 0;
                                    return (
                                      <div key={`${category}-${index}`} className={`text-xs border rounded p-2 space-y-1 ${isIncluded ? 'bg-gray-50 dark:bg-gray-900' : ''}`}>
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            <p className="font-medium flex items-center gap-2">
                                              {accessory.name}
                                              {isIncluded && (
                                                <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                                                  Included
                                                </span>
                                              )}
                                              {accessory.isFactoryInstalled && (
                                                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                                                  Factory
                                                </span>
                                              )}
                                            </p>
                                            <p className="text-muted-foreground">Code: {accessory.code}</p>
                                          </div>
                                          <div className="text-right">
                                            {!isIncluded && (
                                              <div className="space-y-1">
                                                {accessory.cleanTradeAdj && (
                                                  <p className="text-muted-foreground">
                                                    Trade: <span className="font-medium text-green-600">+${accessory.cleanTradeAdj.toLocaleString()}</span>
                                                  </p>
                                                )}
                                                {accessory.cleanRetailAdj && (
                                                  <p className="text-muted-foreground">
                                                    Retail: <span className="font-medium text-green-600">+${accessory.cleanRetailAdj.toLocaleString()}</span>
                                                  </p>
                                                )}
                                                {accessory.loanAdj && (
                                                  <p className="text-muted-foreground">
                                                    Loan: <span className="font-medium text-green-600">+${accessory.loanAdj.toLocaleString()}</span>
                                                  </p>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {/* Show includes/excludes relationships */}
                                        {(accessory.includesCode || accessory.excludesCode) && (
                                          <div className="text-xs text-muted-foreground mt-1 pt-1 border-t">
                                            {accessory.includesCode && <p>Includes: {accessory.includesCode}</p>}
                                            {accessory.excludesCode && <p>Excludes: {accessory.excludesCode}</p>}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Summary of value adjustments */}
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-2">TOTAL EQUIPMENT VALUE ADJUSTMENTS</p>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">VIN Options Trade-In</p>
                                <p className="font-semibold text-green-600">
                                  +${getLatestBookout('jdpower')!.vinOptionsTradeIn?.toLocaleString() || '0'}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">VIN Options Retail</p>
                                <p className="font-semibold text-green-600">
                                  +${getLatestBookout('jdpower')!.vinOptionsRetail?.toLocaleString() || '0'}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">VIN Options Loan</p>
                                <p className="font-semibold text-green-600">
                                  +${getLatestBookout('jdpower')!.vinOptionsLoan?.toLocaleString() || '0'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Request Info */}
                      <div className="p-4 border-t text-xs text-muted-foreground">
                        <p>Request ID: {getLatestBookout('jdpower')!.requestId}</p>
                        <p>UCG Vehicle ID: {getLatestBookout('jdpower')!.ucgVehicleId}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="font-medium">Kelly Blue Book</div>
                  </div>
                  <Button variant="outline" size="sm">Create Bookout</Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="font-medium">Black Book</div>
                  </div>
                  <Button variant="outline" size="sm">Create Bookout</Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="font-medium">NADA</div>
                  </div>
                  <Button variant="outline" size="sm">Create Bookout</Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="font-medium">Galves</div>
                  </div>
                  <Button variant="outline" size="sm">Create Bookout</Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="font-medium">AutoCheck</div>
                  </div>
                  <Button variant="outline" size="sm">Create Bookout</Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="font-medium">Manheim</div>
                  </div>
                  <Button variant="outline" size="sm">Create Bookout</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-comparison">
          <Card>
            <CardHeader>
              <CardTitle>AI Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">AI-powered vehicle comparison insights will be available soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vehicle</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this vehicle? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  setIsDeleting(true);
                  const response = await fetch(`/api/vehicles/${params.uuid}`, {
                    method: 'DELETE',
                  });
                  
                  if (!response.ok) {
                    throw new Error('Failed to delete vehicle');
                  }
                  
                  router.push('/dashboard/saved-vehicles');
                } catch (error) {
                  console.error('Error deleting vehicle:', error);
                  alert('Failed to delete vehicle');
                  setIsDeleting(false);
                  setIsDeleteDialogOpen(false);
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}