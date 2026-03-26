# Microsoft Clarity Heatmap Tracking Setup

Microsoft Clarity is nu geïntegreerd in de website voor heatmap tracking, session recordings en click analytics.

## Stappen om Clarity in te schakelen:

### 1. Maak een Microsoft Clarity account aan
Ga naar: https://clarity.microsoft.com/

### 2. Maak een nieuw project
- Klik op "Add new project"
- Vul de website URL in: `https://topimmospain.com` (of je preview URL voor testing)
- Kies je categorie
- Klik op "Add"

### 3. Kopieer je Project ID
- Na het aanmaken krijg je een Project ID (bijvoorbeeld: `abc123def`)
- Deze ID staat in de Clarity dashboard URL: `https://clarity.microsoft.com/projects/view/[PROJECT_ID]`

### 4. Update de configuratie
Open het bestand `src/hooks/useClarity.tsx` en vervang:
```typescript
const CLARITY_PROJECT_ID = 'YOUR_CLARITY_PROJECT_ID';
```
Met je echte Project ID:
```typescript
const CLARITY_PROJECT_ID = 'abc123def';
```

### 5. Deploy de wijzigingen
- Klik op "Update" in de publish dialog om de frontend wijzigingen live te zetten
- Clarity begint automatisch met het verzamelen van data

## Wat wordt er getrackt?

### Automatisch getrackt:
- **Heatmaps**: Waar gebruikers klikken en hoveren
- **Session Recordings**: Video opnames van gebruikerssessies
- **Scroll depth**: Hoe ver gebruikers scrollen op elke pagina
- **Click tracking**: Alle clicks op de website
- **Rage clicks**: Frustratie clicks (meerdere clicks op zelfde plek)
- **Dead clicks**: Clicks op niet-interactieve elementen
- **Quick backs**: Gebruikers die snel teruggaan na een page load

### Custom tracking (al geïmplementeerd):
- **Page views**: Elke pagina krijgt een tag met de pathname
- **User identification**: Ingelogde gebruikers worden geïdentificeerd met hun ID en email
- **User status**: Tag voor authenticated vs anonymous users

## Clarity Dashboard Features

### Heatmaps
1. Ga naar je project dashboard
2. Klik op "Heatmaps" in het menu
3. Kies de pagina die je wilt analyseren
4. Bekijk:
   - Click heatmap: Waar worden de meeste clicks gegenereerd
   - Scroll heatmap: Tot waar scrollen gebruikers
   - Area clicks: Clicks per sectie

### Recordings
1. Klik op "Recordings"
2. Filter op:
   - Datum
   - URL
   - User tags (authenticated/anonymous)
   - Device type
   - Country
3. Bekijk de video opnames van gebruikerssessies

### Dashboard
Het hoofddashboard toont:
- Total sessions
- Pages per session
- Scroll depth
- Rage clicks
- Dead clicks
- Excessive scrolling
- Quick backs

## Privacy & GDPR

Clarity is GDPR compliant en:
- Maskeert automatisch gevoelige informatie (emails, telefoonnummers, etc.)
- Gebruikt geen cookies die toestemming vereisen
- Voldoet aan privacy wetgeving
- Data wordt versleuteld opgeslagen

## Tips voor optimale tracking

### 1. Gebruik tags voor segmentatie
Je kunt custom tags toevoegen in de code:
```typescript
const { setTag } = useClarity();
setTag('user_type', 'investor');
setTag('language', 'nl');
```

### 2. Track belangrijke events
```typescript
const { trackEvent } = useClarity();
trackEvent('cta_clicked', { location: 'hero' });
trackEvent('form_submitted', { form_type: 'contact' });
```

### 3. Markeer belangrijke sessies
Voor VIP gebruikers of belangrijke flows:
```typescript
upgradeClaritySession();
```

## Integratie met bestaande tracking

Clarity werkt naast je bestaande tracking:
- Bestaande `trackEvent()` calls blijven werken
- UTM parameters worden automatisch opgepikt
- Geen conflict met andere analytics tools

## Support

Voor vragen of problemen:
- Microsoft Clarity docs: https://learn.microsoft.com/en-us/clarity/
- Community forum: https://github.com/microsoft/clarity/discussions
