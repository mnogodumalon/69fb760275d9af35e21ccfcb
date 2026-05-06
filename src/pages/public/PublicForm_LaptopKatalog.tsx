import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { lookupKey, lookupKeys } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '69fb75ec0e449f5ac74b7870';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormLaptopKatalog() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Laptop-Katalog — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
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

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
