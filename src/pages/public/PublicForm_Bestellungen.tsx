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
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '69fb75f02b467025344bf46c';
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

export default function PublicFormBestellungen() {
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
          <h1 className="text-2xl font-bold text-foreground">Bestellungen — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="kunde_vorname">Vorname</Label>
            <Input
              id="kunde_vorname"
              value={fields.kunde_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, kunde_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kunde_nachname">Nachname</Label>
            <Input
              id="kunde_nachname"
              value={fields.kunde_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, kunde_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kunde_email">E-Mail</Label>
            <Input
              id="kunde_email"
              type="email"
              value={fields.kunde_email ?? ''}
              onChange={e => setFields(f => ({ ...f, kunde_email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kunde_telefon">Telefonnummer</Label>
            <Input
              id="kunde_telefon"
              value={fields.kunde_telefon ?? ''}
              onChange={e => setFields(f => ({ ...f, kunde_telefon: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adresse_strasse">Straße</Label>
            <Input
              id="adresse_strasse"
              value={fields.adresse_strasse ?? ''}
              onChange={e => setFields(f => ({ ...f, adresse_strasse: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adresse_hausnummer">Hausnummer</Label>
            <Input
              id="adresse_hausnummer"
              value={fields.adresse_hausnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, adresse_hausnummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adresse_plz">PLZ</Label>
            <Input
              id="adresse_plz"
              value={fields.adresse_plz ?? ''}
              onChange={e => setFields(f => ({ ...f, adresse_plz: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adresse_ort">Ort</Label>
            <Input
              id="adresse_ort"
              value={fields.adresse_ort ?? ''}
              onChange={e => setFields(f => ({ ...f, adresse_ort: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="menge">Menge</Label>
            <Input
              id="menge"
              type="number"
              value={fields.menge ?? ''}
              onChange={e => setFields(f => ({ ...f, menge: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bestelldatum">Bestelldatum</Label>
            <Input
              id="bestelldatum"
              type="date"
              value={fields.bestelldatum ?? ''}
              onChange={e => setFields(f => ({ ...f, bestelldatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zahlungsart">Zahlungsart</Label>
            <Select
              value={lookupKey(fields.zahlungsart) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, zahlungsart: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="zahlungsart"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="vorkasse">Vorkasse</SelectItem>
                <SelectItem value="rechnung">Rechnung</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="kreditkarte">Kreditkarte</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lieferadresse_abweichend">Abweichende Lieferadresse</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="lieferadresse_abweichend"
                checked={!!fields.lieferadresse_abweichend}
                onCheckedChange={(v) => setFields(f => ({ ...f, lieferadresse_abweichend: !!v }))}
              />
              <Label htmlFor="lieferadresse_abweichend" className="font-normal">Abweichende Lieferadresse</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bestellstatus">Bestellstatus</Label>
            <Select
              value={lookupKey(fields.bestellstatus) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, bestellstatus: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="bestellstatus"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="offen">Offen</SelectItem>
                <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                <SelectItem value="versandt">Versandt</SelectItem>
                <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                <SelectItem value="storniert">Storniert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bemerkungen">Bemerkungen</Label>
            <Textarea
              id="bemerkungen"
              value={fields.bemerkungen ?? ''}
              onChange={e => setFields(f => ({ ...f, bemerkungen: e.target.value }))}
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
