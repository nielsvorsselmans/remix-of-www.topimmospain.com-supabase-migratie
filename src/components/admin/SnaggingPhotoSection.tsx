import { useState, useRef } from "react";
import { SnaggingItem, SnaggingPhoto, useSnaggingPhotos, useUploadSnaggingPhoto, useDeleteSnaggingPhoto, useUpdateSnaggingPhotoMeta, getCategoryLabel } from "@/hooks/useSnagging";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Camera, Trash2, User, Clock, MapPin, Pencil, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { compressImage } from "@/lib/imageCompression";
import { supabase } from "@/integrations/supabase/client";
import { getSnaggingThumbnailUrl } from "@/lib/imageUtils";

interface SnaggingPhotoSectionProps {
  item: SnaggingItem;
  photos?: SnaggingPhoto[];
  roomOptions?: { value: string; label: string }[];
}

export function SnaggingPhotoSection({ item, photos: propPhotos, roomOptions: propRoomOptions }: SnaggingPhotoSectionProps) {
  // Only query if photos not passed as prop (backwards compat)
  const { data: queryPhotos = [] } = useSnaggingPhotos(propPhotos ? undefined : item.id);
  const photos = propPhotos ?? queryPhotos;
  
  const uploadPhoto = useUploadSnaggingPhoto();
  const deletePhoto = useDeleteSnaggingPhoto();
  const updatePhotoMeta = useUpdateSnaggingPhotoMeta();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadRoom, setUploadRoom] = useState<string>('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [editingPhoto, setEditingPhoto] = useState<SnaggingPhoto | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const totalPhotos = photos.length;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    
    const compressed = await Promise.all(
      Array.from(files).map(file =>
        compressImage(file).catch(() => file)
      )
    );

    setPendingFiles(compressed);
    setUploadRoom(item.category || '');
    setUploadNotes('');
    setUploadDialogOpen(true);
    setIsCompressing(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadConfirm = async () => {
    if (pendingFiles.length === 0) return;
    setUploadDialogOpen(false);
    
    // Cache user info once before all uploads
    const { data: { user } } = await supabase.auth.getUser();
    let cachedUserInfo: { userId: string; uploaderName: string } | null = null;
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .maybeSingle();
      const uploaderName = profile 
        ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || user.email || 'Onbekend'
        : user.email || 'Onbekend';
      cachedUserInfo = { userId: user.id, uploaderName };
    }
    
    for (const file of pendingFiles) {
      uploadPhoto.mutate({
        itemId: item.id,
        file,
        room: uploadRoom || undefined,
        notes: uploadNotes || undefined,
        cachedUserInfo,
      });
    }
    setPendingFiles([]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeletePhoto = (photo: SnaggingPhoto) => {
    deletePhoto.mutate({
      photoUrl: photo.photo_url,
      photoId: photo.id,
    });
  };

  const handleEditSave = () => {
    if (!editingPhoto) return;
    updatePhotoMeta.mutate({
      id: editingPhoto.id,
      notes: editNotes || null,
      room: editRoom || null,
    });
    setEditingPhoto(null);
  };

  const openEdit = (photo: SnaggingPhoto) => {
    setEditingPhoto(photo);
    setEditNotes(photo.notes || '');
    setEditRoom(photo.room || '');
  };

  // Use prop room options or fallback to empty
  const ROOM_OPTIONS = propRoomOptions ?? [];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Foto's ({totalPhotos})</label>
      
      {/* Photo grid */}
      <div className="space-y-2">
        {photos.map((photo) => (
          <div key={photo.id} className="flex gap-3 p-2 border rounded-lg bg-muted/30">
            <img
              src={getSnaggingThumbnailUrl(photo.photo_url, 160, 70)}
              alt="Inspectie foto"
              className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity shrink-0"
              loading="lazy"
              onClick={() => setLightboxUrl(photo.photo_url)}
            />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 shrink-0" />
                <span>{format(parseISO(photo.uploaded_at), "d MMM yyyy, HH:mm", { locale: nl })}</span>
              </div>
              {photo.uploaded_by_name && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3 shrink-0" />
                  <span>{photo.uploaded_by_name}</span>
                </div>
              )}
              {photo.room && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span>{getCategoryLabel(photo.room)}</span>
                </div>
              )}
              {photo.notes && (
                <p className="text-xs text-muted-foreground truncate">{photo.notes}</p>
              )}
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(photo)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeletePhoto(photo)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadPhoto.isPending || isCompressing}
      >
        <Camera className="h-4 w-4" />
        {isCompressing ? 'Verwerken...' : 'Foto\'s toevoegen'}
      </Button>

      {/* Upload dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => { if (!open) { setUploadDialogOpen(false); setPendingFiles([]); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{pendingFiles.length} foto{pendingFiles.length !== 1 ? "'s" : ''} toevoegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pendingFiles.map((file, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${i + 1}`}
                      className="w-16 h-16 object-cover rounded-md border"
                    />
                    <button
                      type="button"
                      onClick={() => removePendingFile(i)}
                      className="absolute -top-1 -right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {ROOM_OPTIONS.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Kamer / Ruimte</label>
                <Select value={uploadRoom} onValueChange={setUploadRoom}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer kamer (optioneel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notitie</label>
              <Textarea
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                placeholder="Optionele notitie bij deze foto's..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadDialogOpen(false); setPendingFiles([]); }}>Annuleren</Button>
            <Button onClick={handleUploadConfirm} disabled={uploadPhoto.isPending || pendingFiles.length === 0}>
              {uploadPhoto.isPending ? 'Uploaden...' : `${pendingFiles.length} foto${pendingFiles.length !== 1 ? "'s" : ''} uploaden`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingPhoto} onOpenChange={(open) => !open && setEditingPhoto(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Foto bewerken</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {ROOM_OPTIONS.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Kamer / Ruimte</label>
                <Select value={editRoom} onValueChange={setEditRoom}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer kamer (optioneel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notitie</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Notitie bij deze foto..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPhoto(null)}>Annuleren</Button>
            <Button onClick={handleEditSave}>Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={(open) => !open && setLightboxUrl(null)}>
        <DialogContent className="sm:max-w-3xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="sr-only">Foto vergroting</DialogTitle>
          </DialogHeader>
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="Inspectie foto groot"
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}