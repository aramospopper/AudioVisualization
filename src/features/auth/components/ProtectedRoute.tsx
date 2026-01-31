import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Loader from '../../../components/common/Loader';

interface ProtectedRouteProps {
  children: JSX.Element;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();

  // If still initializing/loading auth state, show loader
  if (isLoading) {
    return <Loader />;
  }

  // If not authenticated, redirect to signin
  if (!isAuthenticated) {
    return <Navigate to="/auth/signin" replace />;
  }

  return children;
};

export default ProtectedRoute;
