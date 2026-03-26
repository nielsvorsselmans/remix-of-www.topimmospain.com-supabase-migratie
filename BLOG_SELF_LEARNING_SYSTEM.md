# Blog Self-Learning & Feedback System

## Overzicht

Het blog heeft nu een volledig zelflerend systeem dat automatisch leest en analyseert:
- **Wat** leads lezen (welke artikelen, categorieën, topics)
- **Hoe** ze lezen (leestijd, scroll depth, completion rate)
- **Waar** ze interesse in hebben (AI-geïnfereerde interesses)
- **Wat** ze missen (directe feedback via widgets)

## Architectuur

### 1. **Reading Analytics Tracking** 
📊 Automatische tracking van leesgedrag

**Database tabel**: `blog_reading_analytics`

Tracked automatisch per blog post:
- Time spent (in seconden)
- Scroll depth (percentage)
- Finished reading (80%+ scroll = voltooid)
- Related article clicks
- Share actions

**Implementatie**:
```typescript
// Gebruikt in BlogPost pagina
const { trackRelatedArticleClick, trackShare } = useBlogTracking({
  blogPostId: post.id,
  slug: post.slug,
  title: post.title,
  category: post.category
});
```

### 2. **Reader Feedback Widget**
💬 Directe feedback van lezers

**Database tabel**: `blog_feedback`

**Component**: `<BlogFeedbackWidget />`

Verzamelt:
- Quick feedback: Was nuttig? (👍/👎)
- Star rating (1-5 sterren)
- Missende informatie (open veld)
- Gewenste topics (comma-separated)
- Algemene opmerkingen

**Implementatie**:
```typescript
// Aan einde van elk blog artikel plaatsen
<BlogFeedbackWidget 
  blogPostId={post.id} 
  slug={post.slug} 
/>
```

### 3. **AI Interest Analysis**
🧠 Automatische interest detectie met AI

**Database tabel**: `blog_interest_analysis`

**Edge function**: `analyze-blog-interests`

AI analyseert reading behavior en leidt af:
- **Primary interests**: 2-3 hoofdinteresses
- **Secondary interests**: 2-3 gerelateerde interesses  
- **Stage in journey**: orientation / research / decision
- **Content preferences**: prefers_detailed, engagement_level

**Hoe te triggeren**:
```typescript
// Automatisch triggered via cron job, of handmatig:
await supabase.functions.invoke('analyze-blog-interests', {
  body: { 
    userId: user.id,
    visitorId: getVisitorId(),
    crmUserId: getCrmUserId()
  }
});
```

### 4. **Admin Dashboard**
📈 Insights voor content strategie

**Route**: `/admin/blog-insights`

**Tabbladen**:
1. **Meest Gelezen**: Top 5 populairste artikelen met view counts
2. **Reader Feedback**: Alle feedback met missende info en gewenste topics
3. **AI Interest Analysis**: Gedetecteerde interesses en journey stages per lead

## Data Flow

```
User leest blog artikel
    ↓
useBlogTracking hooks tracks:
  - Time spent
  - Scroll depth  
  - Engagement signals
    ↓
Opgeslagen in blog_reading_analytics
    ↓
AI analyze-blog-interests edge function analyseert:
  - Leespatronen
  - Categorieën
  - Topics
    ↓
AI infereert interesses + journey stage
    ↓
Opgeslagen in blog_interest_analysis
    ↓
Admin ziet insights in dashboard
    ↓
Content strategie wordt aangepast
```

## Hoe te Gebruiken

### Voor Implementatie in Blog Posts

1. **Import tracking hook** in BlogPost component:
```typescript
import { useBlogTracking } from "@/hooks/useBlogTracking";
```

2. **Initialize tracking** met post details:
```typescript
const { trackRelatedArticleClick, trackShare } = useBlogTracking({
  blogPostId: post.id,
  slug: post.slug,
  title: post.title,
  category: post.category
});
```

3. **Add feedback widget** aan einde van artikel:
```typescript
<BlogFeedbackWidget 
  blogPostId={post.id} 
  slug={post.slug} 
/>
```

### Voor Content Strategie

**Dashboard gebruiken om te ontdekken**:

1. **Meest gelezen artikelen**
   - Welke topics resoneren het meest?
   - Welke categorieën zijn populair?

2. **Reader feedback analyseren**
   - Welke informatie missen mensen?
   - Welke nieuwe topics worden gevraagd?
   - Waar zijn mensen niet tevreden over?

3. **AI Interest Analysis gebruiken**
   - Welke journey stage zijn de meeste readers in?
   - Wat zijn de primaire/secondaire interesses?
   - Content preferences: willen ze detailed of quick content?

## Personalisatie Mogelijkheden

Met deze data kun je:

✅ **Recommend relevant articles** gebaseerd op AI-inferred interests  
✅ **Tailor email campaigns** met topics die interesseren  
✅ **Prioritize content creation** voor meest gevraagde topics  
✅ **Segment leads** op basis van journey stage  
✅ **Optimize article length** gebaseerd op avg reading time  
✅ **Improve completion rates** door missende info toe te voegen

## CRM Integratie

Het systeem integreert naadloos met bestaande CRM tracking:

- `user_id` - Ingelogde users
- `visitor_id` - Anonieme bezoekers (viva_visitor_id)
- `crm_user_id` - CRM leads van mailing campaigns

Alle drie ID types worden getrackt zodat gedrag behouden blijft bij:
- Anoniem → Login
- Mailing click → Website visit
- CRM lead → Registered user

## Edge Functions

### analyze-blog-interests

**Trigger**: Handmatig of via cron job  
**Input**: userId, visitorId, of crmUserId  
**Output**: AI-analyzed interests + journey stage

**Response format**:
```json
{
  "success": true,
  "analysis": {
    "primary_interests": ["financiering", "belastingen"],
    "secondary_interests": ["verhuur", "costa calida"],
    "stage_in_journey": "research",
    "content_preferences": {
      "prefers_detailed": true,
      "engagement_level": "high"
    },
    "metrics": {
      "total_articles": 12,
      "avg_time": 420,
      "completion_rate": 75.5,
      "top_categories": ["Financiering", "Juridisch"]
    }
  }
}
```

## Aanbevolen Cron Job

Stel een cron job in die dagelijks AI interest analysis runt voor actieve readers:

```sql
-- PostgreSQL cron job (via pg_cron extension)
-- Runs daily at 3 AM to analyze interests for users with 3+ reads
SELECT cron.schedule(
  'analyze-blog-interests-daily',
  '0 3 * * *',  -- Daily at 3 AM
  $$
  SELECT net.http_post(
    url := 'https://owbzpreqoxedpmlsgdkb.supabase.co/functions/v1/analyze-blog-interests',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'userId', user_id,
      'visitorId', visitor_id,
      'crmUserId', crm_user_id
    )::text
  )
  FROM (
    SELECT DISTINCT user_id, visitor_id, crm_user_id
    FROM blog_reading_analytics
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY user_id, visitor_id, crm_user_id
    HAVING COUNT(*) >= 3
  ) active_readers;
  $$
);
```

## Privacy & GDPR

✅ RLS policies zorgen dat users alleen eigen data zien  
✅ Tracking gebeurt alleen na cookie consent  
✅ CRM tracking onder legitimate interest basis  
✅ Anonymous visitor tracking zonder PII  
✅ Users kunnen data verwijderen via profile settings

## Toekomstige Uitbreidingen

Mogelijke verbeteringen:
- [ ] Real-time personalized article recommendations
- [ ] A/B testing voor headlines
- [ ] Automated email campaigns op basis van interests
- [ ] Content gap analysis (welke topics missen we?)
- [ ] Predictive analytics voor content ROI
- [ ] Integration met chatbot voor personalized conversations

## Support

Voor vragen over het systeem:
- **Dashboard**: `/admin/blog-insights`
- **Database tables**: `blog_reading_analytics`, `blog_feedback`, `blog_interest_analysis`
- **Edge function**: `analyze-blog-interests`
