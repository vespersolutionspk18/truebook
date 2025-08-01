import * as pdfjs from "pdfjs-dist";

// Initialize PDF.js worker
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
}

export async function convertMonroneyToJSON(pdfBlob: Blob): Promise<{ [key: string]: any }> {
  try {
    const arrayBuffer = await new Response(pdfBlob).arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const extractedText = [];

    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Sort text items based on position (fixes order issues)
      const sortedItems = textContent.items.sort((a: any, b: any) => a.transform[5] - b.transform[5]);

      let lineText = "";
      let lastX = null;

      for (const item of sortedItems) {
        const text = item.str.trim();

        // Fix spacing between words
        if (lastX !== null && Math.abs(item.transform[4] - lastX) < 10) {
          lineText += text;
        } else {
          lineText += " " + text; // Add space between words
        }

        lastX = item.transform[4];
      }

      extractedText.push(lineText.trim());
    }

    // Combine text into a single readable format
    let fullText = extractedText.join("\n");

    console.log("Extracted Fixed Text from PDF:\n", fullText); // Debugging output

    // **Fix spacing issues (lowercase → Uppercase, letter → number, etc.)**
    fullText = fullText.replace(/([a-z])([A-Z])/g, "$1 $2"); // Insert space between lowercase → uppercase
    fullText = fullText.replace(/([a-zA-Z])(\d)/g, "$1 $2"); // Insert space between letter → number
    fullText = fullText.replace(/(\d)([A-Za-z])/g, "$1 $2"); // Insert space between number → letter

    // Send the raw text to Gemini for processing
    const { formatMonroneyWithAI } = await import('./gemini-monroney');
    
    try {
      // Send the raw text to Gemini for processing
      const formattedData = await formatMonroneyWithAI(fullText);
      
      // Flatten the nested JSON structure into key-value pairs
      const flattenedData = {};
      
      // Process manufacturer data
      if (formattedData.manufacturer) {
        Object.entries(formattedData.manufacturer).forEach(([key, value]) => {
          flattenedData[`manufacturer_${key}`] = value;
        });
      }
      
      // Process vehicle data
      if (formattedData.vehicle) {
        Object.entries(formattedData.vehicle).forEach(([key, value]) => {
          flattenedData[`vehicle_${key}`] = value;
        });
      }
      
      // Process pricing data
      if (formattedData.pricing) {
        Object.entries(formattedData.pricing).forEach(([key, value]) => {
          flattenedData[`pricing_${key}`] = value?.toString();
        });
      }
      
      // Process features data
      if (formattedData.features) {
        Object.entries(formattedData.features).forEach(([category, items]) => {
          if (Array.isArray(items)) {
            items.forEach((item, index) => {
              flattenedData[`feature_${category}_${index + 1}`] = item;
            });
          }
        });
      }
      
      // Process performance data
      if (formattedData.performance) {
        Object.entries(formattedData.performance).forEach(([key, value]) => {
          flattenedData[`performance_${key}`] = value;
        });
      }
      
      // Process fuel economy data
      if (formattedData.fuelEconomy) {
        Object.entries(formattedData.fuelEconomy).forEach(([key, value]) => {
          if (value !== null) {
            flattenedData[`fuelEconomy_${key}`] = value.toString();
          }
        });
      }
      
      // Process warranty data
      if (formattedData.warranty) {
        Object.entries(formattedData.warranty).forEach(([key, value]) => {
          flattenedData[`warranty_${key}`] = value;
        });
      }
      
      return flattenedData;
    } catch (aiError) {
      console.error("Error processing with Gemini:", aiError);
      throw new Error("Failed to process Monroney label with AI");
    }
  } catch (error) {
    console.error("Error converting PDF to JSON:", error);
    throw new Error("Failed to convert Monroney label to JSON");
  }
}
