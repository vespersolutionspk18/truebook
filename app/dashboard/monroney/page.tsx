'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface MonroneyData {
  id: string;
  vin: string;
  vehicleId: string;
  monroneyPairs: Array<{ property: string; value: string }>;
  createdAt: string;
  updatedAt: string;
}

const ITEMS_PER_PAGE = 20;

export default function MonroneyPage() {
  const router = useRouter();
  const [monroneyLabels, setMonroneyLabels] = useState<MonroneyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMake, setSelectedMake] = useState<string>('');
  const [selectedModelYear, setSelectedModelYear] = useState<string>('');

  async function fetchMonroneyLabels() {
    try {
      const response = await fetch('/api/monroney');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(
          response.status === 500
            ? 'Server error occurred while fetching Monroney labels'
            : 'Failed to fetch Monroney labels'
        );
      }
      const data = await response.json();
      setMonroneyLabels(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching Monroney labels:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch Monroney labels');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMonroneyLabels();
  }, []);

  const handleRowClick = (labelId: string) => {
    router.push(`/dashboard/monroney/${labelId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-6">
        <Card className="w-full max-w-md p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-red-500">{error}</p>
            <Button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchMonroneyLabels();
              }}
            >
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const sortedLabels = [...monroneyLabels].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  return (
    <div className="flex flex-col space-y-4">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Truebook</Link>
        <span>/</span>
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <span>/</span>
        <span className="text-foreground">Monroney</span>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Monroney</h1>
          <p className="text-sm text-muted-foreground">View and manage your vehicle's Monroney labels</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          <ArrowUpDown className="h-4 w-4 mr-2" />
          Sort
        </Button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Select value={selectedMake} onValueChange={setSelectedMake}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Make" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Makes</SelectItem>
                {/* Add make options dynamically */}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={selectedModelYear} onValueChange={setSelectedModelYear}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {/* Add year options dynamically */}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Input placeholder="Search by VIN..." />
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-medium">VIN</TableHead>
              <TableHead className="font-medium">Make</TableHead>
              <TableHead className="font-medium">Model</TableHead>
              <TableHead className="font-medium">Model Year</TableHead>
              <TableHead className="font-medium">Trim</TableHead>
              <TableHead className="font-medium">Vehicle Type</TableHead>
              <TableHead className="font-medium">Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLabels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No vehicles found
                </TableCell>
              </TableRow>
            ) : (
              sortedLabels.map((label) => (
                <TableRow 
                  key={label.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(label.id)}
                >
                  <TableCell className="font-medium">{label.vin}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>{new Date(label.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}