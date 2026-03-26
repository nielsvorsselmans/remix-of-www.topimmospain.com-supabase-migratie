import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { SignupDialog } from "@/components/SignupDialog";

interface BlogGatedContentProps {
  title: string;
  description: string;
  benefits: string[];
  children: React.ReactNode;
  previewContent?: React.ReactNode;
  className?: string;
}

export const BlogGatedContent = ({
  title,
  description,
  benefits,
  children,
  previewContent,
  className = ""
}: BlogGatedContentProps) => {
  const { user } = useAuth();
  const [showSignup, setShowSignup] = useState(false);

  if (user) {
    // User is logged in, show full content
    return <div className={className}>{children}</div>;
  }

  return (
    <>
      <Card className={`relative overflow-hidden ${className}`}>
        {/* Preview content with blur */}
        {previewContent && (
          <div className="relative">
            <div className="blur-sm pointer-events-none select-none">
              {previewContent}
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
          </div>
        )}

        {/* Gated overlay */}
        <div className="relative p-8 text-center">
          <div className="max-w-md mx-auto space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="w-8 h-8 text-primary" />
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-3">{title}</h3>
              <p className="text-muted-foreground">{description}</p>
            </div>

            <div className="space-y-3 text-left">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>

            <Button 
              size="lg" 
              className="w-full"
              onClick={() => setShowSignup(true)}
            >
              Krijg toegang
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>

            <p className="text-xs text-muted-foreground">
              Geen spam, alleen relevante updates en toegang tot exclusieve content
            </p>
          </div>
        </div>
      </Card>

      <SignupDialog 
        open={showSignup}
        onOpenChange={setShowSignup}
        onSuccess={() => {
          setShowSignup(false);
          // Content will automatically show after successful signup
        }}
      />
    </>
  );
};
