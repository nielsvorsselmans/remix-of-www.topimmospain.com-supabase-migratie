import { 
  OntdekkenProgressHeader,
  OntdekkenGrid,
  OntdekkenLarsCTA,
  OntdekkenProjectTeasers,
  JourneyTimelineTracker,
} from "@/components/ontdekken";
import { DiscoveryGameCard } from "@/components/ontdekken/DiscoveryGameCard";

export default function Ontdekken() {
  return (
    <div className="space-y-8 max-w-4xl">
      <OntdekkenProgressHeader />
      <OntdekkenLarsCTA />
      <OntdekkenGrid />
      <DiscoveryGameCard />
      <OntdekkenProjectTeasers />
      <JourneyTimelineTracker />
    </div>
  );
}
