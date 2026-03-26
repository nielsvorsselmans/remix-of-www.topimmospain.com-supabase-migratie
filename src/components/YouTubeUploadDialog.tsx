import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Upload, Youtube, AlertCircle, CheckCircle2, Loader2, ExternalLink, Settings, RefreshCw } from "lucide-react";
import { useYouTubeUpload } from "@/hooks/useYouTubeUpload";
import { toast } from "sonner";

const VIDEO_TYPES = [
  { value: "bouwupdate", label: "Bouwupdate" },
  { value: "showhouse", label: "Showhouse" },
  { value: "omgeving", label: "Omgeving" },
  { value: "algemeen", label: "Algemeen" },
];

interface YouTubeUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
  projectIds?: string[];
}

export function YouTubeUploadDialog({
  open,
  onOpenChange,
  onUploadComplete,
  projectIds = [],
}: YouTubeUploadDialogProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    config,
    isCheckingConfig,
    isConfigured,
    isUploading,
    currentJob,
    channelInfo,
    getAuthUrl,
    exchangeCode,
    uploadVideo,
    pollJobStatus,
    checkConfig,
    getChannelInfo,
  } = useYouTubeUpload();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoType, setVideoType] = useState("bouwupdate");
  const [videoDate, setVideoDate] = useState(new Date().toISOString().split("T")[0]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [authCode, setAuthCode] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [isExchangingCode, setIsExchangingCode] = useState(false);
  const [isLoadingChannel, setIsLoadingChannel] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(false);

  // Auto-detect OAuth code from URL parameters
  useEffect(() => {
    const code = searchParams.get("code");
    if (code && open) {
      setAuthCode(code);
      setShowSetup(true);
      // Clear the code from URL to prevent re-processing
      searchParams.delete("code");
      setSearchParams(searchParams, { replace: true });
      toast.info("Autorisatiecode gedetecteerd! Klik op 'Verwerk' om door te gaan.");
    }
  }, [searchParams, setSearchParams, open]);

  // Fetch channel info when configured and validate token
  useEffect(() => {
    if (isConfigured && open) {
      setIsLoadingChannel(true);
      getChannelInfo().then((info) => {
        // Check if token is invalid
        if (info?.error === "token_refresh_failed") {
          setTokenInvalid(true);
          setShowSetup(true);
        } else if (info?.connected) {
          setTokenInvalid(false);
        }
      }).finally(() => setIsLoadingChannel(false));
    }
  }, [isConfigured, open, getChannelInfo]);

  // Poll for job updates
  useEffect(() => {
    if (!activeJobId) return;

    const interval = setInterval(async () => {
      const job = await pollJobStatus(activeJobId);
      if (job) {
        if (job.status === "completed") {
          toast.success("Video succesvol geüpload naar YouTube!");
          onUploadComplete?.();
          clearInterval(interval);
          setActiveJobId(null);
          resetForm();
        } else if (job.status === "failed") {
          toast.error(`Upload mislukt: ${job.error_message}`);
          clearInterval(interval);
          setActiveJobId(null);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeJobId, pollJobStatus, onUploadComplete]);

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setVideoType("bouwupdate");
    setVideoDate(new Date().toISOString().split("T")[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith("video/")) {
        toast.error("Selecteer een videobestand");
        return;
      }
      setFile(selectedFile);
      // Auto-fill title from filename
      if (!title) {
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
        setTitle(nameWithoutExt);
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !title) {
      toast.error("Selecteer een video en vul een titel in");
      return;
    }

    const jobId = await uploadVideo(file, {
      title,
      description,
      video_type: videoType,
      video_date: videoDate,
      project_ids: projectIds,
    });

    if (jobId) {
      setActiveJobId(jobId);
    }
  };

  const handleStartOAuth = async () => {
    const redirectUri = `${window.location.origin}/admin/videos`;
    const url = await getAuthUrl(redirectUri);
    if (url) {
      window.open(url, "_blank", "width=600,height=700");
      toast.info("Voltooi de autorisatie in het popup venster");
    }
  };

  const handleExchangeCode = async () => {
    if (!authCode) {
      toast.error("Voer de autorisatiecode in");
      return;
    }

    setIsExchangingCode(true);
    try {
      const redirectUri = `${window.location.origin}/admin/videos`;
      const result = await exchangeCode(authCode, redirectUri);
      if (result.refresh_token) {
        setRefreshToken(result.refresh_token);
        toast.success("Token ontvangen! Sla deze op als YOUTUBE_REFRESH_TOKEN secret.");
      } else if (result.error) {
        toast.error(`Fout: ${result.error_description || result.error}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Fout bij token uitwisseling";
      toast.error(message);
    } finally {
      setIsExchangingCode(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Wachten</Badge>;
      case "uploading":
        return <Badge className="bg-blue-100 text-blue-800">Uploaden</Badge>;
      case "processing":
        return <Badge className="bg-amber-100 text-amber-800">Verwerken</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Voltooid</Badge>;
      case "failed":
        return <Badge variant="destructive">Mislukt</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-600" />
            Upload naar YouTube
          </DialogTitle>
        </DialogHeader>

        {isCheckingConfig ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !isConfigured ? (
          <div className="space-y-4">
            {channelInfo?.error === "token_refresh_failed" ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="space-y-1">
                  <p><strong>Refresh token verlopen of ongeldig</strong></p>
                  <p className="text-xs">{channelInfo.hint}</p>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  YouTube is nog niet geconfigureerd. Voltooi eerst de OAuth setup.
                </AlertDescription>
              </Alert>
            )}

            {!showSetup ? (
              <Button onClick={() => setShowSetup(true)} className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Start OAuth Setup
              </Button>
            ) : (
              <div className="space-y-4 border rounded-lg p-4">
                <div className="text-sm space-y-2">
                  <p><strong>Stap 1:</strong> Klik op de knop om te autoriseren met je YouTube kanaal.</p>
                  <p className="text-xs text-muted-foreground">
                    Je wordt doorgestuurd naar Google waar je het juiste YouTube kanaal kunt selecteren.
                  </p>
                  <Button onClick={handleStartOAuth} size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Autoriseer YouTube
                  </Button>
                </div>

                <div className="text-sm space-y-2">
                  <p><strong>Stap 2:</strong> Na autorisatie wordt de code automatisch gedetecteerd, of kopieer deze uit de URL.</p>
                  <div className="flex gap-2">
                    <Input
                      value={authCode}
                      onChange={(e) => setAuthCode(e.target.value)}
                      placeholder="Autorisatiecode..."
                      className={authCode ? "border-green-500" : ""}
                    />
                    <Button onClick={handleExchangeCode} size="sm" disabled={!authCode || isExchangingCode}>
                      {isExchangingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verwerk"}
                    </Button>
                  </div>
                  {authCode && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Code gedetecteerd - klik op Verwerk
                    </p>
                  )}
                </div>

                {refreshToken && (
                  <div className="text-sm space-y-2 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Token ontvangen!
                    </p>
                    <p><strong>Stap 3:</strong> Kopieer deze refresh token en sla op als secret:</p>
                    <div className="bg-white dark:bg-background p-2 rounded text-xs font-mono break-all border">
                      {refreshToken}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Voeg toe als <code className="bg-muted px-1 rounded">YOUTUBE_REFRESH_TOKEN</code> in je project secrets.
                    </p>
                    <Button onClick={() => checkConfig()} size="sm" variant="outline" className="w-full">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Configuratie opnieuw controleren
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeJobId && currentJob ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{currentJob.title}</span>
              {getStatusBadge(currentJob.status)}
            </div>
            
            <Progress value={currentJob.progress_percent} className="h-2" />
            
            <p className="text-sm text-muted-foreground text-center">
              {currentJob.progress_percent}% voltooid
              {currentJob.status === "uploading" && " - Video wordt geüpload naar YouTube..."}
              {currentJob.status === "processing" && " - YouTube verwerkt de video..."}
            </p>

            {currentJob.status === "completed" && currentJob.youtube_url && (
              <Button
                onClick={() => window.open(currentJob.youtube_url!, "_blank")}
                className="w-full"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Bekijk op YouTube
              </Button>
            )}

            {currentJob.status === "failed" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{currentJob.error_message}</AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Token invalid warning with reconnect */}
            {tokenInvalid && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <p><strong>YouTube connectie verlopen</strong></p>
                  <p className="text-xs">De refresh token is ongeldig of verlopen. Herconnecteer om door te gaan.</p>
                </AlertDescription>
              </Alert>
            )}

            {/* Setup UI for reconnecting */}
            {showSetup && tokenInvalid && (
              <div className="space-y-4 border rounded-lg p-4">
                <div className="text-sm space-y-2">
                  <p><strong>Stap 1:</strong> Klik op de knop om opnieuw te autoriseren.</p>
                  <Button onClick={handleStartOAuth} size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Autoriseer YouTube
                  </Button>
                </div>

                <div className="text-sm space-y-2">
                  <p><strong>Stap 2:</strong> Na autorisatie wordt de code automatisch gedetecteerd.</p>
                  <div className="flex gap-2">
                    <Input
                      value={authCode}
                      onChange={(e) => setAuthCode(e.target.value)}
                      placeholder="Autorisatiecode..."
                      className={authCode ? "border-green-500" : ""}
                    />
                    <Button onClick={handleExchangeCode} size="sm" disabled={!authCode || isExchangingCode}>
                      {isExchangingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verwerk"}
                    </Button>
                  </div>
                </div>

                {refreshToken && (
                  <div className="text-sm space-y-2 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Token ontvangen!
                    </p>
                    <p><strong>Stap 3:</strong> Kopieer en sla op als secret:</p>
                    <div className="bg-white dark:bg-background p-2 rounded text-xs font-mono break-all border">
                      {refreshToken}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Update <code className="bg-muted px-1 rounded">YOUTUBE_REFRESH_TOKEN</code> in je secrets.
                    </p>
                    <Button onClick={() => { checkConfig(); setTokenInvalid(false); setShowSetup(false); }} size="sm" variant="outline" className="w-full">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Configuratie opnieuw controleren
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Connected channel info with reconnect option */}
            {channelInfo?.connected && !tokenInvalid && (
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={channelInfo.channel_thumbnail} />
                  <AvatarFallback><Youtube className="h-5 w-5" /></AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{channelInfo.channel_title}</p>
                  <p className="text-xs text-muted-foreground">Verbonden YouTube kanaal</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowSetup(true); setTokenInvalid(true); }}
                  className="flex-shrink-0"
                  title="Herconnecteren"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {isLoadingChannel && !tokenInvalid && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Kanaalinfo ophalen...</span>
              </div>
            )}

            {/* Only show upload form when token is valid */}
            {!tokenInvalid && (
              <>
            {/* File input */}
            <div>
              <Label>Video bestand</Label>
              <div className="mt-1">
                {file ? (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium truncate max-w-[200px]">
                        {file.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                    >
                      Wijzig
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Klik om video te selecteren
                    </span>
                    <span className="text-xs text-muted-foreground">
                      MP4, MOV, AVI (max meerdere GB)
                    </span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <Label>Titel</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Bouwupdate Maart 2024"
              />
            </div>

            {/* Description */}
            <div>
              <Label>Beschrijving (optioneel)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschrijving voor YouTube..."
                rows={3}
              />
            </div>

            {/* Type & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={videoType} onValueChange={setVideoType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDEO_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Datum</Label>
                <Input
                  type="date"
                  value={videoDate}
                  onChange={(e) => setVideoDate(e.target.value)}
                />
              </div>
            </div>

            {/* Upload button */}
            <Button
              onClick={handleUpload}
              disabled={!file || !title || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploaden...
                </>
              ) : (
                <>
                  <Youtube className="h-4 w-4 mr-2" />
                  Upload naar YouTube
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Video wordt eerst naar tijdelijke opslag geüpload, daarna naar YouTube.
              Dit kan enkele minuten duren voor grote bestanden.
            </p>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
