import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CircularProgress, Box } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import './App.css';

// Lazy load heavy pages for better initial load performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminBackups = lazy(() => import('./pages/AdminBackups'));
const PolicySearch = lazy(() => import('./pages/PolicySearch'));
const Policies = lazy(() => import('./pages/Policies'));
const ComparePolicies = lazy(() => import('./pages/ComparePolicies'));
const PolicyPurchase = lazy(() => import('./pages/PolicyPurchase'));
const PolicyDetails = lazy(() => import('./pages/PolicyDetails'));
const MyPurchases = lazy(() => import('./pages/MyPurchases'));
const ClaimSubmit = lazy(() => import('./pages/ClaimSubmit'));
const MyClaims = lazy(() => import('./pages/MyClaims'));
const ClaimStatus = lazy(() => import('./pages/ClaimStatus'));
const PolicyRenewal = lazy(() => import('./pages/PolicyRenewal'));

// Loading fallback component
const LoadingFallback = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="80vh"
  >
    <CircularProgress size={60} />
  </Box>
);

// Create a beautiful, professional theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      color: '#1976d2',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      color: '#333333',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 500,
      color: '#333333',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '10px 24px',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <div className="App">
            <AppHeader />
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                
                {/* Protected routes */}
                <Route path="/login" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/policy-search" element={
                  <ProtectedRoute>
                    <PolicySearch />
                  </ProtectedRoute>
                } />
                <Route path="/compare" element={
                  <ProtectedRoute>
                    <ComparePolicies />
                  </ProtectedRoute>
                } />
                <Route path="/purchase/:policyId" element={
                  <ProtectedRoute>
                    <PolicyPurchase />
                  </ProtectedRoute>
                } />
                <Route path="/my-purchases" element={
                  <ProtectedRoute>
                    <MyPurchases />
                  </ProtectedRoute>
                } />
                <Route path="/claims/submit" element={
                  <ProtectedRoute>
                    <ClaimSubmit />
                  </ProtectedRoute>
                } />
                <Route path="/claims" element={
                  <ProtectedRoute>
                    <MyClaims />
                  </ProtectedRoute>
                } />
                <Route path="/claims/:id" element={
                  <ProtectedRoute>
                    <ClaimStatus />
                  </ProtectedRoute>
                } />
                <Route path="/renewals/:purchaseId" element={
                  <ProtectedRoute>
                    <PolicyRenewal />
                  </ProtectedRoute>
                } />
                {/* New public policies browser page (supports advanced filters) */}
                <Route path="/policies" element={<Policies />} />
                <Route path="/policies/:id/details" element={<PolicyDetails />} />
                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin/backups" element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminBackups />
                  </ProtectedRoute>
                } />
                
                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

const AppHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', background: '#fff', borderBottom: '1px solid #eee', position: 'sticky', top: 0, zIndex: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#1976d2' }}>🛡️ InsureMithra</h3>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user ? (
          <>
            <button onClick={() => navigate('/policies')} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff' }}>
              Browse Policies
            </button>
            <button onClick={() => navigate('/my-purchases')} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff' }}>
              My Purchases
            </button>
            <button onClick={() => navigate('/claims')} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff' }}>
              My Claims
            </button>
            <button onClick={() => navigate('/policy-search')} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff' }}>
              Policy Search
            </button>
            <div style={{ textAlign: 'right', marginRight: 8 }}>
              <div style={{ fontSize: 14, color: '#333' }}>{user.firstName} {user.lastName}</div>
              <div style={{ fontSize: 12, color: '#666' }}>Role: {user.role}</div>
            </div>
            <div>
              <button onClick={handleMenuOpen} style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd', background: '#fff' }}>
                {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
              </button>
              {anchorEl && (
                <div style={{ position: 'absolute', right: 20, top: 56, background: '#fff', boxShadow: '0 6px 18px rgba(0,0,0,0.12)', borderRadius: 8 }}>
                  <div style={{ padding: 8 }}>
                    <div style={{ cursor: 'pointer', padding: '8px 12px' }} onClick={() => { handleMenuClose(); navigate('/profile'); }}>Profile</div>
                    {user.role === 'admin' && (
                      <div style={{ cursor: 'pointer', padding: '8px 12px' }} onClick={() => { handleMenuClose(); navigate('/admin'); }}>Admin Panel</div>
                    )}
                    <div style={{ cursor: 'pointer', padding: '8px 12px' }} onClick={() => { handleMenuClose(); logout(); navigate('/login'); }}>Logout</div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div />
        )}
      </div>
    </header>
  );
};
