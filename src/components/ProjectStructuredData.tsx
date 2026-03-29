import { Helmet } from "react-helmet-async";

interface ProjectStructuredDataProps {
  project: {
    id: string;
    name: string;
    display_title?: string | null;
    description?: string | null;
    city?: string | null;
    country?: string | null;
    price_from?: number | null;
    price_to?: number | null;
    featured_image?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    slug?: string | null;
    completion_date?: string | null;
  };
  propertyTypes: string[];
  faqItems?: Array<{ question: string; answer: string }>;
}

export function ProjectStructuredData({ project, propertyTypes, faqItems }: ProjectStructuredDataProps) {
  const title = project.display_title || project.name;
  const description = project.description?.substring(0, 300) || `${title} - Nieuwbouw vastgoed in ${project.city}, ${project.country || "Spanje"}`;
  
  const canonicalUrl = project.slug
    ? `https://www.topimmospain.com/nieuwbouw-spanje/${project.slug}`
    : `https://www.topimmospain.com/project/${project.id}`;

  // RealEstateListing structured data
  const realEstateSchema = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: title,
    description,
    url: canonicalUrl,
    ...(project.featured_image && { image: project.featured_image }),
    ...(project.price_from && {
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "EUR",
        lowPrice: project.price_from,
        ...(project.price_to && project.price_to !== project.price_from && { highPrice: project.price_to }),
      },
    }),
    ...(project.latitude && project.longitude && {
      geo: {
        "@type": "GeoCoordinates",
        latitude: project.latitude,
        longitude: project.longitude,
      },
    }),
    address: {
      "@type": "PostalAddress",
      addressLocality: project.city || "",
      addressCountry: project.country || "ES",
    },
    ...(project.completion_date && {
      datePosted: project.completion_date,
    }),
  };

  // FAQPage structured data
  const faqSchema = faqItems && faqItems.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(item => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  } : null;

  return (
    <Helmet>
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* SEO Meta */}
      <title>{`${title} | Nieuwbouw ${project.city || "Spanje"} | Viva Vastgoed`}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph */}
      <meta property="og:title" content={`${title} | Viva Vastgoed`} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      {project.featured_image && <meta property="og:image" content={project.featured_image} />}
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(realEstateSchema)}
      </script>
      {faqSchema && (
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      )}
    </Helmet>
  );
}
