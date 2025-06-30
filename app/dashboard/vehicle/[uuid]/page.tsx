'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { convertMonroneyToJSON } from '@/lib/pdf-to-json';
import { MonroneySticker } from '@/components/ui/monroney-sticker';

interface VehiclePair {
  property: string;
  value: string;
}

interface MonroneyPair {
  property: string;
  value: string;
}

interface VehicleDetails {
  uuid: string;
  vin: string;
  vehiclePairs: VehiclePair[];
  createdAt: string;
  monroney?: {
    id: string;
    vin: string;
    monroneyPairs: MonroneyPair[];
  };
}

export default function VehicleDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<VehicleDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingMonroney, setIsLoadingMonroney] = useState(false);
  const [monroneyError, setMonroneyError] = useState<string | null>(null);

  const handleFetchMonroney = async () => {
    if (!vehicle?.vin) return;
    
    setIsLoadingMonroney(true);
    setMonroneyError(null);
    
    try {
      const response = await fetch(`/api/monroney/${vehicle.vin}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        switch (response.status) {
          case 400:
            throw new Error('Invalid VIN provided');
          case 404:
            throw new Error('Monroney label not found for this VIN');
          case 405:
            throw new Error('Method not allowed');
          default:
            throw new Error('Failed to fetch Monroney label');
        }
      }

      const blob = await response.blob();
      
      // Convert PDF to JSON
      const jsonData = await convertMonroneyToJSON(blob);
      console.log('Monroney PDF converted to JSON:', jsonData);
      
      // Save Monroney data
      const saveResponse = await fetch('/api/monroney/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleId: vehicle.uuid,
          vin: vehicle.vin,
          monroneyData: jsonData
        })
      });

      let errorData;
      try {
        errorData = await saveResponse.json();
        console.log('Monroney save response:', errorData);
      } catch (parseError) {
        console.error('Failed to parse save response:', parseError);
        throw new Error('Failed to parse server response');
      }

      if (!saveResponse.ok) {
        throw new Error(errorData.error || 'Failed to save Monroney data');
      }

      // Update the vehicle state with the new Monroney data
      const updatedMonroneyData = {
        id: errorData.id,
        vin: vehicle.vin,
        monroneyPairs: Object.entries(jsonData).map(([key, value]) => ({
          property: key,
          value: value
        }))
      };
      console.log('Updated Monroney data structure:', updatedMonroneyData);

      setVehicle(prevVehicle => ({
        ...prevVehicle!,
        monroney: updatedMonroneyData
      }));
    } catch (error) {
      console.error('Error fetching Monroney label:', error);
      setMonroneyError(error instanceof Error ? error.message : 'Failed to fetch Monroney label');
    } finally {
      setIsLoadingMonroney(false);
    }
  };

  useEffect(() => {
    const fetchVehicleDetails = async () => {
      try {
        const response = await fetch(`/api/vehicles/${params.uuid}?include=monroney`);
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
        setVehicle(data);

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
        <div className="flex gap-2">
          <Button
            onClick={() => setIsDeleteDialogOpen(true)}
            variant="destructive"
            disabled={isDeleting}
            size="sm"
          >
            {isDeleting ? "Deleting..." : "Delete Vehicle"}
          </Button>
          <Button onClick={() => window.history.back()} variant="outline" size="sm">
            Back to List
          </Button>
        </div>
      </div>

      <Tabs defaultValue="vehicle-info" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="vehicle-info">Vehicle Information</TabsTrigger>
          <TabsTrigger value="build-sheet">Build Sheet</TabsTrigger>
          <TabsTrigger value="monroney">Monroney Label</TabsTrigger>
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
            <CardHeader>
              <CardTitle>Build Sheet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col gap-4">
                  <div className="border p-4 rounded">
                    <div className="mb-4 text-sm text-muted-foreground">
                      <p>Debug Info:</p>
                      <p>Year: {vehicle.vehiclePairs.find((p: VehiclePair) => p.property === 'Model Year')?.value || 'N/A'}</p>
                      <p>Make: {vehicle.vehiclePairs.find((p: VehiclePair) => p.property === 'Make')?.value || 'N/A'}</p>
                      <p>VIN: {vehicle.vin}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">Build sheet information will be available soon.</div>
                  </div>
                </div>
                <div className="max-h-[calc(100vh-370px)] overflow-y-auto scrollbar-hide">
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4 border-b pb-2 font-medium text-muted-foreground">
                      <div>Property</div>
                      <div>Value</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-b pb-2">
                      <div className="text-sm">Engine</div>
                      <div className="text-sm">3.6L V6</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-b pb-2">
                      <div className="text-sm">Transmission</div>
                      <div className="text-sm">8-Speed Automatic</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-b pb-2">
                      <div className="text-sm">Drive Type</div>
                      <div className="text-sm">All-Wheel Drive</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-b pb-2">
                      <div className="text-sm">Exterior Color</div>
                      <div className="text-sm">Granite Crystal Metallic</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-b pb-2">
                      <div className="text-sm">Interior Color</div>
                      <div className="text-sm">Black</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-b pb-2">
                      <div className="text-sm">Wheelbase</div>
                      <div className="text-sm">114.0 inches</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-b pb-2">
                      <div className="text-sm">Track Width</div>
                      <div className="text-sm">64.6 inches</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-b pb-2">
                      <div className="text-sm">Gross Vehicle Weight</div>
                      <div className="text-sm">5,650 lbs</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-b pb-2">
                      <div className="text-sm">Payload Capacity</div>
                      <div className="text-sm">1,250 lbs</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-b pb-2">
                      <div className="text-sm">Towing Capacity</div>
                      <div className="text-sm">7,200 lbs</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monroney">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Monroney Label</CardTitle>
              {!vehicle.monroney && (
                <Button 
                  variant="default" 
                  size="sm" 
                  className="ml-2"
                  onClick={handleFetchMonroney}
                  disabled={isLoadingMonroney}
                >
                  {isLoadingMonroney ? "Loading..." : "Fetch Monroney Sticker"}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {monroneyError ? (
                <p className="text-sm text-red-500">{monroneyError}</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-4">
                    <div className="border p-4 rounded">
                      {/* Debug info */}
                      <div className="mb-4 text-sm text-muted-foreground">
                        <p>Debug Info:</p>
                        <p>Year: {vehicle.vehiclePairs.find((p: VehiclePair) => p.property === 'Model Year')?.value || 'N/A'}</p>
                        <p>Make: {vehicle.vehiclePairs.find((p: VehiclePair) => p.property === 'Make')?.value || 'N/A'}</p>
                        <p>VIN: {vehicle.vin}</p>
                      </div>
                      <MonroneySticker
                        year={vehicle.vehiclePairs.find((p: VehiclePair) => p.property === 'Model Year')?.value || ''}
                        make={vehicle.vehiclePairs.find((p: VehiclePair) => p.property === 'Make')?.value || ''}
                        vin={vehicle.vin}
                        vendorId="MonroneyLabelsTest"
                      />
                    </div>
                    {!vehicle.monroney && (
                      <p className="text-sm text-muted-foreground">No Monroney label data available. Click the button above to fetch it.</p>
                    )}
                  </div>
                  {vehicle.monroney && (
                    <div className="max-h-[calc(100vh-370px)] overflow-y-auto scrollbar-hide">
                      <div className="grid gap-4">
                        {vehicle.monroney.monroneyPairs
                          .filter((pair: MonroneyPair) => pair.value && pair.value.trim() !== '')
                          .map((pair: MonroneyPair, index: number) => (
                            <div key={index} className="grid grid-cols-2 gap-4 border-b pb-2">
                              <p className="text-sm font-medium text-muted-foreground">{pair.property}</p>
                              <p className="text-sm">{pair.value}</p>
                            </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="font-medium">JD Power</div>
                  </div>
                  <Button variant="outline" size="sm">Create Bookout</Button>
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