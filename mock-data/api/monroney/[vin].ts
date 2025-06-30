import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { vin } = req.query;

  if (!vin || typeof vin !== 'string') {
    return res.status(400).json({ error: 'VIN is required' });
  }

  // Path to mock Monroney PDFs in public directory
  const pdfPath = path.join(process.cwd(), 'public', 'monroneys', `${vin}.pdf`);

  try {
    // Check if the PDF exists
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: 'Monroney label not found for this VIN' });
    }

    // In development, we'll serve the PDF directly from the public directory
    // In production, this would be replaced with actual API integration
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${vin}.pdf"`);
    
    const fileStream = fs.createReadStream(pdfPath);
    return fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving Monroney label:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}