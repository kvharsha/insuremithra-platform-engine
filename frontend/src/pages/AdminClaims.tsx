import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
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
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import { claimAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

const STATUS_OPTIONS = ['Submitted', 'Under Review', 'Approved', 'Rejected', 'Closed'];

const AdminClaims: React.FC = () => {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const navigate = useNavigate();

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const res = await claimAPI.adminGetClaims({ page: 1, limit: 100 });
      if (res.success) {
        setClaims(res.data || []);
      } else {
        setError('Failed to load claims');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClaims(); }, []);

  const openChangeDialog = (claim: any) => {
    setSelectedClaim(claim);
    setNewStatus(claim.status || 'Submitted');
    setNote('');
    setDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedClaim) return;
    try {
      setUpdating(true);
      const res = await claimAPI.adminUpdateStatus(selectedClaim.claimId, newStatus, note);
      if (res.success) {
        setDialogOpen(false);
        fetchClaims();
      } else {
        setError(res.message || 'Failed to update status');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (<Box display="flex" justifyContent="center" alignItems="center" minHeight="240px"><CircularProgress/></Box>);

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Claims Management</Typography>
          <Button variant="outlined" onClick={() => fetchClaims()}>Refresh</Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

        <TableContainer component={Paper} sx={{ maxHeight: 520 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Claim ID</TableCell>
                <TableCell>Policy</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {claims.map((c) => (
                <TableRow key={c.claimId} hover>
                  <TableCell>{c.claimId}</TableCell>
                  <TableCell>{c.policy?.name || '—'}</TableCell>
                  <TableCell>{c.user?.email || '—'}</TableCell>
                  <TableCell>
                    <Chip label={c.status} size="small" color={c.status === 'Approved' ? 'success' : c.status === 'Rejected' ? 'error' : 'default'} />
                  </TableCell>
                  <TableCell>{c.submittedAt ? new Date(c.submittedAt).toLocaleString() : '—'}</TableCell>
                  <TableCell>{c.updatedAt ? new Date(c.updatedAt).toLocaleString() : '—'}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => navigate(`/claims/${c.claimId}`)} title="View details"><VisibilityIcon/></IconButton>
                    <IconButton size="small" onClick={() => openChangeDialog(c)} title="Change status"><EditIcon/></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
          <DialogTitle>Change Claim Status</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1, minWidth: 360 }}>
              <TextField select label="Status" fullWidth value={newStatus} onChange={(e) => setNewStatus(e.target.value)} margin="normal">
                {STATUS_OPTIONS.map(s => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
              </TextField>
              <TextField label="Note (optional)" fullWidth value={note} onChange={(e) => setNote(e.target.value)} margin="normal" multiline rows={3} />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleUpdateStatus} disabled={updating}>{updating ? 'Updating...' : 'Update'}</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AdminClaims;
