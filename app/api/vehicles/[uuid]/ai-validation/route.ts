import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireOrganization } from '@/lib/auth';

export const POST = requireOrganization(async (request: NextRequest, context, { params }: { params: Promise<{ uuid: string }> }) => {
  try {
    console.log('AI Validation API called');
    const { uuid } = await params;
    console.log('Vehicle UUID:', uuid);
    
    if (!uuid) {
      return NextResponse.json({ error: 'UUID is required' }, { status: 400 });
    }

    console.log('Organization found:', context.organization.id);

    // Get vehicle with latest JD Power bookout and accessories
    const vehicle = await db.vehicle.findUnique({
      where: {
        uuid: uuid,
        organizationId: context.organization.id
      },
      include: {
        vehiclePairs: true, // CRITICAL: User-provided build sheet data
        monroney: {
          include: {
            monroneyPairs: true // CRITICAL: Window sticker data
          }
        },
        bookouts: {
          where: { provider: 'jdpower' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            accessories: true
          }
        },
        neoVin: {
          include: {
            installedOptionsDetails: true,
            features: true,
            highValueFeatures: true,
            installedEquipment: true,
            interiorColor: true,
            exteriorColor: true,
            warranty: true
          }
        }
      }
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const latestBookout = vehicle.bookouts[0];
    if (!latestBookout) {
      return NextResponse.json({ 
        error: 'No JD Power bookout found for this vehicle. Please generate a bookout first.' 
      }, { status: 404 });
    }

    // Extract build sheet features from ALL AVAILABLE SOURCES
    const buildSheetFeatures = [];
    
    console.log('FULL VEHICLE DATA FOR BUILD SHEET EXTRACTION:');
    console.log('VehiclePairs:', JSON.stringify(vehicle.vehiclePairs, null, 2));
    console.log('Monroney:', JSON.stringify(vehicle.monroney, null, 2));
    console.log('NeoVin:', JSON.stringify(vehicle.neoVin, null, 2));

    // PRIORITY 1: USER-PROVIDED VEHICLE DATA (vehiclePairs) - MOST AUTHORITATIVE
    if (vehicle.vehiclePairs && vehicle.vehiclePairs.length > 0) {
      console.log('EXTRACTING USER-PROVIDED BUILD SHEET DATA...');
      vehicle.vehiclePairs.forEach(pair => {
        buildSheetFeatures.push({
          key: `User Specified - ${pair.property}`,
          value: `${pair.value} (User-provided authoritative data)`
        });
      });
    }

    // PRIORITY 2: MONRONEY WINDOW STICKER DATA (if available)
    if (vehicle.monroney && vehicle.monroney.monroneyPairs && vehicle.monroney.monroneyPairs.length > 0) {
      console.log('EXTRACTING MONRONEY WINDOW STICKER DATA...');
      vehicle.monroney.monroneyPairs.forEach(pair => {
        buildSheetFeatures.push({
          key: `Monroney Label - ${pair.property}`,
          value: `${pair.value} (Official window sticker data)`
        });
      });
    }

    // PRIORITY 3: NEOVIN DECODED DATA (MarketCheck API)
    if (vehicle.neoVin) {
      console.log('EXTRACTING NEOVIN DECODED DATA...');
      
      // Add vehicle basic specs that might correspond to accessories
      buildSheetFeatures.push({
        key: 'Vehicle Specification',
        value: `${vehicle.neoVin.year} ${vehicle.neoVin.make} ${vehicle.neoVin.model} ${vehicle.neoVin.trim || ''} - Engine: ${vehicle.neoVin.engine || 'N/A'} - Transmission: ${vehicle.neoVin.transmission || 'N/A'} - Drivetrain: ${vehicle.neoVin.drivetrain || 'N/A'}`
      });

      // Add powertrain details
      if (vehicle.neoVin.engine || vehicle.neoVin.fuelType || vehicle.neoVin.transmission) {
        buildSheetFeatures.push({
          key: 'Powertrain Package',
          value: `Engine: ${vehicle.neoVin.engine || 'N/A'} - Fuel: ${vehicle.neoVin.fuelType || 'N/A'} - Transmission: ${vehicle.neoVin.transmission || 'N/A'} - Drivetrain: ${vehicle.neoVin.drivetrain || 'N/A'}`
        });
      }

      // Add color options (often correspond to paint packages in JD Power)
      if (vehicle.neoVin.exteriorColor) {
        buildSheetFeatures.push({
          key: 'Exterior Color Package',
          value: `${vehicle.neoVin.exteriorColor.name || 'N/A'} (Code: ${vehicle.neoVin.exteriorColor.code || 'N/A'})`
        });
      }
      
      if (vehicle.neoVin.interiorColor) {
        buildSheetFeatures.push({
          key: 'Interior Color Package',
          value: `${vehicle.neoVin.interiorColor.name || 'N/A'} (Code: ${vehicle.neoVin.interiorColor.code || 'N/A'})`
        });
      }

      // Add options packages (this is critical!)
      if (vehicle.neoVin.optionsPackages) {
        buildSheetFeatures.push({
          key: 'Factory Options Packages',
          value: vehicle.neoVin.optionsPackages
        });
      }

      // Add installed options (Options tab)
      if (vehicle.neoVin.installedOptionsDetails) {
        vehicle.neoVin.installedOptionsDetails.forEach(option => {
          buildSheetFeatures.push({
            key: `Factory Installed Option - ${option.code}`,
            value: `${option.name} (${option.type || 'N/A'}) - MSRP: ${option.msrp || 'N/A'}`
          });
        });
      }
      
      // Add all features (All Features tab)
      if (vehicle.neoVin.features) {
        vehicle.neoVin.features.forEach(feature => {
          buildSheetFeatures.push({
            key: `${feature.category} Feature`,
            value: `${feature.description} (${feature.featureType}) - Code: ${feature.optionCode}`
          });
        });
      }
      
      // Add high value/premium features (Premium Features tab)
      if (vehicle.neoVin.highValueFeatures) {
        vehicle.neoVin.highValueFeatures.forEach(feature => {
          buildSheetFeatures.push({
            key: `Premium Feature - ${feature.category}`,
            value: `${feature.description} - Code: ${feature.optionCode}`
          });
        });
      }
      
      // Add installed equipment
      if (vehicle.neoVin.installedEquipment) {
        vehicle.neoVin.installedEquipment.forEach(equipment => {
          buildSheetFeatures.push({
            key: `${equipment.category} Equipment`,
            value: `${equipment.item}: ${equipment.value} (${equipment.attribute})`
          });
        });
      }

      // Add body and performance specs that might relate to accessories
      if (vehicle.neoVin.bodyType || vehicle.neoVin.doors || vehicle.neoVin.seatingCapacity) {
        buildSheetFeatures.push({
          key: 'Body Configuration',
          value: `Body: ${vehicle.neoVin.bodyType || 'N/A'} - Doors: ${vehicle.neoVin.doors || 'N/A'} - Seating: ${vehicle.neoVin.seatingCapacity || 'N/A'}`
        });
      }

      // Add fuel economy (might relate to efficiency packages)
      if (vehicle.neoVin.cityMpg || vehicle.neoVin.highwayMpg || vehicle.neoVin.combinedMpg) {
        buildSheetFeatures.push({
          key: 'Fuel Economy Package',
          value: `City: ${vehicle.neoVin.cityMpg || 'N/A'} MPG - Highway: ${vehicle.neoVin.highwayMpg || 'N/A'} MPG - Combined: ${vehicle.neoVin.combinedMpg || 'N/A'} MPG`
        });
      }

      // Add warranty information
      if (vehicle.neoVin.warranty) {
        buildSheetFeatures.push({
          key: 'Warranty Package',
          value: `Basic: ${vehicle.neoVin.warranty.basicDuration || 'N/A'}/${vehicle.neoVin.warranty.basicDistance || 'N/A'} - Powertrain: ${vehicle.neoVin.warranty.powertrainDuration || 'N/A'}/${vehicle.neoVin.warranty.powertrainDistance || 'N/A'}`
        });
      }
    }
    
    console.log('Build sheet features found:', buildSheetFeatures.length);
    console.log('Sample features:', buildSheetFeatures.slice(0, 3));

    if (buildSheetFeatures.length === 0) {
      return NextResponse.json({
        error: 'No build sheet data found. Please decode the VIN in the Build Sheet tab first.'
      }, { status: 404 });
    }

    // Get bookout accessories
    const bookoutAccessories = latestBookout.accessories.map(acc => ({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      category: acc.category,
      msrp: acc.msrp,
      cleanTradeAdj: acc.cleanTradeAdj,
      cleanRetailAdj: acc.cleanRetailAdj,
      loanAdj: acc.loanAdj,
      isFactoryInstalled: acc.isFactoryInstalled,
      isSelected: acc.isSelected, // CRITICAL: Current selection status
      isAvailable: acc.isAvailable // CRITICAL: Availability status
    }));

    if (bookoutAccessories.length === 0) {
      return NextResponse.json({
        error: 'No accessories found in the JD Power bookout to validate.'
      }, { status: 404 });
    }

    // Initialize Gemini API
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        error: 'Gemini API key not configured'
      }, { status: 500 });
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    // Create comprehensive prompt for Gemini
    const prompt = `
You are an expert automotive analyst. Your task is to use the BUILD SHEET as the PRIMARY AUTHORITY for accessory validation. The build sheet determines what should be in the final bookout.

**CRITICAL PRINCIPLE: BUILD SHEET TAKES PRIMACY**
- Build sheet features are the DEFINITIVE source of what accessories this vehicle actually has
- If something is in the bookout but NOT in the build sheet, it should be REMOVED (mark as NOT_FOUND)
- If something is in the build sheet but NOT in the bookout, find the closest matching bookout accessory to ADD

**VEHICLE:**
${latestBookout.year} ${latestBookout.make} ${latestBookout.model} ${latestBookout.trim}
VIN: ${vehicle.vin}

**JD POWER BOOKOUT ACCESSORIES (to be validated against build sheet):**
${bookoutAccessories.map((acc, idx) => {
  const status = acc.isSelected ? 'CURRENTLY SELECTED' : 'NOT SELECTED';
  const availability = acc.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE';
  return `${idx + 1}. [${acc.code}] ${acc.name} (${acc.category || 'N/A'}) - ${status} - ${availability} - Trade: $${acc.cleanTradeAdj || 0}, Retail: $${acc.cleanRetailAdj || 0}, Loan: $${acc.loanAdj || 0}${acc.isFactoryInstalled ? ' - FACTORY INSTALLED' : ''}`;
}).join('\n')}

**BUILD SHEET FEATURES (PRIMARY AUTHORITY - WHAT THE VEHICLE ACTUALLY HAS):**
**DATA SOURCES (in order of authority):**
1. User-Provided Data (vehiclePairs) - HIGHEST AUTHORITY
2. Monroney Window Sticker Data - OFFICIAL FACTORY DATA  
3. NeoVin Decoded Data - MARKETCHECK API DATA

${buildSheetFeatures.length > 0 ? 
  buildSheetFeatures.map((feature, idx) => `${idx + 1}. ${feature.key}: ${feature.value}`).join('\n') : 'No build sheet features available'}

**VALIDATION APPROACH - BUILD SHEET IS THE TRUTH:**
1. **STEP 1**: For each JD Power accessory → Does this accessory match ANY build sheet feature above?
   - If YES: Mark as CONFIRMED/PARTIAL_MATCH (keep in bookout)
   - If NO: Mark as NOT_FOUND (remove from bookout - vehicle doesn't actually have this)

2. **STEP 2**: For each build sheet feature → Is there a JD Power accessory that represents this?
   - If YES: Include in comparisons with CONFIRMED/PARTIAL_MATCH
   - If NO: List in "missing_from_bookout" (JD Power missing this feature)

**CRITICAL EXAMPLES OF BUILD SHEET PRIMACY:**
- Build sheet shows "Heated Seats" but JD Power bookout has "Sunroof" → REMOVE sunroof (NOT_FOUND), ADD heated seats if available
- Build sheet shows "Premium Package" but JD Power only has individual items → Match individual items to package contents
- Build sheet shows specific paint code but JD Power has different color → Use build sheet color as authority

**MATCHING RULES:**
- Be flexible with naming: "Heated Seats" = "SEATS-HEATED" = "HTD SEATS" = "Seat Heating"
- Look for partial matches: "Navigation" matches "Nav System", "GPS", "Infotainment"
- Consider packages: "Premium Package" may include multiple individual accessories
- Account for abbreviations: "PWR" = "Power", "HTD" = "Heated", "AUTO" = "Automatic"
- Match by function, not exact wording: "Backup Camera" = "Rear View Camera" = "Reversing Camera"

**VALIDATION STATUS LOGIC (BUILD SHEET FOCUSED):**
- CONFIRMED: JD Power accessory matches build sheet feature exactly - KEEP/ADD to bookout
- PARTIAL_MATCH: JD Power accessory relates to build sheet feature but imperfect match - KEEP/ADD to bookout
- NOT_FOUND: JD Power accessory has NO corresponding build sheet feature - REMOVE from bookout
- REQUIRES_REVIEW: Complex case needing manual verification
- PACKAGE_ITEM: Part of a broader feature package in build sheet

**CRITICAL:** If a JD Power accessory cannot be matched to ANY build sheet feature, mark it as NOT_FOUND for removal.

**AI INSIGHTS REQUIREMENTS:**
- "missing_from_bookout": List build sheet features that have NO MATCHING JD Power accessories available (these represent gaps in JD Power's accessory database)
- "potential_overvaluation": List JD Power accessories that appear overpriced for this trim level
- "potential_undervaluation": List JD Power accessories that appear underpriced for this trim level  
- "trim_level_analysis": Provide comprehensive analysis of how well this JD Power bookout represents the actual build sheet configuration

**FOR BUILD SHEET FEATURES NOT FOUND IN BOOKOUT:**
If a build sheet feature exists but you cannot find ANY similar JD Power accessory, list it in "missing_from_bookout". 
If you find a close match in the JD Power list, include it in comparisons with appropriate status.

**CRITICAL REQUIREMENT:**
You MUST include a comparison entry for EVERY SINGLE JD Power accessory listed above (all ${bookoutAccessories.length} accessories).
Even if an accessory has no match in the build sheet, you MUST include it with validation_status: "NOT_FOUND".
The comparisons array MUST have exactly ${bookoutAccessories.length} entries - one for each JD Power accessory.

**OUTPUT JSON:**
{
  "summary": {
    "total_accessories": ${bookoutAccessories.length},
    "confirmed_matches": 0,
    "partial_matches": 0,
    "not_found": 0,
    "requires_review": 0,
    "package_items": 0,
    "overall_confidence": "HIGH|MEDIUM|LOW"
  },
  "comparisons": [
    {
      "jd_power_accessory": {
        "code": "${bookoutAccessories[0]?.code}",
        "name": "${bookoutAccessories[0]?.name}",
        "type": "${bookoutAccessories[0]?.type || 'N/A'}",
        "category": "${bookoutAccessories[0]?.category || 'N/A'}",
        "trade_value": ${bookoutAccessories[0]?.cleanTradeAdj || 0},
        "retail_value": ${bookoutAccessories[0]?.cleanRetailAdj || 0},
        "loan_value": ${bookoutAccessories[0]?.loanAdj || 0}
      },
      "build_sheet_match": {
        "matched_feature": "exact feature name from build sheet or null",
        "feature_value": "exact feature value from build sheet or null"
      },
      "validation_status": "CONFIRMED",
      "confidence_score": 85,
      "notes": "Brief explanation of match logic",
      "value_assessment": "APPROPRIATE",
      "recommendations": "Brief action recommendation"
    }
  ],
  "insights": {
    "missing_from_bookout": ["Features found in build sheet but not included in JD Power bookout valuation"],
    "potential_overvaluation": ["Accessories that appear overvalued based on market data and standard equipment"],
    "potential_undervaluation": ["Accessories that appear undervalued and may warrant higher pricing"],
    "trim_level_analysis": "Detailed analysis of this specific trim level's standard equipment versus optional accessories, market positioning, competitive analysis, and overall value assessment relative to similar vehicles"
  }
}

Focus on intelligent matching rather than exact string matches. Most automotive features have corresponding build sheet entries with different terminology.
`;

    console.log('Sending request to Gemini API...');
    console.log('API URL:', API_URL);
    console.log('Request body preview:', {
      contents_length: 1,
      prompt_length: prompt.length
    });

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

    console.log('Gemini response status:', response.status);
    console.log('Gemini response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText };
      }
      
      throw new Error(`Gemini API request failed: ${errorData.error?.message || errorData.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('Gemini response data structure:', {
      has_candidates: !!data.candidates,
      candidates_length: data.candidates?.length,
      has_content: !!data.candidates?.[0]?.content,
      has_parts: !!data.candidates?.[0]?.content?.parts,
      parts_length: data.candidates?.[0]?.content?.parts?.length
    });
    
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      console.error('Invalid Gemini response structure:', JSON.stringify(data, null, 2));
      throw new Error('Invalid response format from Gemini API');
    }

    const text = data.candidates[0].content.parts[0].text.trim();
    console.log('Gemini response text length:', text.length);
    console.log('Gemini response preview:', text.substring(0, 200) + '...');

    // Parse the JSON response
    let validationResult;
    try {
      // Clean the response text - remove markdown formatting if present
      let responseText = text;
      
      // Remove markdown code block formatting
      responseText = responseText.replace(/^```(?:json)?\s*\n?/i, '');
      responseText = responseText.replace(/\n?```\s*$/i, '');
      
      // Try to extract JSON object from the text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseText = jsonMatch[0];
      }
      
      console.log('Attempting to parse JSON:', responseText.substring(0, 100) + '...');
      validationResult = JSON.parse(responseText);
      console.log('Successfully parsed validation result');
      
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError);
      console.error('Raw text that failed to parse:', text);
      return NextResponse.json({
        error: 'Failed to parse AI response',
        details: 'The AI returned an invalid response format',
        raw_response: text,
        parse_error: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      }, { status: 500 });
    }

    // Save the validation result to database for future reference
    const validation = await db.aIValidation.create({
      data: {
        vehicleId: vehicle.uuid,
        bookoutId: latestBookout.id,
        provider: 'gemini',
        validationType: 'accessory_comparison',
        inputData: {
          bookout_accessories: bookoutAccessories,
          build_sheet_features: buildSheetFeatures
        },
        outputData: validationResult,
        prompt: prompt,
        rawResponse: text
      }
    });

    console.log('Validation saved to database with ID:', validation.id);

    // CREATE SNAPSHOT BEFORE MAKING ANY CHANGES
    const { BookoutSnapshotManager } = await import('@/lib/bookout-snapshot');
    const snapshotManager = new BookoutSnapshotManager(validation.id, latestBookout.id);
    
    try {
      await snapshotManager.createSnapshot(
        'pre_validation', 
        `Snapshot before AI validation using ${validation.provider}`
      );
      console.log('Bookout snapshot created successfully');
    } catch (snapshotError) {
      console.error('Failed to create bookout snapshot:', snapshotError);
      // Continue with validation even if snapshot fails
    }

    // CREATE VALIDATION SESSION instead of auto-applying changes
    try {
      // Create validation session with 24-hour expiry
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      const session = await db.validationSession.create({
        data: {
          validationId: validation.id,
          vehicleId: vehicle.uuid,
          bookoutId: latestBookout.id,
          expiresAt: expiresAt
        }
      });

      console.log('Created validation session:', session.id);

      // Get current accessory selections
      const currentAccessories = await db.bookoutAccessory.findMany({
        where: { bookoutId: latestBookout.id }
      });

      console.log('AI Validation debug:', {
        totalBookoutAccessories: currentAccessories.length,
        totalComparisons: validationResult.comparisons.length,
        bookoutAccessoryCodes: currentAccessories.map(a => a.code),
        comparisonAccessoryCodes: validationResult.comparisons.map((c: any) => c.jd_power_accessory.code)
      });

      // Log NOT_FOUND accessories
      const notFoundComparisons = validationResult.comparisons.filter((comp: any) => 
        comp.validation_status === 'NOT_FOUND'
      );
      console.log(`AI Validation found ${notFoundComparisons.length} NOT_FOUND accessories:`);
      notFoundComparisons.forEach((comp: any) => {
        const currentAcc = currentAccessories.find(acc => acc.code === comp.jd_power_accessory.code);
        console.log(`  - ${comp.jd_power_accessory.code} (${comp.jd_power_accessory.name})`);
        console.log(`    - Currently selected: ${currentAcc?.isSelected}`);
        console.log(`    - Reason: ${comp.notes}`);
      });

      // Create override records for ALL accessories so user can override any of them
      const overridePromises = validationResult.comparisons.map(async (comp: any) => {
        const currentAccessory = currentAccessories.find(acc => acc.code === comp.jd_power_accessory.code);
        const isCurrentlySelected = currentAccessory?.isSelected || false;
        
        // Determine what build sheet says to do
        let buildSheetSays = 'NO_CHANGE';
        if (comp.validation_status === 'CONFIRMED' || comp.validation_status === 'PARTIAL_MATCH') {
          buildSheetSays = 'SELECT';
        } else if (comp.validation_status === 'NOT_FOUND') {
          buildSheetSays = 'DESELECT';
          console.log(`Creating DESELECT override for ${comp.jd_power_accessory.code} - currently selected: ${isCurrentlySelected}`);
        }

        console.log(`Creating override for ${comp.jd_power_accessory.code}:`, {
          validationStatus: comp.validation_status,
          currentlySelected: isCurrentlySelected,
          aiRecommendation: buildSheetSays,
          willNeedDeselection: buildSheetSays === 'DESELECT' && isCurrentlySelected
        });

        // Create override record for EVERY accessory
        return db.accessoryOverride.create({
          data: {
            sessionId: session.id,
            accessoryCode: comp.jd_power_accessory.code,
            accessoryName: comp.jd_power_accessory.name,
            aiRecommendation: buildSheetSays,
            originalSelected: isCurrentlySelected,
            keepJdPower: false // Default: follow build sheet recommendation
          }
        });
      });

      const overrides = await Promise.all(overridePromises.filter(Boolean));
      console.log('Created override records:', overrides.length);
      

      // CRITICAL: Check if we have override records for ALL accessories
      if (overrides.length !== currentAccessories.length) {
        console.warn(`WARNING: Only created ${overrides.length} override records for ${currentAccessories.length} accessories!`);
        
        // Create override records for any missing accessories
        const coveredCodes = new Set(overrides.map(o => o?.accessoryCode).filter(Boolean));
        const missingAccessories = currentAccessories.filter(acc => !coveredCodes.has(acc.code));
        
        if (missingAccessories.length > 0) {
          console.log(`Creating override records for ${missingAccessories.length} missing accessories`);
          const missingOverrides = await Promise.all(
            missingAccessories.map(acc => 
              db.accessoryOverride.create({
                data: {
                  sessionId: session.id,
                  accessoryCode: acc.code,
                  accessoryName: acc.name,
                  aiRecommendation: 'NO_CHANGE', // No AI recommendation for these
                  originalSelected: acc.isSelected,
                  keepJdPower: false // Default: follow current state
                }
              })
            )
          );
          overrides.push(...missingOverrides);
        }
      }

      // Calculate summary statistics
      const recommendedSelections = overrides.filter(o => o?.aiRecommendation === 'SELECT').length;
      const recommendedDeselections = overrides.filter(o => o?.aiRecommendation === 'DESELECT').length;

      // Add session info to response
      validationResult.session = {
        id: session.id,
        status: 'pending',
        expiresAt: session.expiresAt,
        changes_pending: {
          recommendations_to_add: recommendedSelections,
          recommendations_to_remove: recommendedDeselections,
          total_changes: recommendedSelections + recommendedDeselections
        }
      };

      // Remove old auto_selection field to avoid confusion
      delete validationResult.auto_selection;

    } catch (sessionError) {
      console.error('Error creating validation session:', sessionError);
      validationResult.session = {
        error: 'Failed to create validation session',
        details: sessionError instanceof Error ? sessionError.message : 'Unknown error'
      };
    }

    return NextResponse.json({
      validation_id: validation.id,
      session_id: validationResult.session?.id || null,
      vehicle: {
        vin: vehicle.vin,
        year: latestBookout.year,
        make: latestBookout.make,
        model: latestBookout.model,
        trim: latestBookout.trim
      },
      bookout_date: latestBookout.createdAt,
      result: validationResult
    });

  } catch (error: any) {
    console.error('Error in AI validation:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause
    });
    
    if (error.message?.includes('API key')) {
      return NextResponse.json({
        error: 'Invalid Gemini API key',
        details: 'Please check your Gemini API key configuration'
      }, { status: 500 });
    }

    return NextResponse.json({
      error: 'Failed to perform AI validation',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
});