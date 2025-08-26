import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Components
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import DashboardOverview from './components/Dashboard/DashboardOverview';
import LeadsEnhanced from './components/Leads/LeadsEnhanced';
import ScrapingConfigs from './components/Scraping/ScrapingConfigs';
import ExportSchedules from './components/Export/ExportSchedules';
import EnhancedExportInterface from './components/Export/EnhancedExportInterface';
import CRMIntegrations from './components/CRM/CRMIntegrations';
import CRMIntegrationInterface from './components/CRM/CRMIntegrationInterface';
import Settings from './components/Settings/Settings';
import SettingsDashboard from './components/Settings/SettingsDashboard';
import AnalyticsDashboard from './components/Analytics/AnalyticsDashboard';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return user ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#22c55e',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
            
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } />
              <Route path="/register" element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              } />
              
              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="dashboard/overview" element={<DashboardOverview />} />
                <Route path="leads" element={<LeadsEnhanced />} />
                <Route path="scraping" element={<ScrapingConfigs />} />
                <Route path="export" element={<ExportSchedules />} />
                <Route path="export/enhanced" element={<EnhancedExportInterface />} />
                <Route path="crm" element={<CRMIntegrations />} />
                <Route path="crm/integrations" element={<CRMIntegrationInterface />} />
                <Route path="settings" element={<Settings />} />
                <Route path="settings/dashboard" element={<SettingsDashboard />} />
                <Route path="analytics" element={<AnalyticsDashboard />} />
              </Route>
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;


