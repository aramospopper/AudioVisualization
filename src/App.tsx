import { useEffect, useState } from 'react';
import { Route, Routes, useLocation, Navigate } from 'react-router-dom';

import Loader from './common/Loader';
import PageTitle from './components/PageTitle';
import Chart from './pages/Chart';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import FormElements from './pages/Form/FormElements';
import FormLayout from './pages/Form/FormLayout';
import DashboardCustomizer from './pages/DashboardCustomizer';
import DefaultLayout from './layout/DefaultLayout';

function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  return loading ? (
    <Loader />
  ) : (
    <DefaultLayout>
      <Routes>
        <Route
          index
          element={
            <>
              <PageTitle title="AudioVisor — Live" />
              <Chart />
            </>
          }
        />
        <Route
          path="/profile"
          element={
            <>
              <PageTitle title="Profile | AudioVisor" />
              <Profile />
            </>
          }
        />
        <Route
          path="/forms/form-elements"
          element={
            <>
              <PageTitle title="Form Elements | AudioVisor" />
              <FormElements />
            </>
          }
        />
        <Route
          path="/forms/form-layout"
          element={
            <>
              <PageTitle title="Form Layout | AudioVisor" />
              <FormLayout />
            </>
          }
        />
        <Route
          path="/settings"
          element={
            <>
              <PageTitle title="Settings | AudioVisor" />
              <Settings />
            </>
          }
        />
        <Route
          path="/customize"
          element={
            <>
              <PageTitle title="Customize Dashboard | AudioVisor" />
              <DashboardCustomizer />
            </>
          }
        />
        {/* catch-all -> redirect to live page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DefaultLayout>
  );
}

export default App;
