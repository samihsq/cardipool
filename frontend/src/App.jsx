import { Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import AddCarpool from './pages/AddCarpool';
import Info from './pages/Info';
import Help from './pages/Help';
import MyTrips from './pages/MyTrips';
import DevTest from './pages/DevTest';
import ProtectedRoute from './components/ProtectedRoute';
import NotificationBar from './components/NotificationBar';
import DevUserSwitcher from './components/DevUserSwitcher';

// A new layout component to conditionally render the notification bar
const MainLayout = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return (
    <>
      {isAuthenticated && <NotificationBar />}
      {children}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <DevUserSwitcher />
      <MainLayout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/add" 
            element={
              <ProtectedRoute>
                <AddCarpool />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/my-trips" 
            element={
              <ProtectedRoute>
                <MyTrips />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/info" 
            element={
              <ProtectedRoute>
                <Info />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/help" 
            element={
              <ProtectedRoute>
                <Help />
              </ProtectedRoute>
            } 
          />
          {/* Development-only route */}
          {process.env.NODE_ENV === 'development' && (
            <Route path="/dev-test" element={<DevTest />} />
          )}
        </Routes>
      </MainLayout>
    </AuthProvider>
  );
}

export default App; 