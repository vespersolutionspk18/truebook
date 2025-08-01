'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/contexts/organization-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { SessionDebug } from "@/components/session-debug";

interface Vehicle {
  uuid: string;
  vin: string;
  createdAt: Date;
  vehiclePairs: Array<{ property: string; value: string }>;
}

const ITEMS_PER_PAGE = 20;

export default function SavedVehiclesPage() {
  const router = useRouter();
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const [currentPage, setCurrentPage] = useState(1);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newVin, setNewVin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedMaker, setSelectedMaker] = useState<string>('');
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [propertyValue, setPropertyValue] = useState<string>('');
  const [selectedModelYear, setSelectedModelYear] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Debug logging
  console.log('SavedVehiclesPage - render with:', {
    currentOrganization,
    orgLoading,
    isLoadingVehicles
  });

  useEffect(() => {
    console.log('SavedVehiclesPage useEffect - orgLoading:', orgLoading, 'currentOrganization:', currentOrganization);
    
    // Wait for organization context to finish loading
    if (orgLoading) {
      console.log('Organization context is still loading, waiting...');
      setIsLoadingVehicles(true);
      return;
    }
    
    // If not loading but no organization, handle it
    if (!orgLoading && !currentOrganization) {
      console.log('No organization found after loading');
      setIsLoadingVehicles(false);
      return;
    }
    
    const fetchVehicles = async () => {
      try {
        console.log('Fetching vehicles for organization:', currentOrganization.id);
        setIsLoadingVehicles(true);
        const response = await fetch('/api/vehicles', {
          credentials: 'include',
          headers: {
            'x-organization-id': currentOrganization.id
          }
        });
        
        console.log('Fetch response status:', response.status);
        
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error(`Failed to fetch vehicles: ${response.status}`);
        }
        const data = await response.json();
        console.log('Fetched vehicles:', data);
        setVehicles(data);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        setVehicles([]);
      } finally {
        setIsLoadingVehicles(false);
      }
    };

    fetchVehicles();
  }, [currentOrganization, orgLoading, router]);

  // Get unique makers from vehicles
  const uniqueMakers = [...new Set(vehicles.map(vehicle => 
    vehicle.vehiclePairs.find(pair => pair.property.toLowerCase() === 'make')?.value || 'Unknown'
  ))];

  // Get unique properties from vehicles
  const uniqueProperties = [...new Set(vehicles.flatMap(vehicle => 
    vehicle.vehiclePairs.map(pair => pair.property)
  ))].sort();

  // Get unique model years from vehicles
  const uniqueModelYears = [...new Set(vehicles.map(vehicle => 
    vehicle.vehiclePairs.find(pair => pair.property === 'Model Year')?.value || 'Unknown'
  ))].sort((a, b) => b.localeCompare(a)); // Sort years in descending order

  // Filter and sort vehicles
  const filteredVehicles = vehicles
    .filter(vehicle => {
      // Apply maker filter
      if (selectedMaker && selectedMaker !== 'all') {
        const maker = vehicle.vehiclePairs.find(pair => 
          pair.property.toLowerCase() === 'make'
        )?.value;
        if (maker?.toLowerCase() !== selectedMaker.toLowerCase()) return false;
      }

      // Apply model year filter
      if (selectedModelYear && selectedModelYear !== 'all') {
        const modelYear = vehicle.vehiclePairs.find(pair =>
          pair.property === 'Model Year'
        )?.value;
        if (modelYear !== selectedModelYear) return false;
      }

      // Apply custom property filter
      if (selectedProperty && propertyValue) {
        const matchingPair = vehicle.vehiclePairs.find(pair =>
          pair.property === selectedProperty &&
          pair.value.toLowerCase().includes(propertyValue.toLowerCase())
        );
        if (!matchingPair) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  const handleRowClick = (vehicleUuid: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.checkbox-cell')) {
      return;
    }
    router.push(`/dashboard/vehicle/${vehicleUuid}/`);
};
 


  const handleCheckboxChange = (vehicleuuid: string, checked: boolean) => {
    setSelectedVehicles((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (checked) {
        newSelected.add(vehicleuuid);
      } else {
        newSelected.delete(vehicleuuid);
      }
      return newSelected;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedVehicles(new Set(checked ? currentVehicles.map((v) => v.uuid) : []));
  };

  const handleAddNew = () => {
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!newVin) return;
  
    setIsLoading(true);
    try {
      const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${newVin}?format=json`);
      const data = await response.json();
  
      if (!data.Results) {
        throw new Error('Invalid VIN or no data returned');
      }

      const createVehicleResponse = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vin: newVin,
          vehiclePairs: data.Results
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
  
      if (!createVehicleResponse.ok) {
        const errorData = await createVehicleResponse.json();
        if (createVehicleResponse.status === 409) {
          throw new Error('A vehicle with this VIN already exists in your saved vehicles');
        } else if (createVehicleResponse.status === 401) {
          throw new Error('You must be logged in to save vehicles');
        } else if (createVehicleResponse.status === 400) {
          throw new Error('Invalid vehicle data. Please check the VIN and try again');
        }
        throw new Error(errorData.message || 'Failed to save vehicle');
      }
  
      setNewVin('');
      setIsDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      alert(error instanceof Error ? error.message : 'Failed to save vehicle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedVehicles.size === 0) return;

    try {
      const deletePromises = Array.from(selectedVehicles).map(id =>
        fetch(`/api/vehicles/${id}`, {
          method: 'DELETE',
        })
      );

      await Promise.all(deletePromises);
      
      // Fetch updated vehicles list
      const response = await fetch('/api/vehicles');
      if (!response.ok) {
        throw new Error('Failed to refresh vehicles list');
      }
      const updatedVehicles = await response.json();
      
      setVehicles(updatedVehicles);
      setSelectedVehicles(new Set());
      setCurrentPage(1); // Reset to first page after deletion
    } catch (error) {
      console.error('Error deleting vehicles:', error);
      alert('Failed to delete one or more vehicles');
    }
  };

  const totalPages = Math.ceil(filteredVehicles.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentVehicles = filteredVehicles.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <SessionDebug />
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Inventory</h2>
          <p className="text-sm text-muted-foreground">View and manage your inventory</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleDeleteSelected}
            variant="destructive"
            disabled={selectedVehicles.size === 0}
            size="sm"
          >
            Delete Selected
          </Button>
          <Button onClick={handleAddNew} variant="default" size="sm">
            Add New
          </Button>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortOrder('desc')}>
              Newest First
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOrder('asc')}>
              Oldest First
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowFilters(prev => !prev)}
        >
          <Filter className="h-4 w-4" />
        </Button>

        <div
          className={cn(
            "flex gap-4 items-center transition-all duration-300",
            showFilters ? "opacity-100" : "opacity-0 hidden"
          )}
        >
          <div className="flex items-center gap-2">
            <Select value={selectedMaker} onValueChange={setSelectedMaker}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by maker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All makers</SelectItem>
                {uniqueMakers.map(maker => (
                  <SelectItem key={maker} value={maker}>{maker}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMaker && selectedMaker !== 'all' && (
              <button
                onClick={() => setSelectedMaker('all')}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-colors"
              >
                <span className="text-2xl leading-none font-medium text-gray-500 hover:text-gray-700">×</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedModelYear} onValueChange={setSelectedModelYear}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {uniqueModelYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedModelYear && selectedModelYear !== 'all' && (
              <button
                onClick={() => setSelectedModelYear('all')}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-colors"
              >
                <span className="text-2xl leading-none font-medium text-gray-500 hover:text-gray-700">×</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedProperty} onValueChange={(value) => { setSelectedProperty(value); setPropertyValue(''); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Custom filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All properties</SelectItem>
                {uniqueProperties.map(property => (
                  <SelectItem key={property} value={property}>{property}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProperty && selectedProperty !== 'all' && (
              <button
                onClick={() => { setSelectedProperty('all'); setPropertyValue(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-colors"
              >
                <span className="text-2xl leading-none font-medium text-gray-500 hover:text-gray-700">×</span>
              </button>
            )}
          </div>

          {selectedProperty && selectedProperty !== 'all' && (
            <div className="flex items-center gap-2 flex-1 max-w-[180px]">
              <Select value={propertyValue} onValueChange={setPropertyValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select value" />
                </SelectTrigger>
                <SelectContent>
                  {[...new Set(vehicles
                    .flatMap(vehicle => vehicle.vehiclePairs
                      .filter(pair => pair.property === selectedProperty)
                      .map(pair => pair.value)
                    ))]
                    .sort()
                    .map(value => (
                      <SelectItem key={value} value={value}>{value}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {propertyValue && (
                <button
                  onClick={() => setPropertyValue('')}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-colors"
                >
                  <span className="text-2xl leading-none font-medium text-gray-500 hover:text-gray-700">×</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-md border max-h-[calc(100vh-260px)] overflow-y-auto scrollbar-hide">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent h-9 bg-gray-100">
              <TableHead className="w-[40px] p-0">
                <div className="h-9 flex items-center justify-center">
                  <Checkbox
                    checked={currentVehicles.length > 0 && currentVehicles.every(vehicle => selectedVehicles.has(vehicle.uuid))}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  />
                </div>
              </TableHead>
              <TableHead className="w-[150px] font-medium">VIN</TableHead>
              <TableHead className="w-[150px] font-medium">Make</TableHead>
              <TableHead className="w-[150px] font-medium">Model</TableHead>
              <TableHead className="w-[100px] font-medium">Model Year</TableHead>
              <TableHead className="w-[150px] font-medium">Trim</TableHead>
              <TableHead className="w-[150px] font-medium">Vehicle Type</TableHead>
              <TableHead className="w-[150px] font-medium">Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingVehicles ? (
              <TableRow key="loading">
                <TableCell colSpan={8} className="text-center py-4">
                  Loading vehicles...
                </TableCell>
              </TableRow>
            ) : vehicles.length === 0 ? (
              <TableRow key="no-vehicles">
                <TableCell colSpan={8} className="text-center py-4">
                  No vehicles found
                </TableCell>
              </TableRow>
            ) : (
              currentVehicles.map((vehicle, index) => {
                console.log('Vehicle ID:', vehicle.uuid);
                return (
                  <TableRow 
                    key={vehicle.uuid || `vehicle-${index}`}
                    onClick={(e) => handleRowClick(vehicle.uuid, e)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors h-9 whitespace-nowrap"
                  >
                    <TableCell className="p-0">
                      <div className="checkbox-cell h-9 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedVehicles.has(vehicle.uuid)}
                          onCheckedChange={(checked) => handleCheckboxChange(vehicle.uuid, !!checked)}
                          className="cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="py-1 font-medium truncate max-w-[150px]">
                      {vehicle.vin}
                    </TableCell>
                    <TableCell className="py-1 truncate max-w-[150px]">
                      {vehicle.vehiclePairs.find(pair => pair.property === "Make")?.value || ""}
                    </TableCell>
                    <TableCell className="py-1 truncate max-w-[150px]">
                      {vehicle.vehiclePairs.find(pair => pair.property === "Model")?.value || ""}
                    </TableCell>
                    <TableCell className="py-1 truncate max-w-[100px]">
                      {vehicle.vehiclePairs.find(pair => pair.property === "Model Year")?.value || ""}
                    </TableCell>
                    <TableCell className="py-1 truncate max-w-[150px]">
                      {vehicle.vehiclePairs.find(pair => pair.property === "Trim")?.value || ""}
                    </TableCell>
                    <TableCell className="py-1 truncate max-w-[150px]">
                      {vehicle.vehiclePairs.find(pair => pair.property === "Vehicle Type")?.value || ""}
                    </TableCell>
                    <TableCell className="py-1 truncate max-w-[150px]">
                      {new Date(vehicle.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
            })
          )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="p-4 border-t">
            <Pagination>
              <PaginationContent>
                <PaginationItem key="pagination-prev">
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <PaginationItem key={`pagination-page-${page}`}> 
                    <PaginationLink 
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem key="pagination-next">
                  <PaginationNext 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
      <Dialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder="Enter VIN"
                value={newVin}
                onChange={(e) => setNewVin(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={!newVin || isLoading}
              className="w-full"
            >
              {isLoading ? "Loading..." : "Save Vehicle"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}