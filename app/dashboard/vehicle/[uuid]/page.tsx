'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { NeoVinDisplay } from '@/components/ui/neovin-display';

interface VehiclePair {
  property: string;
  value: string;
}

interface VehicleDetails {
  uuid: string;
  vin: string;
  vehiclePairs: VehiclePair[];
  createdAt: string;
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
                  {isLoadingNeoVin ? "Decoding..." : "Decode VIN"}
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