import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
// Using fast-xml-parser for reliable XML parsing in Deno
import { XMLParser } from 'https://esm.sh/fast-xml-parser@4.3.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Centralized XML URL - can be overridden via REDSP_XML_URL secret
const getXmlUrl = () => Deno.env.get('REDSP_XML_URL') || 'https://xml.redsp.net/files/416/27423pmn36o/test-redsp_v4.xml';

interface SyncStats {
  total_in_xml: number;
  processed: number;
  new_properties: number;
  updated_properties: number;
  price_changes: number;
  errors: number;
  has_more: boolean;
  next_offset?: number;
}

// Map XML status to our database status
function mapStatus(xmlStatus: string | null): string {
  if (!xmlStatus) return 'available';
  return 'available'; // Default for now, can be extended based on XML values
}

// Map XML property type to our database type
function mapPropertyType(xmlType: string | null): string {
  if (!xmlType) return 'appartement';
  
  const typeMap: Record<string, string> = {
    'town house': 'townhouse',
    'apartment': 'appartement',
    'villa': 'villa',
    'penthouse': 'penthouse',
    'duplex': 'duplex',
    'finca': 'finca',
    'plot': 'grond',
    'land': 'grond',
  };
  
  const lowerType = xmlType.toLowerCase();
  return typeMap[lowerType] || lowerType;
}

// Extract images from XML images node
function extractImages(imagesNode: any): string[] {
  const images: string[] = [];
  
  if (!imagesNode || !imagesNode.image) return images;
  
  const imageArray = Array.isArray(imagesNode.image) ? imagesNode.image : [imagesNode.image];
  
  for (const img of imageArray) {
    const url = img?.url;
    if (url && typeof url === 'string') {
      images.push(url.trim());
    }
  }
  
  return images;
}

// Extract features from features node
function extractFeatures(featuresNode: any): string[] {
  const features: string[] = [];
  
  if (!featuresNode) return features;
  
  // Map of feature keys to display names
  const featureMap: Record<string, string> = {
    'Air_Conditioning': 'Airconditioning',
    'Appliances': 'Apparatuur',
    'Armored_Door': 'Gepantserde deur',
    'bbq': 'BBQ',
    'corner': 'Hoeklocatie',
    'coworking': 'Coworking',
    'domotics': 'Domotica',
    'electric_blinds': 'Elektrische rolluiken',
    'furnished': 'Gemeubileerd',
    'games_room': 'Speelkamer',
    'garden': 'Tuin',
    'gated': 'Beveiligde gemeenschap',
    'gym': 'Sportschool',
    'heating': 'Verwarming',
    'jacuzzi': 'Jacuzzi',
    'laundry_room': 'Wasruimte',
    'lift': 'Lift',
    'patio': 'Patio',
    'safe_box': 'Kluis',
    'solarium': 'Solarium',
    'spa': 'Spa',
    'storage': 'Berging',
  };
  
  for (const [key, displayName] of Object.entries(featureMap)) {
    if (featuresNode[key] === '1' || featuresNode[key] === 1) {
      features.push(displayName);
    }
  }
  
  return features;
}

// Parse a numeric value safely
function parseNumeric(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) || parsed === 0 ? null : parsed;
}

// Parse an integer value safely
function parseInteger(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed === 0 ? null : parsed;
}

// Parse boolean value - returns true only if explicitly true (1), null otherwise
function parseBoolean(value: string | number | null | undefined): boolean | null {
  if (value === null || value === undefined) return null;
  if (value === 1 || value === '1' || (typeof value === 'string' && value.toLowerCase() === 'true')) return true;
  if (value === 0 || value === '0' || (typeof value === 'string' && value.toLowerCase() === 'false')) return false;
  return null;
}

// Get text content from XML element
function getTextContent(node: any, path?: string): string | null {
  if (!node) return null;
  if (path) {
    // Handle nested paths like "address.town"
    const parts = path.split('.');
    let current = node;
    for (const part of parts) {
      current = current?.[part];
      if (!current) return null;
    }
    return typeof current === 'string' ? current.trim() || null : null;
  }
  return typeof node === 'string' ? node.trim() || null : null;
}

// Map XML property to database property object
function mapXmlToProperty(property: any, index: number): any {
  // Log structure for first property
  if (index === 0) {
    console.log('[RedSP Sync] First property ref:', property.ref);
    console.log('[RedSP Sync] First property type:', property.type);
    console.log('[RedSP Sync] First property structure keys:', Object.keys(property));
  }
  
  const ref = property.ref;
  
  if (!ref) {
    console.warn('[RedSP Sync] Property without ref found, skipping');
    return null;
  }
  
  const images = extractImages(property.images);
  const features = extractFeatures(property.features);
  
  // Parse nested address
  const address = property.address || {};
  const city = address.town || null;
  const region = address.province || null;
  const postal_code = address.postal_code || null;
  const address_detail = address.address_detail || null;
  const address_number = address.address_number || null;
  const full_address = [address_detail, address_number].filter(Boolean).join(' ') || null;
  
  // Parse nested location
  const location = property.location || {};
  const latitude = parseNumeric(location.latitude);
  const longitude = parseNumeric(location.longitude);
  
  // Parse nested surface_area
  const surfaceArea = property.surface_area || {};
  const area_sqm = parseNumeric(surfaceArea.built_m2);
  const usable_area_sqm = parseNumeric(surfaceArea.usable_living_area_m2);
  const terrace_area_sqm = parseNumeric(surfaceArea.terrace_m2);
  const plot_size_sqm = parseNumeric(surfaceArea.plot_m2);
  const solarium_area = parseNumeric(surfaceArea.solarium_area_m2);
  const garden_area = parseNumeric(surfaceArea.garden_m2);
  
  // Parse nested distances
  const distances = property.distances || {};
  const distance_to_beach_m = parseInteger(distances.distance_to_beach_m);
  const distance_to_airport_km = parseInteger(distances.distance_airport_m);
  const distance_to_golf_m = parseInteger(distances.distance_golf_m);
  const distance_to_shops_m = parseInteger(distances.distance_amenities_m);
  
  // Parse nested energy_rating
  const energyRating = property.energy_rating || {};
  const energy_rating = energyRating.consumption || null;
  
  // Parse nested pools
  const pools = property.pools || {};
  const pool = parseBoolean(pools.pool);
  const communal_pool = parseBoolean(pools.communal_pool);
  const private_pool = parseBoolean(pools.private_pool);
  
  // Parse nested parking
  const parking = property.parking || {};
  const parking_spaces = parseInteger(parking.number_of_parking_spaces);
  const garage_spaces = parseInteger(parking.number_of_garage_spaces);
  
  // Parse nested views
  const views = property.views || {};
  const sea_views = parseBoolean(views.sea_views);
  const mountain_views = parseBoolean(views.mountain_views);
  const garden_views = parseBoolean(views.garden_views);
  const pool_views = parseBoolean(views.pool_views);
  const open_views = parseBoolean(views.open_views);
  const village_views = parseBoolean(views.village_views);
  
  // Parse nested category
  const category = property.category || {};
  const category_urban = parseBoolean(category.urban);
  const category_beach = parseBoolean(category.beach);
  const category_golf = parseBoolean(category.golf);
  const category_countryside = parseBoolean(category.countryside);
  const category_first_line = parseBoolean(category.first_line);
  const category_tourist = parseBoolean(category.tourist_property);
  
  // Parse nested features node for specific features
  const featuresObj = property.features || {};
  const airconditioning = parseBoolean(featuresObj.Air_Conditioning);
  const furnished = parseBoolean(featuresObj.furnished);
  const garden = parseBoolean(featuresObj.garden);
  const gated = parseBoolean(featuresObj.gated);
  const elevator = parseBoolean(featuresObj.lift);
  const heating = parseBoolean(featuresObj.heating);
  const storage_room = parseBoolean(featuresObj.storage);
  const solarium = parseBoolean(featuresObj.solarium);
  const alarm = parseBoolean(featuresObj.safe_box);
  
  // Get multilingual titles and descriptions
  const title = property.title || {};
  const title_en = title.en || null;
  const title_nl = title.nl || null;
  
  const desc = property.desc || {};
  const description_en = desc.en || null;
  const description_nl = desc.nl || null;
  const description_es = desc.es || null;
  
  return {
    api_source: 'redsp',
    api_id: ref,
    development_id: property.development_ref || null,
    title: title_nl || title_en || 'Onbekende titel',
    description: description_nl,
    description_en: description_en,
    description_es: description_es,
    
    // Price & costs
    price: parseNumeric(property.price),
    // No community fees or taxes in this XML structure
    
    // Areas
    area_sqm,
    usable_area_sqm,
    plot_size_sqm,
    terrace_area_sqm,
    
    // Specifications
    property_type: mapPropertyType(property.type),
    bedrooms: parseInteger(property.beds),
    beds_single: parseInteger(property.beds_single),
    beds_double: parseInteger(property.beds_double),
    bathrooms: parseNumeric(property.baths),
    toilets: parseInteger(property.toilets_wc),
    year_built: parseInteger(property.year_build),
    energy_rating,
    orientation: property.orientation || null,
    floor: property.floor || null,
    total_floors: parseInteger(property.number_of_floors),
    
    // Facilities (boolean)
    pool,
    communal_pool,
    private_pool,
    furnished,
    garden,
    parking: parking_spaces,
    garage: garage_spaces ? true : null,
    elevator,
    airconditioning,
    heating,
    alarm,
    storage_room,
    solarium,
    
    // Location
    city,
    region,
    costa: property.costa || null,
    country: property.country || 'Spanje',
    postal_code,
    address: full_address,
    latitude,
    longitude,
    distance_to_beach_m,
    distance_to_golf_m,
    distance_to_airport_km,
    distance_to_shops_m,
    
    // Media
    image_url: images.length > 0 ? images[0] : null,
    images: images.length > 0 ? images : [],
    
    // Features array
    features: features.length > 0 ? features : [],
    
    // Views
    sea_views,
    mountain_views,
    garden_views,
    pool_views,
    open_views,
    village_views,
    
    // Category
    category_urban,
    category_beach,
    category_golf,
    category_countryside,
    category_first_line,
    category_tourist,
    
    // Status & metadata
    status: mapStatus(property.status),
    new_build: parseBoolean(property.new_build),
    key_ready: parseBoolean(property.key_ready),
    show_house: parseBoolean(property.show_house),
    off_plan: parseBoolean(property.off_plan),
    delivery_date: property.delivery_date || null,
    
    updated_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const stats: SyncStats = {
    total_in_xml: 0,
    processed: 0,
    new_properties: 0,
    updated_properties: 0,
    price_changes: 0,
    errors: 0,
    has_more: false,
  };

  try {
    // Parse request body for parameters
    const body = await req.json().catch(() => ({}));
    const offset = body.offset || 0;
    const limit = body.limit || 100;
    const syncLogId = body.sync_log_id || null;
    
    // Check if property_array is passed from daily sync (optimization: skip XML download)
    const passedPropertyArray = body.property_array;

    console.log(`[RedSP Sync] Starting batch: offset=${offset}, limit=${limit}, has_passed_array=${!!passedPropertyArray}`);
    
    let propertyArray: any[];
    
    if (passedPropertyArray && Array.isArray(passedPropertyArray) && passedPropertyArray.length > 0) {
      // Use pre-parsed property array from daily sync (saves ~5s per batch)
      propertyArray = passedPropertyArray;
      stats.total_in_xml = propertyArray.length;
      console.log(`[RedSP Sync] Using passed property array: ${propertyArray.length} properties`);
    } else {
      // Fallback: Download and parse XML (for manual/standalone calls)
      const xmlUrl = getXmlUrl();
      console.log('[RedSP Sync] Fetching XML feed from:', xmlUrl);
      
      const xmlResponse = await fetch(xmlUrl, {
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      if (!xmlResponse.ok) {
        throw new Error(`Failed to fetch XML: ${xmlResponse.status} ${xmlResponse.statusText}`);
      }
      
      const xmlText = await xmlResponse.text();
      console.log(`[RedSP Sync] XML fetched, size: ${xmlText.length} bytes`);
      
      // Parse XML using fast-xml-parser
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        textNodeName: "#text",
        parseAttributeValue: true,
        trimValues: true,
      });
      
      const xmlDoc = parser.parse(xmlText);
      
      if (!xmlDoc) {
        throw new Error('Failed to parse XML');
      }
      
      // Find property nodes
      const properties = xmlDoc?.root?.property || xmlDoc?.property || [];
      propertyArray = Array.isArray(properties) ? properties : [properties];
      stats.total_in_xml = propertyArray.length;
    }
    
    console.log(`[RedSP Sync] Total properties: ${stats.total_in_xml}, Processing batch: offset=${offset}, limit=${limit}`);
    
    if (stats.total_in_xml === 0) {
      console.warn('[RedSP Sync] No properties found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No properties found', 
          stats 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Calculate pagination
    const startIndex = offset;
    const endIndex = Math.min(offset + limit, propertyArray.length);
    const batchProperties = propertyArray.slice(startIndex, endIndex);
    stats.has_more = endIndex < propertyArray.length;
    if (stats.has_more) {
      stats.next_offset = endIndex;
    }
    
    console.log(`[RedSP Sync] Processing ${batchProperties.length} properties (${startIndex} to ${endIndex} of ${stats.total_in_xml})`);
    
    // Get existing RedSP properties from database (only for current batch)
    console.log('[RedSP Sync] Fetching existing RedSP properties from database...');
    
    const xmlApiIds = new Set<string>();
    const propertiesToUpsert = [];
    
    // Parse batch properties from XML
    console.log('[RedSP Sync] Parsing batch XML properties...');
    let index = 0;
    for (const propertyData of batchProperties) {
      try {
        const property = mapXmlToProperty(propertyData, index);
        
        if (!property || !property.api_id) {
          stats.errors++;
          index++;
          continue;
        }
        
        xmlApiIds.add(property.api_id);
        propertiesToUpsert.push(property);
        index++;
      } catch (error) {
        console.error('[RedSP Sync] Error parsing property:', error);
        stats.errors++;
        index++;
      }
    }
    
    stats.processed = propertiesToUpsert.length;
    
    console.log(`[RedSP Sync] Parsed ${propertiesToUpsert.length} properties`);
    
    // Check which properties already exist and get their current prices for price tracking
    const priceChanges: Array<{property_id: string, old_price: number | null, new_price: number, change_type: string}> = [];
    
    if (propertiesToUpsert.length > 0) {
      const apiIds = propertiesToUpsert.map(p => p.api_id);
      const { data: existingProps } = await supabase
        .from('properties')
        .select('id, api_id, price')
        .in('api_id', apiIds);
      
      const existingPropsMap = new Map((existingProps || []).map(p => [p.api_id, { id: p.id, price: p.price }]));
      
      for (const prop of propertiesToUpsert) {
        const existing = existingPropsMap.get(prop.api_id);
        if (existing) {
          stats.updated_properties++;
          
          // Check for price change
          const oldPrice = existing.price;
          const newPrice = prop.price;
          
          if (oldPrice !== null && newPrice !== null && oldPrice !== newPrice) {
            const changeType = newPrice > oldPrice ? 'increase' : 'decrease';
            priceChanges.push({
              property_id: existing.id,
              old_price: oldPrice,
              new_price: newPrice,
              change_type: changeType
            });
            
            // Set previous_price and price_changed_at on the property
            prop.previous_price = oldPrice;
            prop.price_changed_at = new Date().toISOString();
            prop.price_reduced = newPrice < oldPrice;
          }
        } else {
          stats.new_properties++;
        }
      }
      
      console.log(`[RedSP Sync] Price changes detected: ${priceChanges.length}`);
    }
    
    console.log(`[RedSP Sync] New: ${stats.new_properties}, Updates: ${stats.updated_properties}`);
    
    // UPSERT properties in smaller batches (insert new, update existing)
    if (propertiesToUpsert.length > 0) {
      console.log(`[RedSP Sync] Upserting ${propertiesToUpsert.length} properties in batches...`);
      
      const BATCH_SIZE = 25;
      for (let i = 0; i < propertiesToUpsert.length; i += BATCH_SIZE) {
        const batch = propertiesToUpsert.slice(i, i + BATCH_SIZE);
        console.log(`[RedSP Sync] Processing DB batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(propertiesToUpsert.length/BATCH_SIZE)}`);
        
        const { error: upsertError } = await supabase
          .from('properties')
          .upsert(batch, {
            onConflict: 'api_id',
            ignoreDuplicates: false
          });
        
        if (upsertError) {
          console.error(`[RedSP Sync] Batch error:`, upsertError);
          stats.errors += batch.length;
        }
      }
      
      console.log('[RedSP Sync] Upsert completed');
      
      // Insert price changes into history table
      if (priceChanges.length > 0) {
        console.log(`[RedSP Sync] Recording ${priceChanges.length} price changes...`);
        stats.price_changes = priceChanges.length;
        
        const { error: priceHistoryError } = await supabase
          .from('property_price_history')
          .insert(priceChanges.map(pc => ({
            property_id: pc.property_id,
            old_price: pc.old_price,
            new_price: pc.new_price,
            change_type: pc.change_type,
            sync_source: 'redsp'
          })));
        
        if (priceHistoryError) {
          console.error('[RedSP Sync] Price history error:', priceHistoryError);
        } else {
          console.log('[RedSP Sync] Price changes recorded successfully');
        }
      }
    }
    
    // NOTE: Mark-sold logic has been removed from this function.
    // Properties are now only marked as sold via check-sold-properties function
    // which has a 24-hour grace period and safety checks to prevent false positives.
    
    console.log('[RedSP Sync] Batch sync completed!', stats);
    
    // Project linking is now handled by separate sync-redsp-link-projects function
    // Called after all batches are complete to avoid CPU timeout
    
    return new Response(
      JSON.stringify({ success: true, stats }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('[RedSP Sync] Error during sync:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        stats 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
