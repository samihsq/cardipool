import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, login } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    // Automatically redirect to login
    login();
    return <LoadingSpinner message="Redirecting to Stanford login..." />;
  }

  return children;
};

export default ProtectedRoute; 