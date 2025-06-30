'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface VehicleData {
  id: string;
  vin: string;
  vehiclePairs: Array<{ property: string; value: string }>;
}

export default function VehiclePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const uuid = searchParams.get('uuid');

  useEffect(() => {
    if (!uuid) {
      
      return;
    }

    async function fetchVehicle() {
      try {
        const response = await fetch(`/api/vehicles/${uuid}`);
        if (!response.ok) {
          
          return;
        }
        const data = await response.json();
        setVehicle(data);
      } catch (error) {
        console.error('Error fetching vehicle:', error);
        
      }
    }

    fetchVehicle();
  }, [uuid, router]);

  if (!vehicle) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {vehicle.vehiclePairs.map((pair, index) => (
              <div key={`${pair.property}-${pair.value}-${index}`} className="grid grid-cols-2 gap-4 border-b pb-2">
                <h3 className="text-sm font-medium text-gray-500">{pair.property}</h3>
                <p className="text-base">{pair.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}