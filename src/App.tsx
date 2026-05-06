import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import LaptopKatalogPage from '@/pages/LaptopKatalogPage';
import BestellungenPage from '@/pages/BestellungenPage';
import PublicFormLaptopKatalog from '@/pages/public/PublicForm_LaptopKatalog';
import PublicFormBestellungen from '@/pages/public/PublicForm_Bestellungen';
// <public:imports>
// </public:imports>
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/69fb75ec0e449f5ac74b7870" element={<PublicFormLaptopKatalog />} />
              <Route path="public/69fb75f02b467025344bf46c" element={<PublicFormBestellungen />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="laptop-katalog" element={<LaptopKatalogPage />} />
                <Route path="bestellungen" element={<BestellungenPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
