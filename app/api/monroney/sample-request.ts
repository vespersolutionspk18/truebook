import { useState } from 'react';
import { convertMonroneyToJSON } from '@/lib/pdf-to-json';

// Function to fetch Monroney PDF
export async function fetchMonroneyPDF(vin: string): Promise<void> {
  try {
    // Make GET request to the Monroney API endpoint
    const response = await fetch(`/api/monroney/${vin}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf',
      },
    });

    if (!response.ok) {
      // Handle different error cases
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

    // Get the PDF data as a Blob
    const pdfBlob = await response.blob();
    
    // Convert the PDF to JSON
    const jsonData = await convertMonroneyToJSON(pdfBlob);
    console.log('Monroney Label JSON:', jsonData);

  } catch (error) {
    console.error('Error fetching Monroney label:', error);
    throw error;
  }
}

// Example usage in a React component
export function MonroneyViewer() {
  const [error, setError] = useState<string | null>(null);
  const [monroneyData, setMonroneyData] = useState<any>(null);

  const handleViewMonroney = async (vin: string) => {
    try {
      setError(null);
      await fetchMonroneyPDF(vin);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch Monroney label');
    }
  };

  return {
    handleViewMonroney,
    error,
    monroneyData
  };
}

// Example usage:
// const { handleViewMonroney, error, monroneyData } = MonroneyViewer();
// await handleViewMonroney('3MW5R7J02M8B63129'); // Using one of the sample VINs from the mock data