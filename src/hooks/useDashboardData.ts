import { useState, useEffect, useMemo, useCallback } from 'react';
import type { LaptopKatalog, Bestellungen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [laptopKatalog, setLaptopKatalog] = useState<LaptopKatalog[]>([]);
  const [bestellungen, setBestellungen] = useState<Bestellungen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [laptopKatalogData, bestellungenData] = await Promise.all([
        LivingAppsService.getLaptopKatalog(),
        LivingAppsService.getBestellungen(),
      ]);
      setLaptopKatalog(laptopKatalogData);
      setBestellungen(bestellungenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [laptopKatalogData, bestellungenData] = await Promise.all([
          LivingAppsService.getLaptopKatalog(),
          LivingAppsService.getBestellungen(),
        ]);
        setLaptopKatalog(laptopKatalogData);
        setBestellungen(bestellungenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const laptopKatalogMap = useMemo(() => {
    const m = new Map<string, LaptopKatalog>();
    laptopKatalog.forEach(r => m.set(r.record_id, r));
    return m;
  }, [laptopKatalog]);

  return { laptopKatalog, setLaptopKatalog, bestellungen, setBestellungen, loading, error, fetchAll, laptopKatalogMap };
}