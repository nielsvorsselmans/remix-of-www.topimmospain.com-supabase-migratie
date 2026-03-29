import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code2, ExternalLink, Filter, Database } from "lucide-react";

const ApiDocumentatie = () => {
  const apiBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow py-20 bg-gradient-to-b from-background to-muted/20">
        <div className="container max-w-5xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="outline">
              <Database className="w-3 h-3 mr-1" />
              Public API
            </Badge>
            <h1 className="text-4xl font-bold mb-4">API Documentatie</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Integreer onze klantverhalen in uw eigen website met onze publieke API
            </p>
          </div>

          {/* Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="w-5 h-5" />
                Reviews API Endpoint
              </CardTitle>
              <CardDescription>
                Haal actieve klantverhalen op met diverse filter opties
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg font-mono text-sm mb-4">
                GET {apiBaseUrl}/api-reviews
              </div>
              <div className="space-y-2 text-sm">
                <p><strong>Authenticatie:</strong> Niet vereist (publiek toegankelijk)</p>
                <p><strong>Rate limiting:</strong> 100 requests per uur</p>
                <p><strong>CORS:</strong> Toegestaan voor alle origins</p>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Query Parameters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <code className="text-sm bg-muted px-2 py-1 rounded">customer_type</code>
                  <p className="text-sm text-muted-foreground mt-1">
                    Filter op klant type (bijv. "Genieter-Investeerder", "Rendementsgerichte Investeerder")
                  </p>
                </div>
                <div>
                  <code className="text-sm bg-muted px-2 py-1 rounded">property_type</code>
                  <p className="text-sm text-muted-foreground mt-1">
                    Filter op vastgoed type (bijv. "Appartement", "Villa")
                  </p>
                </div>
                <div>
                  <code className="text-sm bg-muted px-2 py-1 rounded">investment_type</code>
                  <p className="text-sm text-muted-foreground mt-1">
                    Filter op investering type (bijv. "Verhuurinvestering", "Vakantiehuis")
                  </p>
                </div>
                <div>
                  <code className="text-sm bg-muted px-2 py-1 rounded">featured=true</code>
                  <p className="text-sm text-muted-foreground mt-1">
                    Toon alleen uitgelichte reviews
                  </p>
                </div>
                <div>
                  <code className="text-sm bg-muted px-2 py-1 rounded">has_full_story=true</code>
                  <p className="text-sm text-muted-foreground mt-1">
                    Toon alleen reviews met uitgebreide verhalen
                  </p>
                </div>
                <div>
                  <code className="text-sm bg-muted px-2 py-1 rounded">limit=10</code>
                  <p className="text-sm text-muted-foreground mt-1">
                    Aantal resultaten (standaard: 10, maximum: 100)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Response Format */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Response Format</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`{
  "reviews": [
    {
      "id": "uuid",
      "customer_name": "John Doe",
      "location": "Amsterdam, Nederland",
      "quote": "Fantastische ervaring!",
      "rating": 5,
      "customer_type": "Genieter-Investeerder",
      "property_type": "Appartement",
      "investment_type": "Verhuurinvestering",
      "story_title": "Van droom naar werkelijkheid",
      "story_slug": "van-droom-naar-werkelijkheid",
      "story_intro": "Korte intro...",
      "story_featured_image": "https://...",
      "image_url": "https://...",
      "year": 2024,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 5,
  "filters_applied": {
    "customer_type": null,
    "property_type": null,
    "investment_type": null,
    "featured": null,
    "has_full_story": null,
    "limit": 10
  }
}`}
              </pre>
            </CardContent>
          </Card>

          {/* Code Examples */}
          <Card>
            <CardHeader>
              <CardTitle>Code Voorbeelden</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="javascript">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                </TabsList>
                
                <TabsContent value="javascript" className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Basis voorbeeld</h4>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`// Haal alle reviews op
fetch('${apiBaseUrl}/api-reviews')
  .then(res => res.json())
  .then(data => {
    console.log(\`Gevonden: \${data.count} reviews\`);
    data.reviews.forEach(review => {
      console.log(\`\${review.customer_name}: \${review.quote}\`);
    });
  })
  .catch(err => console.error('Error:', err));`}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Met filters</h4>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`// Haal uitgelichte reviews op
fetch('${apiBaseUrl}/api-reviews?featured=true&limit=5')
  .then(res => res.json())
  .then(data => {
    data.reviews.forEach(review => {
      document.getElementById('reviews').innerHTML += \`
        <div class="review">
          <h3>\${review.customer_name}</h3>
          <p>\${review.quote}</p>
          <span>\${'★'.repeat(review.rating)}</span>
        </div>
      \`;
    });
  });`}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Met async/await</h4>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`async function getReviews(customerType) {
  try {
    const url = '${apiBaseUrl}/api-reviews';
    const params = new URLSearchParams({
      customer_type: customerType,
      limit: '10'
    });
    
    const response = await fetch(\`\${url}?\${params}\`);
    const data = await response.json();
    
    return data.reviews;
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

// Gebruik
const reviews = await getReviews('Genieter-Investeerder');
console.log(reviews);`}
                    </pre>
                  </div>
                </TabsContent>
                
                <TabsContent value="curl" className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Basis request</h4>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`curl '${apiBaseUrl}/api-reviews'`}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Met filters</h4>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`curl '${apiBaseUrl}/api-reviews?featured=true&limit=5'`}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Meerdere filters</h4>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`curl '${apiBaseUrl}/api-reviews?customer_type=Genieter-Investeerder&property_type=Villa&limit=3'`}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Support */}
          <div className="mt-8 text-center">
            <p className="text-muted-foreground mb-4">
              Vragen over de API? Neem contact met ons op.
            </p>
            <a 
              href="/contact"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              Contact opnemen
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ApiDocumentatie;
