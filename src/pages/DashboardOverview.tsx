import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichBestellungen } from '@/lib/enrich';
import type { EnrichedBestellungen } from '@/types/enriched';
import type { LaptopKatalog } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatCurrency } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LaptopKatalogDialog } from '@/components/dialogs/LaptopKatalogDialog';
import { BestellungenDialog } from '@/components/dialogs/BestellungenDialog';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconShoppingCart,
  IconPackage, IconTruck, IconCircleCheck, IconX, IconClock,
  IconSearch, IconFilter, IconDeviceLaptop,
} from '@tabler/icons-react';

const APPGROUP_ID = '69fb760275d9af35e21ccfcb';
const REPAIR_ENDPOINT = '/claude/build/repair';

type DialogMode = 'laptop-create' | 'laptop-edit' | 'order-create' | 'order-edit' | null;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  offen: { label: 'Offen', color: 'bg-amber-500/10 text-amber-700 border-amber-200', icon: <IconClock size={12} /> },
  in_bearbeitung: { label: 'In Bearbeitung', color: 'bg-blue-500/10 text-blue-700 border-blue-200', icon: <IconPackage size={12} /> },
  versandt: { label: 'Versandt', color: 'bg-violet-500/10 text-violet-700 border-violet-200', icon: <IconTruck size={12} /> },
  abgeschlossen: { label: 'Abgeschlossen', color: 'bg-green-500/10 text-green-700 border-green-200', icon: <IconCircleCheck size={12} /> },
  storniert: { label: 'Storniert', color: 'bg-red-500/10 text-red-700 border-red-200', icon: <IconX size={12} /> },
};

const AVAIL_CONFIG: Record<string, { label: string; dot: string }> = {
  auf_lager: { label: 'Auf Lager', dot: 'bg-green-500' },
  vorbestellbar: { label: 'Vorbestellbar', dot: 'bg-amber-400' },
  auslaufmodell: { label: 'Auslaufmodell', dot: 'bg-orange-400' },
  nicht_auf_lager: { label: 'Nicht auf Lager', dot: 'bg-red-400' },
};

export default function DashboardOverview() {
  const {
    laptopKatalog, bestellungen,
    laptopKatalogMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedBestellungen = enrichBestellungen(bestellungen, { laptopKatalogMap });

  // Dialog state
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editLaptop, setEditLaptop] = useState<LaptopKatalog | null>(null);
  const [editOrder, setEditOrder] = useState<EnrichedBestellungen | null>(null);
  const [deleteLaptop, setDeleteLaptop] = useState<LaptopKatalog | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<EnrichedBestellungen | null>(null);
  const [preselectedLaptopId, setPreselectedLaptopId] = useState<string | null>(null);

  // Filter state
  const [laptopSearch, setLaptopSearch] = useState('');
  const [verfFilter, setVerfFilter] = useState<string>('alle');
  const [activeOrderStatus, setActiveOrderStatus] = useState<string>('alle');

  // Memos
  const filteredLaptops = useMemo(() => {
    return laptopKatalog.filter((l) => {
      const q = laptopSearch.toLowerCase();
      const matchSearch =
        !q ||
        (l.fields.modellname ?? '').toLowerCase().includes(q) ||
        (l.fields.hersteller_name ?? '').toLowerCase().includes(q);
      const matchVerf = verfFilter === 'alle' || l.fields.verfuegbarkeit?.key === verfFilter;
      return matchSearch && matchVerf;
    });
  }, [laptopKatalog, laptopSearch, verfFilter]);

  const filteredOrders = useMemo(() => {
    return enrichedBestellungen.filter((o) => {
      return activeOrderStatus === 'alle' || o.fields.bestellstatus?.key === activeOrderStatus;
    });
  }, [enrichedBestellungen, activeOrderStatus]);

  const kpiData = useMemo(() => {
    const offenCount = bestellungen.filter((o) => o.fields.bestellstatus?.key === 'offen').length;
    const versandtCount = bestellungen.filter((o) => o.fields.bestellstatus?.key === 'versandt').length;
    const abgeschlossenCount = bestellungen.filter((o) => o.fields.bestellstatus?.key === 'abgeschlossen').length;
    return { offenCount, versandtCount, abgeschlossenCount };
  }, [bestellungen]);

  const handleDeleteLaptop = async () => {
    if (!deleteLaptop) return;
    await LivingAppsService.deleteLaptopKatalogEntry(deleteLaptop.record_id);
    setDeleteLaptop(null);
    fetchAll();
  };

  const handleDeleteOrder = async () => {
    if (!deleteOrder) return;
    await LivingAppsService.deleteBestellungenEntry(deleteOrder.record_id);
    setDeleteOrder(null);
    fetchAll();
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6 pb-8">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Laptops im Katalog"
          value={String(laptopKatalog.length)}
          description="Produkte gesamt"
          icon={<IconDeviceLaptop size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Bestellungen"
          value={String(bestellungen.length)}
          description="Gesamt"
          icon={<IconShoppingCart size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Offen"
          value={String(kpiData.offenCount)}
          description="Neue Bestellungen"
          icon={<IconClock size={18} className="text-amber-500" />}
        />
        <StatCard
          title="Abgeschlossen"
          value={String(kpiData.abgeschlossenCount)}
          description="Fertig abgewickelt"
          icon={<IconCircleCheck size={18} className="text-green-500" />}
        />
      </div>

      {/* Main workspace: Catalog + Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* LEFT: Laptop Katalog */}
        <div className="lg:col-span-3 flex flex-col gap-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-foreground text-lg">Laptop-Katalog</h2>
            <Button
              size="sm"
              onClick={() => { setEditLaptop(null); setDialogMode('laptop-create'); }}
            >
              <IconPlus size={15} className="mr-1 shrink-0" />
              <span className="hidden sm:inline">Laptop hinzufügen</span>
              <span className="sm:hidden">Neu</span>
            </Button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[140px]">
              <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Suchen..."
                value={laptopSearch}
                onChange={(e) => setLaptopSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex items-center gap-1">
              <IconFilter size={13} className="text-muted-foreground shrink-0" />
              <select
                value={verfFilter}
                onChange={(e) => setVerfFilter(e.target.value)}
                className="text-sm rounded-lg border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="alle">Alle</option>
                <option value="auf_lager">Auf Lager</option>
                <option value="vorbestellbar">Vorbestellbar</option>
                <option value="auslaufmodell">Auslaufmodell</option>
                <option value="nicht_auf_lager">Nicht auf Lager</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          {filteredLaptops.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-dashed border-border">
              <IconDeviceLaptop size={40} stroke={1.5} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">Keine Laptops gefunden.<br />Füge deinen ersten Laptop hinzu.</p>
              <Button size="sm" variant="outline" onClick={() => { setEditLaptop(null); setDialogMode('laptop-create'); }}>
                <IconPlus size={14} className="mr-1" /> Laptop hinzufügen
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[620px] pr-1">
              {filteredLaptops.map((laptop) => (
                <LaptopCard
                  key={laptop.record_id}
                  laptop={laptop}
                  onEdit={() => { setEditLaptop(laptop); setDialogMode('laptop-edit'); }}
                  onDelete={() => setDeleteLaptop(laptop)}
                  onOrder={() => {
                    setPreselectedLaptopId(laptop.record_id);
                    setEditOrder(null);
                    setDialogMode('order-create');
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Bestellungen */}
        <div className="lg:col-span-2 flex flex-col gap-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-foreground text-lg">Bestellungen</h2>
            <Button
              size="sm"
              onClick={() => { setEditOrder(null); setPreselectedLaptopId(null); setDialogMode('order-create'); }}
            >
              <IconPlus size={15} className="mr-1 shrink-0" />
              <span className="hidden sm:inline">Neue Bestellung</span>
              <span className="sm:hidden">Neu</span>
            </Button>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {[{ key: 'alle', label: 'Alle' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ key: k, label: v.label }))].map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveOrderStatus(s.key)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  activeOrderStatus === s.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/40'
                }`}
              >
                {s.label}
                {s.key !== 'alle' && (
                  <span className="ml-1 opacity-70">
                    {enrichedBestellungen.filter((o) => o.fields.bestellstatus?.key === s.key).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Order List */}
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-dashed border-border">
              <IconShoppingCart size={40} stroke={1.5} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">Keine Bestellungen vorhanden.</p>
              <Button size="sm" variant="outline" onClick={() => { setEditOrder(null); setPreselectedLaptopId(null); setDialogMode('order-create'); }}>
                <IconPlus size={14} className="mr-1" /> Bestellung erfassen
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[620px] pr-1">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.record_id}
                  order={order}
                  onEdit={() => { setEditOrder(order); setPreselectedLaptopId(null); setDialogMode('order-edit'); }}
                  onDelete={() => setDeleteOrder(order)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <LaptopKatalogDialog
        open={dialogMode === 'laptop-create' || dialogMode === 'laptop-edit'}
        onClose={() => { setDialogMode(null); setEditLaptop(null); }}
        onSubmit={async (fields) => {
          if (editLaptop) {
            await LivingAppsService.updateLaptopKatalogEntry(editLaptop.record_id, fields);
          } else {
            await LivingAppsService.createLaptopKatalogEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editLaptop?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['LaptopKatalog']}
      />

      <BestellungenDialog
        open={dialogMode === 'order-create' || dialogMode === 'order-edit'}
        onClose={() => { setDialogMode(null); setEditOrder(null); setPreselectedLaptopId(null); }}
        onSubmit={async (fields) => {
          if (editOrder) {
            await LivingAppsService.updateBestellungenEntry(editOrder.record_id, fields);
          } else {
            await LivingAppsService.createBestellungenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={
          editOrder
            ? editOrder.fields
            : preselectedLaptopId
            ? { laptop_ref: createRecordUrl(APP_IDS.LAPTOP_KATALOG, preselectedLaptopId) }
            : undefined
        }
        laptop_katalogList={laptopKatalog}
        enablePhotoScan={AI_PHOTO_SCAN['Bestellungen']}
      />

      <ConfirmDialog
        open={!!deleteLaptop}
        title="Laptop löschen"
        description={`Möchtest du "${deleteLaptop?.fields.modellname ?? 'diesen Laptop'}" wirklich löschen?`}
        onConfirm={handleDeleteLaptop}
        onClose={() => setDeleteLaptop(null)}
      />

      <ConfirmDialog
        open={!!deleteOrder}
        title="Bestellung löschen"
        description={`Bestellung von ${deleteOrder?.fields.kunde_vorname ?? ''} ${deleteOrder?.fields.kunde_nachname ?? ''} wirklich löschen?`}
        onConfirm={handleDeleteOrder}
        onClose={() => setDeleteOrder(null)}
      />
    </div>
  );
}

/* ─────────────────── Sub-components ─────────────────── */

function LaptopCard({
  laptop,
  onEdit,
  onDelete,
  onOrder,
}: {
  laptop: LaptopKatalog;
  onEdit: () => void;
  onDelete: () => void;
  onOrder: () => void;
}) {
  const avail = AVAIL_CONFIG[laptop.fields.verfuegbarkeit?.key ?? ''] ?? { label: laptop.fields.verfuegbarkeit?.label ?? '—', dot: 'bg-muted-foreground' };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
      {/* Image */}
      {laptop.fields.laptop_bild ? (
        <div className="h-36 bg-muted overflow-hidden">
          <img
            src={laptop.fields.laptop_bild}
            alt={laptop.fields.modellname ?? 'Laptop'}
            className="w-full h-full object-contain p-2"
          />
        </div>
      ) : (
        <div className="h-36 bg-muted flex items-center justify-center">
          <IconDeviceLaptop size={48} stroke={1.5} className="text-muted-foreground/40" />
        </div>
      )}

      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{laptop.fields.hersteller_name ?? '—'}</p>
            <p className="font-semibold text-sm truncate">{laptop.fields.modellname ?? 'Unbekanntes Modell'}</p>
          </div>
          <p className="font-bold text-primary shrink-0 text-sm">
            {laptop.fields.preis != null ? formatCurrency(laptop.fields.preis) : '—'}
          </p>
        </div>

        {/* Availability + specs */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${avail.dot}`} />
            {avail.label}
          </span>
          {laptop.fields.ram_gb && (
            <span className="text-xs bg-muted rounded px-1.5 py-0.5">{laptop.fields.ram_gb} GB RAM</span>
          )}
          {laptop.fields.speicher_gb && (
            <span className="text-xs bg-muted rounded px-1.5 py-0.5">{laptop.fields.speicher_gb} GB SSD</span>
          )}
          {laptop.fields.bildschirmgroesse && (
            <span className="text-xs bg-muted rounded px-1.5 py-0.5">{laptop.fields.bildschirmgroesse}"</span>
          )}
        </div>

        {/* Usage tags */}
        {laptop.fields.usage && laptop.fields.usage.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {laptop.fields.usage.slice(0, 3).map((u) => (
              <Badge key={u.key} variant="secondary" className="text-xs py-0 px-1.5">{u.label}</Badge>
            ))}
            {laptop.fields.usage.length > 3 && (
              <Badge variant="secondary" className="text-xs py-0 px-1.5">+{laptop.fields.usage.length - 3}</Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1.5 mt-auto pt-1 flex-wrap">
          <Button size="sm" variant="outline" className="flex-1 min-w-0 h-7 text-xs" onClick={onOrder}>
            <IconShoppingCart size={12} className="mr-1 shrink-0" />Bestellen
          </Button>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={onEdit}>
            <IconPencil size={13} />
          </Button>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
            <IconTrash size={13} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  onEdit,
  onDelete,
}: {
  order: EnrichedBestellungen;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = STATUS_CONFIG[order.fields.bestellstatus?.key ?? ''] ?? {
    label: order.fields.bestellstatus?.label ?? 'Unbekannt',
    color: 'bg-muted text-muted-foreground border-border',
    icon: null,
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">
            {order.fields.kunde_vorname ?? ''} {order.fields.kunde_nachname ?? '—'}
          </p>
          {order.laptop_refName && (
            <p className="text-xs text-muted-foreground truncate">{order.laptop_refName}</p>
          )}
        </div>
        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border shrink-0 ${status.color}`}>
          {status.icon}
          {status.label}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {order.fields.menge != null && (
          <span>Menge: <span className="text-foreground font-medium">{order.fields.menge}</span></span>
        )}
        {order.fields.bestelldatum && (
          <span>{order.fields.bestelldatum}</span>
        )}
        {order.fields.zahlungsart && (
          <span className="bg-muted rounded px-1.5 py-0.5 text-foreground">{order.fields.zahlungsart.label}</span>
        )}
      </div>

      <div className="flex gap-1.5 justify-end">
        <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={onEdit}>
          <IconPencil size={13} />
        </Button>
        <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
          <IconTrash size={13} />
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────── Skeleton & Error ─────────────────── */

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-3">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
          </div>
        </div>
        <div className="lg:col-span-2 space-y-3">
          <Skeleton className="h-8 w-40" />
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte lade die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktiere den Support.</p>}
    </div>
  );
}
