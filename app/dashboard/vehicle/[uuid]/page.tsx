'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { NeoVinDisplay } from '@/components/ui/neovin-display';
import AIValidationComponent from '@/components/AIValidationComponent';

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
              <CardDescription>
                Validate JD Power bookout accessories against build sheet features using AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AIValidationComponent 
                vehicleUuid={vehicle.uuid} 
                onValidationComplete={async () => {
                  // Refresh vehicle data to get updated bookout values
                  try {
                    const response = await fetch(`/api/vehicles/${vehicle.uuid}`);
                    if (response.ok) {
                      const updatedVehicle = await response.json();
                      setVehicle(updatedVehicle);
                      console.log('Vehicle data refreshed after AI validation');
                    }
                  } catch (error) {
                    console.error('Failed to refresh vehicle data after validation:', error);
                  }
                }}
              />
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
                    <div className="border-t bg-white dark:bg-gray-950 min-h-[600px]">
                      {/* Header */}
                      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-2xl font-bold mb-2">J.D. Power Vehicle Valuation Report</h3>
                            <p className="text-blue-100 text-sm">
                              {getLatestBookout('jdpower')!.year} {getLatestBookout('jdpower')!.make} {getLatestBookout('jdpower')!.model} {getLatestBookout('jdpower')!.trim}
                            </p>
                            <p className="text-blue-200 text-xs mt-1">
                              VIN: {vehicle.vin} • Report Date: {new Date(getLatestBookout('jdpower')!.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                              <p className="text-xs text-blue-200">Primary Trade Value</p>
                              <p className="text-2xl font-bold">
                                ${getLatestBookout('jdpower')!.cleanTradeIn?.toLocaleString() || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Main Content */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                        {/* Left Column - Vehicle Details & Values */}
                        <div className="lg:col-span-2 space-y-6">
                          {/* Vehicle Specifications */}
                          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                            <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Vehicle Specifications</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500 uppercase">Year</p>
                                <p className="font-semibold">{getLatestBookout('jdpower')!.year}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500 uppercase">Make</p>
                                <p className="font-semibold">{getLatestBookout('jdpower')!.make}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500 uppercase">Model</p>
                                <p className="font-semibold">{getLatestBookout('jdpower')!.model}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500 uppercase">Trim</p>
                                <p className="font-semibold">{getLatestBookout('jdpower')!.trim}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500 uppercase">Body Style</p>
                                <p className="font-semibold">{getLatestBookout('jdpower')!.bodyStyle}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500 uppercase">Drivetrain</p>
                                <p className="font-semibold">{getLatestBookout('jdpower')!.drivetrain}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500 uppercase">Engine</p>
                                <p className="font-semibold text-xs">{getLatestBookout('jdpower')!.engine}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500 uppercase">Transmission</p>
                                <p className="font-semibold text-xs">{getLatestBookout('jdpower')!.transmission || 'N/A'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500 uppercase">Fuel Type</p>
                                <p className="font-semibold">{getLatestBookout('jdpower')!.fuelType}</p>
                              </div>
                            </div>
                          </div>

                          {/* Market Values */}
                          <div className="bg-white dark:bg-gray-900 rounded-lg border shadow-sm">
                            <div className="p-6 border-b">
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Current Market Values</h4>
                              <p className="text-sm text-gray-500 mt-1">Adjusted for {getLatestBookout('jdpower')!.mileage?.toLocaleString()} miles</p>
                            </div>
                            <div className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                    <p className="text-sm font-medium text-green-800 dark:text-green-200">Clean Trade-In</p>
                                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                                      ${getLatestBookout('jdpower')!.cleanTradeIn?.toLocaleString() || 'N/A'}
                                    </p>
                                    <p className="text-xs text-green-600 dark:text-green-400">Excellent condition</p>
                                  </div>
                                  <div className="bg-gray-50 dark:bg-gray-800 border rounded-lg p-4">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Average Trade-In</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                      ${getLatestBookout('jdpower')!.averageTradeIn?.toLocaleString() || 'N/A'}
                                    </p>
                                    <p className="text-xs text-gray-500">Good condition</p>
                                  </div>
                                  <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">Rough Trade-In</p>
                                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                                      ${getLatestBookout('jdpower')!.roughTradeIn?.toLocaleString() || 'N/A'}
                                    </p>
                                    <p className="text-xs text-orange-600 dark:text-orange-400">Fair condition</p>
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Clean Retail</p>
                                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                      ${getLatestBookout('jdpower')!.cleanRetail?.toLocaleString() || 'N/A'}
                                    </p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400">Retail market value</p>
                                  </div>
                                  <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                                    <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Loan Value</p>
                                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                                      ${getLatestBookout('jdpower')!.loanValue?.toLocaleString() || 'N/A'}
                                    </p>
                                    <p className="text-xs text-purple-600 dark:text-purple-400">Lending institution value</p>
                                  </div>
                                  <div className={`border rounded-lg p-4 ${getLatestBookout('jdpower')!.mileageAdjustment! >= 0 ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'}`}>
                                    <p className={`text-sm font-medium ${getLatestBookout('jdpower')!.mileageAdjustment! >= 0 ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                                      Mileage Adjustment
                                    </p>
                                    <p className={`text-2xl font-bold ${getLatestBookout('jdpower')!.mileageAdjustment! >= 0 ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                                      {getLatestBookout('jdpower')!.mileageAdjustment! >= 0 ? '+' : ''}${getLatestBookout('jdpower')!.mileageAdjustment?.toLocaleString() || '0'}
                                    </p>
                                    <p className={`text-xs ${getLatestBookout('jdpower')!.mileageAdjustment! >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                      {getLatestBookout('jdpower')!.mileageAdjustment! >= 0 ? 'Below average miles' : 'Above average miles'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Column - Mileage Info & Summary */}
                        <div className="space-y-6">
                          {/* Mileage Analysis */}
                          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                            <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Mileage Analysis</h4>
                            <div className="space-y-4">
                              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border">
                                <p className="text-xs font-medium text-gray-500 uppercase">Current Mileage</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                  {getLatestBookout('jdpower')!.mileage?.toLocaleString() || 'N/A'}
                                </p>
                              </div>
                              <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">Average for Year/Model:</span>
                                  <span className="font-medium">{getLatestBookout('jdpower')!.averageMileage?.toLocaleString() || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">Max Positive Adj:</span>
                                  <span className="font-medium text-green-600">+${getLatestBookout('jdpower')!.maxMileageAdj?.toLocaleString() || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">Max Negative Adj:</span>
                                  <span className="font-medium text-red-600">${getLatestBookout('jdpower')!.minMileageAdj?.toLocaleString() || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Base Values (Comparison) */}
                          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                            <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Base Values Comparison</h4>
                            <p className="text-sm text-gray-500 mb-4">Values at average mileage ({getLatestBookout('jdpower')!.averageMileage?.toLocaleString()} miles)</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="bg-white dark:bg-gray-800 border rounded-lg p-4">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Base Clean Trade-In</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                  ${getLatestBookout('jdpower')!.baseCleanTradeIn?.toLocaleString() || 'N/A'}
                                </p>
                              </div>
                              <div className="bg-white dark:bg-gray-800 border rounded-lg p-4">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Base Average Trade-In</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                  ${getLatestBookout('jdpower')!.baseAverageTradeIn?.toLocaleString() || 'N/A'}
                                </p>
                              </div>
                              <div className="bg-white dark:bg-gray-800 border rounded-lg p-4">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Base Rough Trade-In</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                  ${getLatestBookout('jdpower')!.baseRoughTradeIn?.toLocaleString() || 'N/A'}
                                </p>
                              </div>
                              <div className="bg-white dark:bg-gray-800 border rounded-lg p-4">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Base Clean Retail</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                  ${getLatestBookout('jdpower')!.baseCleanRetail?.toLocaleString() || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Vehicle Equipment & Options */}
                      {getLatestBookout('jdpower')!.accessories && getLatestBookout('jdpower')!.accessories.length > 0 && (
                        <div className="col-span-1 lg:col-span-3 bg-white dark:bg-gray-900 rounded-lg border shadow-sm">
                          <div className="p-6 border-b">
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Vehicle Equipment & Options</h4>
                                <p className="text-sm text-gray-500 mt-1">{getLatestBookout('jdpower')!.accessories.length} items identified from VIN</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Total Equipment Value</p>
                                <p className="text-lg font-bold text-green-600">
                                  +${getLatestBookout('jdpower')!.vinOptionsTradeIn?.toLocaleString() || '0'}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-6">
                            {/* Equipment Categories */}
                            <div className="space-y-6">
                              {Object.entries(
                                getLatestBookout('jdpower')!.accessories.reduce((groups: any, accessory: any) => {
                                  const category = accessory.category || 'Other Equipment';
                                  if (!groups[category]) groups[category] = [];
                                  groups[category].push(accessory);
                                  return groups;
                                }, {})
                              ).map(([category, accessories]: [string, any]) => (
                                <div key={category} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                  <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                                    {category}
                                    <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                                      {accessories.length} items
                                    </span>
                                  </h5>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {accessories.map((accessory: any, index: number) => {
                                      const isIncluded = accessory.cleanTradeAdj === 0 && accessory.cleanRetailAdj === 0 && accessory.loanAdj === 0;
                                      const hasValue = accessory.cleanTradeAdj > 0 || accessory.cleanRetailAdj > 0 || accessory.loanAdj > 0;
                                      
                                      return (
                                        <div key={`${category}-${index}`} className={`bg-white dark:bg-gray-900 border rounded-lg p-3 ${hasValue ? 'border-green-200 dark:border-green-800' : 'border-gray-200 dark:border-gray-700'}`}>
                                          <div className="flex justify-between items-start mb-2">
                                            <h6 className="font-medium text-sm text-gray-900 dark:text-gray-100 flex-1 pr-2">
                                              {accessory.name}
                                            </h6>
                                            <div className="flex gap-1">
                                              {isIncluded && (
                                                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                                                  Standard
                                                </span>
                                              )}
                                              {accessory.isFactoryInstalled && (
                                                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                                                  Factory
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          
                                          <p className="text-xs text-gray-500 mb-2">Code: {accessory.code}</p>
                                          
                                          {hasValue && (
                                            <div className="space-y-1 text-xs">
                                              {accessory.cleanTradeAdj > 0 && (
                                                <div className="flex justify-between">
                                                  <span className="text-gray-600 dark:text-gray-400">Trade:</span>
                                                  <span className="font-medium text-green-600">+${accessory.cleanTradeAdj.toLocaleString()}</span>
                                                </div>
                                              )}
                                              {accessory.cleanRetailAdj > 0 && (
                                                <div className="flex justify-between">
                                                  <span className="text-gray-600 dark:text-gray-400">Retail:</span>
                                                  <span className="font-medium text-green-600">+${accessory.cleanRetailAdj.toLocaleString()}</span>
                                                </div>
                                              )}
                                              {accessory.loanAdj > 0 && (
                                                <div className="flex justify-between">
                                                  <span className="text-gray-600 dark:text-gray-400">Loan:</span>
                                                  <span className="font-medium text-green-600">+${accessory.loanAdj.toLocaleString()}</span>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                          
                                          {(accessory.includesCode || accessory.excludesCode) && (
                                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500">
                                              {accessory.includesCode && <p>• Includes: {accessory.includesCode}</p>}
                                              {accessory.excludesCode && <p>• Excludes: {accessory.excludesCode}</p>}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* Equipment Value Summary */}
                            <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 rounded-lg p-4 border border-green-200 dark:border-green-800">
                              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Equipment Value Summary</h5>
                              <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                  <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-medium">Trade-In Adjustment</p>
                                  <p className="text-xl font-bold text-green-600">
                                    +${getLatestBookout('jdpower')!.vinOptionsTradeIn?.toLocaleString() || '0'}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-medium">Retail Adjustment</p>
                                  <p className="text-xl font-bold text-green-600">
                                    +${getLatestBookout('jdpower')!.vinOptionsRetail?.toLocaleString() || '0'}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-medium">Loan Adjustment</p>
                                  <p className="text-xl font-bold text-green-600">
                                    +${getLatestBookout('jdpower')!.vinOptionsLoan?.toLocaleString() || '0'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Footer - Report Details */}
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-b-lg p-6 border-t">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">Report Information</p>
                            <p className="text-xs text-gray-500">Request ID: {getLatestBookout('jdpower')!.requestId}</p>
                            <p className="text-xs text-gray-500">UCG Vehicle ID: {getLatestBookout('jdpower')!.ucgVehicleId}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">Generated</p>
                            <p className="text-xs text-gray-500">{new Date(getLatestBookout('jdpower')!.createdAt).toLocaleString()}</p>
                            <p className="text-xs text-gray-500">Via J.D. Power Valuation API</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">Disclaimer</p>
                            <p className="text-xs text-gray-500">Values are estimates based on market data and vehicle condition. Actual trade-in values may vary.</p>
                          </div>
                        </div>
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