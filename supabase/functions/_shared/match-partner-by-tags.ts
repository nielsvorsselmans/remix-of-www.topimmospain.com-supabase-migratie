/**
 * Shared helper: match GHL contact tags to a partner via partners.ghl_tags
 * Returns partner_id if a match is found, null otherwise.
 */
export async function matchPartnerByTags(
  supabase: any,
  contactTags: string[]
): Promise<string | null> {
  if (!contactTags || contactTags.length === 0) return null;

  // Normalize tags to lowercase for case-insensitive matching
  const normalizedTags = contactTags.map(t => t.toLowerCase().trim()).filter(Boolean);
  if (normalizedTags.length === 0) return null;

  // Query partners that have any matching ghl_tags
  // We need to check if any of the contact's tags match any of the partner's ghl_tags
  const { data: partners, error } = await supabase
    .from('partners')
    .select('id, ghl_tags')
    .eq('active', true)
    .not('ghl_tags', 'eq', '{}');

  if (error || !partners || partners.length === 0) return null;

  for (const partner of partners) {
    const partnerTags = (partner.ghl_tags || []).map((t: string) => t.toLowerCase().trim());
    const hasMatch = normalizedTags.some(ct => partnerTags.includes(ct));
    if (hasMatch) {
      return partner.id;
    }
  }

  return null;
}

/**
 * Fetch GHL contact tags via GHL API
 */
export async function fetchGhlContactTags(
  ghlContactId: string,
  ghlApiKey: string
): Promise<string[]> {
  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/contacts/${ghlContactId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ghlApiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.contact?.tags || [];
  } catch (error) {
    console.error('[matchPartnerByTags] Error fetching GHL contact tags:', error);
    return [];
  }
}

/**
 * Get partner's GHL tags by partner_id
 */
export async function getPartnerGhlTags(
  supabase: any,
  partnerId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('partners')
    .select('ghl_tags')
    .eq('id', partnerId)
    .single();

  return data?.ghl_tags || [];
}

/**
 * Add tags to a GHL contact
 */
export async function addTagsToGhlContact(
  ghlContactId: string,
  tags: string[],
  ghlApiKey: string
): Promise<boolean> {
  if (!tags.length) return false;

  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/contacts/${ghlContactId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${ghlApiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
        body: JSON.stringify({ tags }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('[addTagsToGhlContact] Error:', error);
    return false;
  }
}
