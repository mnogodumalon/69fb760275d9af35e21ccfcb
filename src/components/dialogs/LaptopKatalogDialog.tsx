import { useState, useEffect, useRef, useCallback } from 'react';
import type { LaptopKatalog } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, uploadFile, getUserProfile } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconArrowBigDownLinesFilled, IconCamera, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode, dataUriToBlob } from '@/lib/ai';
import { lookupKey, lookupKeys } from '@/lib/formatters';

interface LaptopKatalogDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: LaptopKatalog['fields']) => Promise<void>;
  defaultValues?: LaptopKatalog['fields'];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function LaptopKatalogDialog({ open, onClose, onSubmit, defaultValues, enablePhotoScan = true, enablePhotoLocation = true }: LaptopKatalogDialogProps) {
  const [fields, setFields] = useState<Partial<LaptopKatalog['fields']>>({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [aiText, setAiText] = useState('');

  useEffect(() => {
    if (open) {
      setFields(defaultValues ?? {});
      setPreview(null);
      setScanSuccess(false);
      setAiText('');
    }
  }, [open, defaultValues]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const clean = cleanFieldsForApi({ ...fields }, 'laptop_katalog');
      await onSubmit(clean as LaptopKatalog['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleAiExtract(file?: File) {
    if (!file && !aiText.trim()) return;
    setScanning(true);
    setScanSuccess(false);
    try {
      let uri: string | undefined;
      let gps: { latitude: number; longitude: number } | null = null;
      let geoAddr = '';
      const parts: string[] = [];
      if (file) {
        const [dataUri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
        uri = dataUri;
        if (file.type.startsWith('image/')) setPreview(uri);
        gps = enablePhotoLocation ? meta?.gps ?? null : null;
        if (gps) {
          geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
          parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
          if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
        }
        if (meta?.dateTime) {
          parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
        }
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "hersteller_name": string | null, // Hersteller\n  "preis": number | null, // Preis (€)\n  "modellname": string | null, // Modellname\n  "verfuegbarkeit": LookupValue | null, // Verfügbarkeit (select one key: "nicht_auf_lager" | "vorbestellbar" | "auslaufmodell" | "auf_lager") mapping: nicht_auf_lager=Nicht auf Lager, vorbestellbar=Vorbestellbar, auslaufmodell=Auslaufmodell, auf_lager=Auf Lager\n  "usage": LookupValue[] | null, // Nutzungsart (select one or more keys: "business" | "gaming" | "student" | "kreativ" | "multimedia" | "allgemein" | "outdoor") mapping: business=Business, gaming=Gaming, student=Student, kreativ=Kreativ & Design, multimedia=Multimedia, allgemein=Allgemein, outdoor=Outdoor / Robust\n  "betriebssystem": LookupValue | null, // Betriebssystem (select one key: "windows11" | "windows10" | "macos" | "linux" | "chromeos" | "ohne_os") mapping: windows11=Windows 11, windows10=Windows 10, macos=macOS, linux=Linux, chromeos=ChromeOS, ohne_os=Ohne Betriebssystem\n  "bildschirmgroesse": number | null, // Bildschirmgröße (Zoll)\n  "aufloesung": LookupValue | null, // Auflösung (select one key: "hd" | "fhd" | "qhd" | "uhd" | "retina") mapping: hd=HD (1366x768), fhd=Full HD (1920x1080), qhd=2K / QHD (2560x1440), uhd=4K / UHD (3840x2160), retina=Retina / Sonstige\n  "display_typ": LookupValue | null, // Display-Typ (select one key: "ips" | "oled" | "tn" | "va" | "amoled") mapping: ips=IPS, oled=OLED, tn=TN, va=VA, amoled=AMOLED\n  "touchscreen": boolean | null, // Touchscreen\n  "prozessor": string | null, // Prozessor\n  "prozessor_hersteller": LookupValue | null, // Prozessor-Hersteller (select one key: "intel" | "amd" | "apple_silicon" | "qualcomm" | "sonstige") mapping: intel=Intel, amd=AMD, apple_silicon=Apple Silicon, qualcomm=Qualcomm, sonstige=Sonstige\n  "ram_gb": number | null, // Arbeitsspeicher (RAM) in GB\n  "grafikkarte": string | null, // Grafikkarte\n  "grafikkarte_typ": LookupValue | null, // Grafikkarten-Typ (select one key: "integriert" | "dediziert") mapping: integriert=Integriert, dediziert=Dediziert\n  "speicher_gb": number | null, // Speicherkapazität (GB)\n  "speicher_typ": LookupValue | null, // Speichertyp (select one key: "ssd" | "hdd" | "ssd_hdd" | "emmc") mapping: ssd=SSD, hdd=HDD, ssd_hdd=SSD + HDD, emmc=eMMC\n  "akkulaufzeit_h": number | null, // Akkulaufzeit (Stunden)\n  "akkukapazitaet_wh": number | null, // Akkukapazität (Wh)\n  "gewicht_kg": number | null, // Gewicht (kg)\n  "anschluesse": LookupValue[] | null, // Anschlüsse (select one or more keys: "usb_a" | "usb_c" | "thunderbolt" | "hdmi" | "displayport" | "sd_karte" | "ethernet" | "klinke") mapping: usb_a=USB-A, usb_c=USB-C, thunderbolt=Thunderbolt, hdmi=HDMI, displayport=DisplayPort, sd_karte=SD-Kartenleser, ethernet=Ethernet (RJ45), klinke=Klinke (Audio)\n  "wlan": LookupValue | null, // WLAN-Standard (select one key: "wifi5" | "wifi6" | "wifi6e" | "wifi7") mapping: wifi5=Wi-Fi 5 (802.11ac), wifi6=Wi-Fi 6 (802.11ax), wifi6e=Wi-Fi 6E, wifi7=Wi-Fi 7\n  "bluetooth": boolean | null, // Bluetooth\n  "lte_5g": boolean | null, // LTE / 5G\n  "farbe": string | null, // Farbe\n  "tastaturbeleuchtung": boolean | null, // Tastaturbeleuchtung\n  "webcam": boolean | null, // Webcam integriert\n  "garantie_jahre": number | null, // Garantie (Jahre)\n  "besonderheiten": string | null, // Besonderheiten / Hinweise\n}`;
      const raw = await extractFromInput<Record<string, unknown>>(schema, {
        dataUri: uri,
        userText: aiText.trim() || undefined,
        photoContext,
        intent: DIALOG_INTENT,
      });
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        for (const [k, v] of Object.entries(raw)) {
          if (v != null) merged[k] = v;
        }
        return merged as Partial<LaptopKatalog['fields']>;
      });
      // Upload scanned file to file fields
      if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
        try {
          const blob = dataUriToBlob(uri!);
          const fileUrl = await uploadFile(blob, file.name);
          setFields(prev => ({ ...prev, laptop_bild: fileUrl }));
        } catch (uploadErr) {
          console.error('File upload failed:', uploadErr);
        }
      }
      setAiText('');
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleAiExtract(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleAiExtract(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Laptop-Katalog bearbeiten' : 'Laptop-Katalog hinzufügen';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{DIALOG_INTENT}</DialogTitle>
        </DialogHeader>

        {enablePhotoScan && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div>
              <div className="flex items-center gap-1.5 font-medium">
                <IconSparkles className="h-4 w-4 text-primary" />
                KI-Assistent
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Versteht Fotos, Dokumente und Text und füllt alles für dich aus</p>
            </div>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  KI-Assistent darf zusätzlich Informationen zu meiner Person verwenden
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? 'Lade...' : '(mehr Infos)'}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">Folgende Infos über dich können von der KI genutzt werden:</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">Profil konnte nicht geladen werden</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hierher ziehen oder auswählen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1" />Dokument
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder="Text eingeben oder einfügen, z.B. Notizen, E-Mails, Beschreibungen..."
                value={aiText}
                onChange={e => {
                  setAiText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(Math.max(el.scrollHeight, 56), 96) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && aiText.trim() && !scanning) {
                    e.preventDefault();
                    handleAiExtract();
                  }
                }}
                disabled={scanning}
                rows={2}
                className="pr-12 resize-none text-sm overflow-y-auto"
              />
              <button
                type="button"
                className="absolute right-2 top-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={scanning}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setAiText(prev => prev ? prev + '\n' + text : text);
                  } catch {}
                }}
                title="Paste"
              >
                <IconClipboard className="h-4 w-4" />
              </button>
            </div>
            {aiText.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs"
                disabled={scanning}
                onClick={() => handleAiExtract()}
              >
                <IconSparkles className="h-3.5 w-3.5 mr-1.5" />Analysieren
              </Button>
            )}
            <div className="flex justify-center pt-1">
              <IconArrowBigDownLinesFilled className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hersteller_name">Hersteller</Label>
            <Input
              id="hersteller_name"
              value={fields.hersteller_name ?? ''}
              onChange={e => setFields(f => ({ ...f, hersteller_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preis">Preis (€)</Label>
            <Input
              id="preis"
              type="number"
              value={fields.preis ?? ''}
              onChange={e => setFields(f => ({ ...f, preis: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modellname">Modellname</Label>
            <Input
              id="modellname"
              value={fields.modellname ?? ''}
              onChange={e => setFields(f => ({ ...f, modellname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verfuegbarkeit">Verfügbarkeit</Label>
            <Select
              value={lookupKey(fields.verfuegbarkeit) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, verfuegbarkeit: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="verfuegbarkeit"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="nicht_auf_lager">Nicht auf Lager</SelectItem>
                <SelectItem value="vorbestellbar">Vorbestellbar</SelectItem>
                <SelectItem value="auslaufmodell">Auslaufmodell</SelectItem>
                <SelectItem value="auf_lager">Auf Lager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="laptop_bild">Laptop-Bild</Label>
            {fields.laptop_bild ? (
              <div className="flex items-center gap-3 rounded-lg border p-2">
                <div className="relative h-14 w-14 shrink-0 rounded-md bg-muted overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <IconFileText size={20} className="text-muted-foreground" />
                  </div>
                  <img
                    src={fields.laptop_bild}
                    alt=""
                    className="relative h-full w-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-foreground">{fields.laptop_bild.split("/").pop()}</p>
                  <div className="flex gap-2 mt-1">
                    <label
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      Ändern
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const fileUrl = await uploadFile(file, file.name);
                            setFields(f => ({ ...f, laptop_bild: fileUrl }));
                          } catch (err) { console.error('Upload failed:', err); }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setFields(f => ({ ...f, laptop_bild: undefined }))}
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label
                className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <IconUpload size={20} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Datei hochladen</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const fileUrl = await uploadFile(file, file.name);
                      setFields(f => ({ ...f, laptop_bild: fileUrl }));
                    } catch (err) { console.error('Upload failed:', err); }
                  }}
                />
              </label>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="usage">Nutzungsart</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="usage_business"
                  checked={lookupKeys(fields.usage).includes('business')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.usage);
                      const next = checked ? [...current, 'business'] : current.filter(k => k !== 'business');
                      return { ...f, usage: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="usage_business" className="font-normal">Business</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="usage_gaming"
                  checked={lookupKeys(fields.usage).includes('gaming')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.usage);
                      const next = checked ? [...current, 'gaming'] : current.filter(k => k !== 'gaming');
                      return { ...f, usage: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="usage_gaming" className="font-normal">Gaming</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="usage_student"
                  checked={lookupKeys(fields.usage).includes('student')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.usage);
                      const next = checked ? [...current, 'student'] : current.filter(k => k !== 'student');
                      return { ...f, usage: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="usage_student" className="font-normal">Student</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="usage_kreativ"
                  checked={lookupKeys(fields.usage).includes('kreativ')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.usage);
                      const next = checked ? [...current, 'kreativ'] : current.filter(k => k !== 'kreativ');
                      return { ...f, usage: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="usage_kreativ" className="font-normal">Kreativ & Design</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="usage_multimedia"
                  checked={lookupKeys(fields.usage).includes('multimedia')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.usage);
                      const next = checked ? [...current, 'multimedia'] : current.filter(k => k !== 'multimedia');
                      return { ...f, usage: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="usage_multimedia" className="font-normal">Multimedia</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="usage_allgemein"
                  checked={lookupKeys(fields.usage).includes('allgemein')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.usage);
                      const next = checked ? [...current, 'allgemein'] : current.filter(k => k !== 'allgemein');
                      return { ...f, usage: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="usage_allgemein" className="font-normal">Allgemein</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="usage_outdoor"
                  checked={lookupKeys(fields.usage).includes('outdoor')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.usage);
                      const next = checked ? [...current, 'outdoor'] : current.filter(k => k !== 'outdoor');
                      return { ...f, usage: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="usage_outdoor" className="font-normal">Outdoor / Robust</Label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="betriebssystem">Betriebssystem</Label>
            <Select
              value={lookupKey(fields.betriebssystem) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, betriebssystem: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="betriebssystem"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="windows11">Windows 11</SelectItem>
                <SelectItem value="windows10">Windows 10</SelectItem>
                <SelectItem value="macos">macOS</SelectItem>
                <SelectItem value="linux">Linux</SelectItem>
                <SelectItem value="chromeos">ChromeOS</SelectItem>
                <SelectItem value="ohne_os">Ohne Betriebssystem</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bildschirmgroesse">Bildschirmgröße (Zoll)</Label>
            <Input
              id="bildschirmgroesse"
              type="number"
              value={fields.bildschirmgroesse ?? ''}
              onChange={e => setFields(f => ({ ...f, bildschirmgroesse: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aufloesung">Auflösung</Label>
            <Select
              value={lookupKey(fields.aufloesung) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, aufloesung: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="aufloesung"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="hd">HD (1366x768)</SelectItem>
                <SelectItem value="fhd">Full HD (1920x1080)</SelectItem>
                <SelectItem value="qhd">2K / QHD (2560x1440)</SelectItem>
                <SelectItem value="uhd">4K / UHD (3840x2160)</SelectItem>
                <SelectItem value="retina">Retina / Sonstige</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="display_typ">Display-Typ</Label>
            <Select
              value={lookupKey(fields.display_typ) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, display_typ: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="display_typ"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="ips">IPS</SelectItem>
                <SelectItem value="oled">OLED</SelectItem>
                <SelectItem value="tn">TN</SelectItem>
                <SelectItem value="va">VA</SelectItem>
                <SelectItem value="amoled">AMOLED</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="touchscreen">Touchscreen</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="touchscreen"
                checked={!!fields.touchscreen}
                onCheckedChange={(v) => setFields(f => ({ ...f, touchscreen: !!v }))}
              />
              <Label htmlFor="touchscreen" className="font-normal">Touchscreen</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prozessor">Prozessor</Label>
            <Input
              id="prozessor"
              value={fields.prozessor ?? ''}
              onChange={e => setFields(f => ({ ...f, prozessor: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prozessor_hersteller">Prozessor-Hersteller</Label>
            <Select
              value={lookupKey(fields.prozessor_hersteller) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, prozessor_hersteller: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="prozessor_hersteller"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="intel">Intel</SelectItem>
                <SelectItem value="amd">AMD</SelectItem>
                <SelectItem value="apple_silicon">Apple Silicon</SelectItem>
                <SelectItem value="qualcomm">Qualcomm</SelectItem>
                <SelectItem value="sonstige">Sonstige</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ram_gb">Arbeitsspeicher (RAM) in GB</Label>
            <Input
              id="ram_gb"
              type="number"
              value={fields.ram_gb ?? ''}
              onChange={e => setFields(f => ({ ...f, ram_gb: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grafikkarte">Grafikkarte</Label>
            <Input
              id="grafikkarte"
              value={fields.grafikkarte ?? ''}
              onChange={e => setFields(f => ({ ...f, grafikkarte: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grafikkarte_typ">Grafikkarten-Typ</Label>
            <Select
              value={lookupKey(fields.grafikkarte_typ) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, grafikkarte_typ: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="grafikkarte_typ"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="integriert">Integriert</SelectItem>
                <SelectItem value="dediziert">Dediziert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="speicher_gb">Speicherkapazität (GB)</Label>
            <Input
              id="speicher_gb"
              type="number"
              value={fields.speicher_gb ?? ''}
              onChange={e => setFields(f => ({ ...f, speicher_gb: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="speicher_typ">Speichertyp</Label>
            <Select
              value={lookupKey(fields.speicher_typ) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, speicher_typ: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="speicher_typ"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="ssd">SSD</SelectItem>
                <SelectItem value="hdd">HDD</SelectItem>
                <SelectItem value="ssd_hdd">SSD + HDD</SelectItem>
                <SelectItem value="emmc">eMMC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="akkulaufzeit_h">Akkulaufzeit (Stunden)</Label>
            <Input
              id="akkulaufzeit_h"
              type="number"
              value={fields.akkulaufzeit_h ?? ''}
              onChange={e => setFields(f => ({ ...f, akkulaufzeit_h: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="akkukapazitaet_wh">Akkukapazität (Wh)</Label>
            <Input
              id="akkukapazitaet_wh"
              type="number"
              value={fields.akkukapazitaet_wh ?? ''}
              onChange={e => setFields(f => ({ ...f, akkukapazitaet_wh: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gewicht_kg">Gewicht (kg)</Label>
            <Input
              id="gewicht_kg"
              type="number"
              value={fields.gewicht_kg ?? ''}
              onChange={e => setFields(f => ({ ...f, gewicht_kg: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anschluesse">Anschlüsse</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="anschluesse_usb_a"
                  checked={lookupKeys(fields.anschluesse).includes('usb_a')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.anschluesse);
                      const next = checked ? [...current, 'usb_a'] : current.filter(k => k !== 'usb_a');
                      return { ...f, anschluesse: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="anschluesse_usb_a" className="font-normal">USB-A</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="anschluesse_usb_c"
                  checked={lookupKeys(fields.anschluesse).includes('usb_c')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.anschluesse);
                      const next = checked ? [...current, 'usb_c'] : current.filter(k => k !== 'usb_c');
                      return { ...f, anschluesse: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="anschluesse_usb_c" className="font-normal">USB-C</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="anschluesse_thunderbolt"
                  checked={lookupKeys(fields.anschluesse).includes('thunderbolt')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.anschluesse);
                      const next = checked ? [...current, 'thunderbolt'] : current.filter(k => k !== 'thunderbolt');
                      return { ...f, anschluesse: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="anschluesse_thunderbolt" className="font-normal">Thunderbolt</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="anschluesse_hdmi"
                  checked={lookupKeys(fields.anschluesse).includes('hdmi')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.anschluesse);
                      const next = checked ? [...current, 'hdmi'] : current.filter(k => k !== 'hdmi');
                      return { ...f, anschluesse: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="anschluesse_hdmi" className="font-normal">HDMI</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="anschluesse_displayport"
                  checked={lookupKeys(fields.anschluesse).includes('displayport')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.anschluesse);
                      const next = checked ? [...current, 'displayport'] : current.filter(k => k !== 'displayport');
                      return { ...f, anschluesse: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="anschluesse_displayport" className="font-normal">DisplayPort</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="anschluesse_sd_karte"
                  checked={lookupKeys(fields.anschluesse).includes('sd_karte')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.anschluesse);
                      const next = checked ? [...current, 'sd_karte'] : current.filter(k => k !== 'sd_karte');
                      return { ...f, anschluesse: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="anschluesse_sd_karte" className="font-normal">SD-Kartenleser</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="anschluesse_ethernet"
                  checked={lookupKeys(fields.anschluesse).includes('ethernet')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.anschluesse);
                      const next = checked ? [...current, 'ethernet'] : current.filter(k => k !== 'ethernet');
                      return { ...f, anschluesse: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="anschluesse_ethernet" className="font-normal">Ethernet (RJ45)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="anschluesse_klinke"
                  checked={lookupKeys(fields.anschluesse).includes('klinke')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.anschluesse);
                      const next = checked ? [...current, 'klinke'] : current.filter(k => k !== 'klinke');
                      return { ...f, anschluesse: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="anschluesse_klinke" className="font-normal">Klinke (Audio)</Label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wlan">WLAN-Standard</Label>
            <Select
              value={lookupKey(fields.wlan) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, wlan: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="wlan"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="wifi5">Wi-Fi 5 (802.11ac)</SelectItem>
                <SelectItem value="wifi6">Wi-Fi 6 (802.11ax)</SelectItem>
                <SelectItem value="wifi6e">Wi-Fi 6E</SelectItem>
                <SelectItem value="wifi7">Wi-Fi 7</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bluetooth">Bluetooth</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="bluetooth"
                checked={!!fields.bluetooth}
                onCheckedChange={(v) => setFields(f => ({ ...f, bluetooth: !!v }))}
              />
              <Label htmlFor="bluetooth" className="font-normal">Bluetooth</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lte_5g">LTE / 5G</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="lte_5g"
                checked={!!fields.lte_5g}
                onCheckedChange={(v) => setFields(f => ({ ...f, lte_5g: !!v }))}
              />
              <Label htmlFor="lte_5g" className="font-normal">LTE / 5G</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="farbe">Farbe</Label>
            <Input
              id="farbe"
              value={fields.farbe ?? ''}
              onChange={e => setFields(f => ({ ...f, farbe: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tastaturbeleuchtung">Tastaturbeleuchtung</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="tastaturbeleuchtung"
                checked={!!fields.tastaturbeleuchtung}
                onCheckedChange={(v) => setFields(f => ({ ...f, tastaturbeleuchtung: !!v }))}
              />
              <Label htmlFor="tastaturbeleuchtung" className="font-normal">Tastaturbeleuchtung</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="webcam">Webcam integriert</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="webcam"
                checked={!!fields.webcam}
                onCheckedChange={(v) => setFields(f => ({ ...f, webcam: !!v }))}
              />
              <Label htmlFor="webcam" className="font-normal">Webcam integriert</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="garantie_jahre">Garantie (Jahre)</Label>
            <Input
              id="garantie_jahre"
              type="number"
              value={fields.garantie_jahre ?? ''}
              onChange={e => setFields(f => ({ ...f, garantie_jahre: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="besonderheiten">Besonderheiten / Hinweise</Label>
            <Textarea
              id="besonderheiten"
              value={fields.besonderheiten ?? ''}
              onChange={e => setFields(f => ({ ...f, besonderheiten: e.target.value }))}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}