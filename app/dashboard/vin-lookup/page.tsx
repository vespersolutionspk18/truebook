'use client';

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface VehicleInfo {
  Value: string;
  ValueId: string;
  Variable: string;
  VariableId: number;
}

const ITEMS_PER_PAGE = 12;

export default function VinLookupPage() {
  const [vin, setVin] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VehicleInfo[] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const [existingVehicle, setExistingVehicle] = useState<{ uuid: string } | null>(null);

  const handleSearch = async () => {
    if (!vin) return;
    
    setLoading(true);
    setExistingVehicle(null);
    setResult(null);
    
    try {
      // First check if vehicle exists in database by VIN
      const checkResponse = await fetch(`/api/vehicles/check/${vin}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      console.log('Database check response status:', checkResponse.status);
      
      // Handle different response statuses
      if (checkResponse.status === 401) {
        console.log('User not authenticated, skipping database check');
        // Don't redirect, just skip the check
        // The NHTSA lookup will still work
      } else if (checkResponse.status === 403) {
        console.log('Organization required, skipping database check');
        // The NHTSA lookup will still work
      } else if (checkResponse.ok) {
        const vehicleData = await checkResponse.json();
        console.log('Database check response:', { status: checkResponse.status, data: vehicleData });
        
        // API returns null when vehicle not found
        if (vehicleData && vehicleData.uuid) {
          console.log('Vehicle found in database:', vehicleData);
          toast({
            title: "Duplicate VIN Found",
            description: "A vehicle with this VIN already exists in the database.",
            variant: "destructive"
          });
          router.push(`/dashboard/vehicle/${vehicleData.uuid}`);
          return;
        } else {
          console.log('Vehicle not found in database (null response)');
        }
      } else {
        // For other unexpected errors
        console.error('Unexpected error status:', checkResponse.status);
        try {
          const errorData = await checkResponse.json();
          console.error('Error data:', errorData);
        } catch {
          console.error('Failed to parse error response');
        }
      }

      console.log('Vehicle not found in database, proceeding with NHTSA API call');
      // Only proceed with NHTSA API call if vehicle doesn't exist
      const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`);
      const data = await response.json();
      setResult(data.Results);
      setCurrentPage(1); // Reset to first page on new search
    } catch (error) {
      console.error("Error looking up VIN:", error);
      toast({
        title: "Error",
        description: "Failed to lookup VIN. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToInventory = async () => {
    if (!result) return;
    
    setIsSaving(true);
    try {
      console.log('Saving vehicle with VIN:', vin);
      console.log('Vehicle pairs count:', result.filter(item => 
        item && 
        typeof item.Value === 'string' && 
        typeof item.Variable === 'string' && 
        item.Value.trim() !== '' && 
        item.Value !== '0' && 
        item.Value !== 'Not Applicable' &&
        item.Variable.trim() !== ''
      ).length);
      
      const createVehicleResponse = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          vin: vin,
          vehiclePairs: result
            .filter(item => 
              item && 
              typeof item.Value === 'string' && 
              typeof item.Variable === 'string' && 
              item.Value.trim() !== '' && 
              item.Value !== '0' && 
              item.Value !== 'Not Applicable' &&
              item.Variable.trim() !== ''
            )
            .map(item => ({
              property: item.Variable,
              value: item.Value.trim()
            }))
        })
      });

      console.log('Save vehicle response status:', createVehicleResponse.status);

      if (!createVehicleResponse.ok) {
        let errorMessage = 'Failed to save vehicle';
        try {
          const errorData = await createVehicleResponse.json();
          console.error('Save vehicle error:', errorData);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          console.error('Failed to parse error response');
        }
        
        if (createVehicleResponse.status === 409) {
          throw new Error('A vehicle with this VIN already exists in your saved vehicles');
        } else if (createVehicleResponse.status === 401) {
          throw new Error('You must be logged in to save vehicles');
        } else if (createVehicleResponse.status === 403) {
          throw new Error('Organization context required. Please ensure you are logged in with an organization.');
        } else if (createVehicleResponse.status === 400) {
          throw new Error('Invalid vehicle data. Please check the VIN and try again');
        }
        throw new Error(errorMessage);
      }

      // Parse the successful response
      const savedVehicle = await createVehicleResponse.json();
      console.log('Vehicle saved successfully:', savedVehicle);

      toast({
        title: "Success",
        description: "Vehicle saved to inventory successfully.",
      });
      
      router.push('/dashboard/inventory');
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save vehicle',
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredResults = result
    ? result.filter(item => item.Value && item.Value !== "0" && item.Value !== "Not Applicable")
    : [];

  const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentResults = filteredResults.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">VIN Lookup</h2>
        <p className="text-sm text-muted-foreground">Enter a Vehicle Identification Number (VIN) to retrieve vehicle information.</p>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Enter VIN number"
          value={vin}
          onChange={(e) => setVin(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleSearch} disabled={loading || !vin} variant="default">
          {loading ? "Searching..." : "Search"}
        </Button>
      </div>

      {result && (
        <div className="w-full rounded-md border p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Vehicle Information</h3>
              {existingVehicle ? (
                <Button
                  onClick={() => router.push(`/dashboard/vehicle/${existingVehicle.uuid}/`)}
                  variant="default"
                  size="sm"
                >
                  View Vehicle
                </Button>
              ) : (
                <Button
                  onClick={handleSaveToInventory}
                  disabled={isSaving}
                  variant="default"
                  size="sm"
                >
                  {isSaving ? "Saving..." : "Save to Inventory"}
                </Button>
              )}
            </div>
            <div className="grid gap-4">
              {currentResults.map((item, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 border-b pb-2">
                  <p className="text-sm font-medium text-muted-foreground">{item.Variable}</p>
                  <p>{item.Value}</p>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <PaginationItem key={page}>
                      <PaginationLink 
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </div>
      )}
    </div>
  );
}