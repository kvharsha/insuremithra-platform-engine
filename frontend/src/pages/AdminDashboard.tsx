import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import AdminClaims from './AdminClaims';
import DowntimeMonitor from './DowntimeMonitor';
import {
  People,
  AdminPanelSettings,
  VerifiedUser,
  Block,
  Refresh,
  Edit,
  Visibility,
  TrendingUp,
  Assessment,
} from '@mui/icons-material';
import { Backup as BackupIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { profileAPI } from '../services/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLogin?: string;
  createdAt: string;
}

interface SystemStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    admins: number;
    regularUsers: number;
    verified: number;
    unverified: number;
  };
  activity: {
    recentRegistrations: {
      count: number;
      period: string;
    };
    recentLogins: {
      count: number;
      period: string;
    };
  };
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [tabValue, setTabValue] = useState(0);

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersData, statsData] = await Promise.all([
        profileAPI.getAllUsers(),
        profileAPI.getSystemStats(),
      ]);
      setUsers(usersData.users);
      setStats(statsData.statistics);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewUser = async (userId: string) => {
    try {
      const userData = await profileAPI.getUserById(userId);
      setSelectedUser(userData.user);
      setDialogOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch user details');
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser) return;

    try {
      await profileAPI.updateUserRole(selectedUser.id, newRole);
      setRoleDialogOpen(false);
      setSelectedUser(null);
      setNewRole('');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await profileAPI.toggleUserStatus(userId, !currentStatus);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update status');
    }
  };

  const openRoleDialog = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setRoleDialogOpen(true);
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="xl" sx={{ mt: 3 }}>
        {/* Page actions (Refresh/User View). Logout handled by header */}
        <Box display="flex" justifyContent="flex-end" mb={3}>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<Refresh />}
            onClick={fetchData}
            sx={{ mr: 2, color: 'white', borderColor: 'white' }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2 }}
          >
            User View
          </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<BackupIcon />}
              onClick={() => navigate('/admin/backups')}
              sx={{ mr: 2 }}
            >
              Backups
            </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Statistics Cards */}
        {stats && (
          <Box sx={{ mb: 4, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <People color="primary" sx={{ mr: 1 }} />
                    <Typography color="textSecondary" variant="body2">
                      Total Users
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.users.total}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {stats.users.active} active, {stats.users.inactive} inactive
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <AdminPanelSettings color="secondary" sx={{ mr: 1 }} />
                    <Typography color="textSecondary" variant="body2">
                      Admin Users
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.users.admins}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {stats.users.regularUsers} regular users
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <VerifiedUser color="success" sx={{ mr: 1 }} />
                    <Typography color="textSecondary" variant="body2">
                      Verified
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.users.verified}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {stats.users.unverified} unverified
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <TrendingUp color="info" sx={{ mr: 1 }} />
                    <Typography color="textSecondary" variant="body2">
                      New (7 days)
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.activity.recentRegistrations.count}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {stats.activity.recentLogins.count} logins (24h)
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        )}        {/* Tabs */}
        <Card>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="User Management" />
            <Tab label="Activity Monitor" />
            <Tab label="Claims" />
            <Tab label="Downtime Monitor" />
          </Tabs>

          {/* User Management Tab */}
          {tabValue === 0 && (
            <CardContent>
              <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Verified</TableCell>
                      <TableCell>Last Login</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((usr) => (
                      <TableRow key={usr.id}>
                        <TableCell>
                          {usr.firstName} {usr.lastName}
                        </TableCell>
                        <TableCell>{usr.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={usr.role}
                            color={usr.role === 'admin' ? 'secondary' : 'primary'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={usr.isActive ? 'Active' : 'Inactive'}
                            color={usr.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {usr.isEmailVerified ? (
                            <VerifiedUser color="success" fontSize="small" />
                          ) : (
                            <Block color="disabled" fontSize="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          {usr.lastLogin
                            ? new Date(usr.lastLogin).toLocaleDateString()
                            : 'Never'}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleViewUser(usr.id)}
                            color="primary"
                          >
                            <Visibility />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => openRoleDialog(usr)}
                            color="secondary"
                            disabled={usr.id === user?.id}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleStatus(usr.id, usr.isActive)}
                            color={usr.isActive ? 'error' : 'success'}
                            disabled={usr.id === user?.id}
                          >
                            <Block />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          )}

          {/* Activity Monitor Tab */}
          {tabValue === 1 && (
            <CardContent>
              <Box textAlign="center" py={8}>
                <Assessment sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  Activity Monitoring
                </Typography>
                <Typography color="textSecondary">
                  Real-time activity logs and user behavior analytics will be available here.
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block" mt={2}>
                  This feature will be implemented in the monitoring module.
                </Typography>
              </Box>
            </CardContent>
          )}

          {tabValue === 2 && (
            <CardContent>
              <AdminClaims />
            </CardContent>
          )}

          {tabValue === 3 && (
            <CardContent>
              <DowntimeMonitor />
            </CardContent>
          )}
        </Card>
      </Container>

      {/* View User Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>User Details</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>Name:</strong> {selectedUser.firstName} {selectedUser.lastName}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Email:</strong> {selectedUser.email}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Role:</strong>{' '}
                <Chip
                  label={selectedUser.role}
                  color={selectedUser.role === 'admin' ? 'secondary' : 'primary'}
                  size="small"
                />
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Status:</strong>{' '}
                <Chip
                  label={selectedUser.isActive ? 'Active' : 'Inactive'}
                  color={selectedUser.isActive ? 'success' : 'default'}
                  size="small"
                />
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Email Verified:</strong> {selectedUser.isEmailVerified ? 'Yes' : 'No'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Created:</strong>{' '}
                {new Date(selectedUser.createdAt).toLocaleString()}
              </Typography>
              {selectedUser.lastLogin && (
                <Typography variant="body2" gutterBottom>
                  <strong>Last Login:</strong>{' '}
                  {new Date(selectedUser.lastLogin).toLocaleString()}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Change User Role</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box pt={1}>
              <Typography variant="body2" gutterBottom>
                Changing role for: <strong>{selectedUser.email}</strong>
              </Typography>
              <TextField
                select
                fullWidth
                label="New Role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                margin="normal"
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </TextField>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleChangeRole} variant="contained" color="primary">
            Update Role
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;
