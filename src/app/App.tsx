import { useEffect, useState } from 'react';
import { Route, Routes, useLocation, Navigate } from 'react-router-dom';

import Loader from '../components/common/Loader';
import PageTitle from '../components/ui/PageTitle';
import ProtectedRoute from '../features/auth/components/ProtectedRoute';
import Chart from '../pages/Chart';
import Profile from '../pages/Profile';
import Settings from '../pages/Settings';
import FormElements from '../pages/Form/FormElements';
import FormLayout from '../pages/Form/FormLayout';
import DashboardCustomizer from '../pages/DashboardCustomizer';
import SignIn from '../features/auth/components/SignIn';
import SignUp from '../features/auth/components/SignUp';
import DefaultLayout from '../components/layout/DefaultLayout';
import { useBLE } from '../hooks/useBLE';
import { useAuth } from '../features/auth/hooks/useAuth';

function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const [authChecked, setAuthChecked] = useState(false);
  const { pathname } = useLocation();
  const bleHook = useBLE({ bufferSize: 32 });
  const { user } = useAuth();
  
  // Check auth on mount and when user changes
  useEffect(() => {
    // Check localStorage directly to see if user is authenticated
    const storedUser = localStorage.getItem('auth.user');
    setAuthChecked(true);
  }, [user]);
  
  const isAuthenticated = !!user;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  return loading || !authChecked ? (
    <Loader />
  ) : (
    <Routes>
      {/* Public routes */}
      <Route
        path="/auth/signin"
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <>
              <PageTitle title="Sign In | AudioVisor" />
              <SignIn />
            </>
          )
        }
      />
      <Route
        path="/auth/signup"
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <>
              <PageTitle title="Sign Up | AudioVisor" />
              <SignUp />
            </>
          )
        }
      />

      {/* Protected routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DefaultLayout
              bleConnected={bleHook.connected}
              onBleConnect={() => bleHook.connect().catch(() => {})}
              onBleDisconnect={() => bleHook.disconnect().catch(() => {})}
            >
              <Routes>
                <Route
                  index
                  element={
                    <>
                      <PageTitle title="AudioVisor — Live" />
                      <Chart bleHook={bleHook} />
                    </>
                  }
                />
                <Route
                  path="profile"
                  element={
                    <>
                      <PageTitle title="Profile | AudioVisor" />
                      <Profile />
                    </>
                  }
                />
                <Route
                  path="forms/form-elements"
                  element={
                    <>
                      <PageTitle title="Form Elements | AudioVisor" />
                      <FormElements />
                    </>
                  }
                />
                <Route
                  path="forms/form-layout"
                  element={
                    <>
                      <PageTitle title="Form Layout | AudioVisor" />
                      <FormLayout />
                    </>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <>
                      <PageTitle title="Settings | AudioVisor" />
                      <Settings />
                    </>
                  }
                />
                <Route
                  path="customize"
                  element={
                    <>
                      <PageTitle title="Customize Dashboard | AudioVisor" />
                      <DashboardCustomizer />
                    </>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </DefaultLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
