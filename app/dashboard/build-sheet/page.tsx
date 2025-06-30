'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface BuildSheet {
  id: string;
  vin: string;
  year: string;
  make: string;
  model: string;
  engine: string;
  transmission: string;
  driveType: string;
  exteriorColor: string;
  interiorColor: string;
  wheelbase: string;
  trackWidth: string;
  grossVehicleWeight: string;
  payloadCapacity: string;
  towingCapacity: string;
  createdAt: string;
}

export default function BuildSheetPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [buildSheets, setBuildSheets] = useState<BuildSheet[]>([]);
  const [searchVIN, setSearchVIN] = useState('');

  const handleAddBuildSheet = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement build sheet creation
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Error adding build sheet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Build Sheets</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>Add Build Sheet</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Build Sheet History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Label htmlFor="vin">Search by VIN</Label>
                <Input
                  id="vin"
                  placeholder="Enter VIN"
                  value={searchVIN}
                  onChange={(e) => setSearchVIN(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-[calc(100vh-370px)] overflow-y-auto scrollbar-hide">
              <div className="grid gap-4">
                <div className="grid grid-cols-12 gap-4 border-b pb-2 font-medium text-muted-foreground">
                  <div className="col-span-2">VIN</div>
                  <div className="col-span-2">Year</div>
                  <div className="col-span-2">Make</div>
                  <div className="col-span-2">Model</div>
                  <div className="col-span-2">Engine</div>
                  <div className="col-span-2">Transmission</div>
                </div>
                <div className="grid grid-cols-12 gap-4 border-b pb-2">
                  <div className="col-span-2 text-sm">1HGCM82633A123456</div>
                  <div className="col-span-2 text-sm">2024</div>
                  <div className="col-span-2 text-sm">Honda</div>
                  <div className="col-span-2 text-sm">Accord</div>
                  <div className="col-span-2 text-sm">2.0L Turbo</div>
                  <div className="col-span-2 text-sm">10-Speed Auto</div>
                </div>
                <div className="grid grid-cols-12 gap-4 border-b pb-2">
                  <div className="col-span-2 text-sm">5TDZA23N13S123456</div>
                  <div className="col-span-2 text-sm">2024</div>
                  <div className="col-span-2 text-sm">Toyota</div>
                  <div className="col-span-2 text-sm">Sienna</div>
                  <div className="col-span-2 text-sm">2.5L Hybrid</div>
                  <div className="col-span-2 text-sm">E-CVT</div>
                </div>
                <div className="grid grid-cols-12 gap-4 border-b pb-2">
                  <div className="col-span-2 text-sm">1C4RJFAG5MC123456</div>
                  <div className="col-span-2 text-sm">2024</div>
                  <div className="col-span-2 text-sm">Jeep</div>
                  <div className="col-span-2 text-sm">Grand Cherokee</div>
                  <div className="col-span-2 text-sm">3.6L V6</div>
                  <div className="col-span-2 text-sm">8-Speed Auto</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Build Sheet</DialogTitle>
            <DialogDescription>
              Enter the VIN to fetch the build sheet information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="vin">VIN</Label>
              <Input
                id="vin"
                placeholder="Enter VIN"
                value={searchVIN}
                onChange={(e) => setSearchVIN(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBuildSheet} disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Build Sheet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 