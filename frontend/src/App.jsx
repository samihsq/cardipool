import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import AddCarpool from './pages/AddCarpool';
import Info from './pages/Info';
import Help from './pages/Help';
import MyTrips from './pages/MyTrips';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  return (
    <AuthProvider>
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
      </Routes>
    </AuthProvider>
  );
}

export default App; 