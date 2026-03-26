# Tracking Implementatie Samenvatting

## ✅ Wat is geïmplementeerd

### Dual-System Tracking
Alle custom events worden nu naar **twee systemen** gestuurd:

1. **Microsoft Clarity** - Voor heatmaps en session recordings
2. **Supabase Database** - Voor analytics en rapportage

### Custom Events

#### 1. Form Submissions ✅
- **Event**: `form_submission`
- **Locaties**: 
  - Oriëntatiegids download
  - Portaal toegang aanvraag  
  - Contact formulier
- **Parameters**: `form_type`, `email`, `has_message`

#### 2. CTA Clicks ✅
- **Event**: `cta_click`
- **Locaties**:
  - Hero section ("Ontdek het Viva Vastgoed Portaal")
  - CTA section ("Open het Portaal")
  - Navigation bar
  - Footer links
  - Promotion cards
- **Parameters**: `cta_type`, `location`, `button_text`

#### 3. Favorite Actions ✅
- **Event**: `favorite_action`
- **Acties**:
  - Pand toevoegen aan favorieten
  - Pand verwijderen uit favorieten
- **Parameters**: `action` (add/remove), `property_id`

#### 4. Comparison Actions ✅
- **Event**: `comparison_action`
- **Acties**:
  - Pand toevoegen aan vergelijking
  - Pand verwijderen uit vergelijking
- **Parameters**: `action` (add/remove), `property_id`, `compare_count`

#### 5. Page Views (Automatisch) ✅
- **Event**: `page_view`
- **Automatisch** getrackt bij elke navigatie
- **Inclusief**: UTM parameters, device info, referrer

#### 6. Property Views ✅
- **Event**: `property_view`
- **Automatisch** bij property detail pages
- **Parameters**: `property_id`

### UTM Tracking
Alle portaal links bevatten UTM parameters:
- `utm_source=website`
- `utm_medium=hero|cta|navigation|footer|promotion|dialog`
- `utm_campaign=portaal_access`
- `utm_content=[specifieke_locatie]`

## 📊 Waar te vinden

### In Clarity Dashboard
1. **Heatmaps**: https://clarity.microsoft.com/projects/view/uaal597yfg
   - Zie waar gebruikers klikken
   - Filter op specifieke events
   
2. **Recordings**: 
   - Bekijk sessies met form submissions
   - Filter op CTA clicks
   
3. **Dashboard**:
   - Rage clicks
   - Dead clicks
   - Scroll depth

### In Supabase Database
Query de `tracking_events` tabel:

```sql
-- Meest populaire CTA's
SELECT 
  event_params->>'location' as location,
  event_params->>'button_text' as button_text,
  COUNT(*) as clicks
FROM tracking_events
WHERE event_name = 'cta_click'
GROUP BY location, button_text
ORDER BY clicks DESC;

-- Conversie per form type
SELECT 
  event_params->>'form_type' as form_type,
  COUNT(*) as submissions
FROM tracking_events
WHERE event_name = 'form_submission'
GROUP BY form_type;

-- Traffic bron analyse
SELECT 
  utm_source,
  utm_medium,
  COUNT(*) as visits
FROM tracking_events
WHERE event_name = 'page_view'
GROUP BY utm_source, utm_medium
ORDER BY visits DESC;
```

## 🚀 Deployment

### Stap 1: Update Frontend
✅ Klik op "Update" in de publish dialog

### Stap 2: Verify Tracking
1. Open browser console
2. Navigeer door de website
3. Check voor `[Tracking]` log messages
4. Klik op buttons en vul formulieren in
5. Controleer of events worden gelogd

### Stap 3: Check Clarity
1. Ga naar https://clarity.microsoft.com/
2. Log in met je account
3. Open project `uaal597yfg`
4. Wacht 1-2 minuten voor eerste data

### Stap 4: Check Database
```sql
-- Check recente events
SELECT 
  event_name,
  event_params,
  occurred_at
FROM tracking_events
ORDER BY occurred_at DESC
LIMIT 20;
```

## 📈 Wat kun je nu analyseren?

### Conversie Funnel
1. Page view op homepage
2. CTA click (hero/navigation)
3. Form submission
4. → **Conversie rate**

### Best Performing CTA's
- Welke button tekst werkt het best?
- Welke locatie genereert meeste clicks?
- Welke UTM bron converteert het best?

### User Engagement
- Hoeveel panden worden gefavoriet?
- Hoeveel vergelijkingen worden gemaakt?
- Hoe lang kijken mensen naar property details?

### Traffic Bronnen
- Vanuit welke bron komen de meeste bezoekers?
- Welke UTM campagnes presteren het best?
- Welke referrers zijn het meest waardevol?

## 🔧 Onderhoud

### Custom Events Toevoegen
Zie `CUSTOM_EVENTS_DOCUMENTATION.md` voor:
- Event naming conventions
- Parameter structuur
- Code voorbeelden
- Best practices

### Troubleshooting
Als events niet aankomen:

1. **Check Console**:
   ```javascript
   // Open browser console (F12)
   // Kijk naar [Tracking] messages
   ```

2. **Check Network**:
   - Open Network tab
   - Filter op "api-track"
   - Kijk naar POST requests

3. **Check Clarity**:
   - Events kunnen 1-2 minuten delay hebben
   - Refresh dashboard

4. **Check Database**:
   ```sql
   -- Check laatste events
   SELECT * FROM tracking_events 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

## 📚 Documentatie

- `CUSTOM_EVENTS_DOCUMENTATION.md` - Volledige event documentatie
- `CLARITY_SETUP.md` - Clarity setup instructies
- Deze file - Implementatie samenvatting

## 🎯 Volgende Stappen

### Aanbevolen Uitbreidingen:
1. **A/B Testing** - Test verschillende CTA varianten
2. **Conversion Funnels** - Visualiseer complete user journey
3. **Dashboard** - Bouw admin dashboard voor realtime stats
4. **Alerts** - Stel notificaties in voor belangrijke events
5. **Retention Analysis** - Track terugkerende bezoekers

### Quick Wins:
1. Monitor welke portaal buttons het meest worden geklikt
2. Optimaliseer form fields op basis van submission data
3. Test verschillende CTA teksten en locaties
4. Identificeer waar gebruikers afhaken in de funnel
