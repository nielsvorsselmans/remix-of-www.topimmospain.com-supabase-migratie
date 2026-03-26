import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PasswordSettingsCard } from "@/components/dashboard/PasswordSettingsCard";
import { useCustomerPreview } from "@/contexts/CustomerPreviewContext";

export default function Instellingen() {
  const { isPreviewMode } = useCustomerPreview();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Instellingen</h1>
        <p className="text-muted-foreground">
          Beheer je voorkeuren en notificaties
        </p>
      </div>

      {!isPreviewMode && <PasswordSettingsCard />}

      <Card>
        <CardHeader>
          <CardTitle>Notificaties</CardTitle>
          <CardDescription>
            Kies hoe je op de hoogte wil blijven
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-updates" className="flex flex-col gap-1">
              <span>E-mail updates</span>
              <span className="text-sm text-muted-foreground font-normal">
                Ontvang updates over nieuwe projecten
              </span>
            </Label>
            <Switch id="email-updates" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="project-alerts" className="flex flex-col gap-1">
              <span>Project meldingen</span>
              <span className="text-sm text-muted-foreground font-normal">
                Word geïnformeerd over projectupdates
              </span>
            </Label>
            <Switch id="project-alerts" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="price-changes" className="flex flex-col gap-1">
              <span>Prijswijzigingen</span>
              <span className="text-sm text-muted-foreground font-normal">
                Meldingen bij prijsveranderingen van favorieten
              </span>
            </Label>
            <Switch id="price-changes" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacyvoorkeuren</CardTitle>
          <CardDescription>
            Meer instellingen komen binnenkort beschikbaar
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
