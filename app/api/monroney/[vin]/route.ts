import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request, { params }: { params: { vin: string } }) {
  const { vin } = params;

  if (!vin) {
    return NextResponse.json({ error: 'VIN is required' }, { status: 400 });
  }

  // Path to Monroney PDFs in public directory
  const pdfPath = path.join(process.cwd(), 'public', 'monroneys', `${vin}.pdf`);

  try {
    // Check if the PDF exists
    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json(
        { error: 'Monroney label not found for this VIN' },
        { status: 404 }
      );
    }

    // Read the PDF file
    const pdfBuffer = fs.readFileSync(pdfPath);

    // Create and return the response with appropriate headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${vin}.pdf"`
      }
    });
  } catch (error) {
    console.error('Error serving Monroney label:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}