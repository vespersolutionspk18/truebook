


const GEMINI_API_KEY = "AIzaSyAgVaHwEucEhgpU6wVSnS0K_BKmyyQ2xhk";
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is not set");
}

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function formatMonroneyWithAI(rawMonroneyData: any): Promise<any> {
  try {
    console.log('Raw Monroney data being sent to Gemini:', JSON.stringify(rawMonroneyData, null, 2));

    const prompt = `
      Format and clean the following Monroney label data into a well-structured JSON.
      Ensure all values are properly formatted and categorized.
      If a value is missing or empty, exclude it from the output. remove extra spaces too, this is a car window sticker pdf parsed to json
      
      Input data:
      ${JSON.stringify(rawMonroneyData, null, 2)}
      
      Please format it into a clean JSON with the following structure:
      {
        "manufacturer": {
          "name": string,
          "location": string
        },
        "vehicle": {
          "vin": string,
          "year": string,
          "make": string,
          "model": string,
          "trim": string,
          "bodyStyle": string,
          "transmission": string,
          "engine": string
        },
        "pricing": {
          "basePrice": number,
          "totalOptions": number,
          "destinationCharge": number,
          "totalPrice": number
        },
        "features": {
          "exterior": string[],
          "interior": string[],
          "safety": string[],
          "convenience": string[]
        },
        "performance": {
          "engine": string,
          "transmission": string,
          "drivetrain": string,
          "fuelType": string
        },
        "fuelEconomy": {
          "city": number,
          "highway": number,
          "combined": number
        },
        "warranty": {
          "basic": string,
          "powertrain": string,
          "corrosion": string,
          "roadside": string
        }
      }
    `;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API request failed: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from Gemini API');
    }

    try {
      // Clean and validate the response text
      let responseText = data.candidates[0].content.parts[0].text.trim();
      
      // If response starts with markdown code block, extract the JSON content
      if (responseText.startsWith('```json')) {
        responseText = responseText.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (responseText.startsWith('```')) {
        responseText = responseText.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      
      // Attempt to parse the cleaned response
      const formattedData = JSON.parse(responseText);
      return formattedData;
    } catch (parseError) {
      console.error('Error parsing Gemini API response:', parseError);
      console.error('Raw response:', data.candidates[0]?.content?.parts?.[0]?.text);
      throw new Error('Failed to parse Gemini API response');
    }
  } catch (error) {
    console.error('Error formatting Monroney data with AI:', error);
    throw error;
  }
}