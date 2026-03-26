/**
 * Translates technical sync error messages into user-friendly Dutch messages.
 */

const ERROR_PATTERNS: [RegExp, string][] = [
  [/Onverwachte status:\s*\S+/i, 'De synchronisatie kon niet worden gestart. Probeer het opnieuw.'],
  [/Unexpected status/i, 'De synchronisatie kon niet worden gestart. Probeer het opnieuw.'],
  [/Failed to scrape/i, 'Eén of meer bestanden konden niet worden opgehaald. Probeer opnieuw te synchroniseren.'],
  [/Process-all trigger failed/i, 'De verwerking kon niet worden gestart. Neem contact op als dit blijft voorkomen.'],
  [/Max process calls exceeded/i, 'Er zijn te veel bestanden om in één keer te verwerken. Probeer het opnieuw.'],
  [/Sync timeout/i, 'De synchronisatie duurde te lang en is gestopt. Probeer het opnieuw.'],
  [/Agent kon niet worden gestart/i, 'De synchronisatie kon niet worden gestart. Probeer het later opnieuw.'],
  [/Background processing failed/i, 'De verwerking is mislukt. Probeer het opnieuw.'],
  [/Geen sync bron gevonden/i, 'Er is geen synchronisatiebron gevonden voor dit project.'],
  [/Firecrawl is niet geconfigureerd/i, 'De synchronisatiedienst is momenteel niet beschikbaar.'],
  [/Download mislukt/i, 'Eén of meer bestanden konden niet worden gedownload.'],
  [/HTTP\s*(4|5)\d{2}/i, 'Er ging iets mis bij de synchronisatie. Probeer het later opnieuw.'],
  [/fetch failed|network/i, 'Netwerkfout bij de synchronisatie. Controleer de verbinding en probeer opnieuw.'],
];

export function friendlyError(technicalMsg: string): string {
  if (!technicalMsg) return 'Er is een onbekende fout opgetreden.';
  
  for (const [pattern, friendly] of ERROR_PATTERNS) {
    if (pattern.test(technicalMsg)) {
      return friendly;
    }
  }
  
  // Default fallback
  return 'Er ging iets mis bij de synchronisatie. Probeer het later opnieuw.';
}
