import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { claimAPI } from '../services/api';

interface Claim {
  _id: string;
  claimId: string;
  policyId: {
    _id: string;
    name: string;
    type: string;
    insurer: string;
    premium: number;
  };
  reason: string;
  status: string;
  submittedAt: string;
  documents: Array<{
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
  }>;
  notes?: string;
}

const MyClaims: React.FC = () => {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const response = await claimAPI.getUserClaims();
      if (response.success) {
        setClaims(response.data);
      } else {
        setError('Failed to load your claims');
      }
    } catch (err: any) {
      console.error('Error fetching claims:', err);
      setError(err.response?.data?.message || 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'approved':
        return <CheckCircleIcon sx={{ fontSize: 20 }} />;
      case 'submitted':
      case 'pending':
        return <PendingIcon sx={{ fontSize: 20 }} />;
      case 'rejected':
      case 'denied':
        return <CancelIcon sx={{ fontSize: 20 }} />;
      case 'under review':
      case 'in progress':
        return <HourglassEmptyIcon sx={{ fontSize: 20 }} />;
      default:
        return <AssignmentIcon sx={{ fontSize: 20 }} />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'approved':
        return 'success';
      case 'submitted':
      case 'pending':
        return 'warning';
      case 'rejected':
      case 'denied':
        return 'error';
      case 'under review':
      case 'in progress':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', py: 4, bgcolor: '#f5f5f5' }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            My Claims
          </Typography>
          <Button variant="contained" onClick={() => navigate('/claims/submit')}>
            Submit New Claim
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {claims.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <AssignmentIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Claims Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              You haven't submitted any claims. If you need to file a claim, click below.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/claims/submit')}>
              Submit Your First Claim
            </Button>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {claims.map((claim) => (
              <Card key={claim._id} sx={{ '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.3s' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flex: 1, minWidth: '250px' }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {claim.policyId.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {claim.policyId.insurer} • {claim.policyId.type}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Claim ID: <strong>{claim.claimId}</strong>
                      </Typography>
                    </Box>
                    <Chip
                      icon={getStatusIcon(claim.status) || undefined}
                      label={claim.status}
                      color={getStatusColor(claim.status)}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ mb: 2, p: 2, bgcolor: '#f9f9f9', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Reason for Claim:
                    </Typography>
                    <Typography variant="body2">
                      {claim.reason}
                    </Typography>
                  </Box>

                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                    gap: 2,
                    mb: 2 
                  }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Submitted On
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatDate(claim.submittedAt)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Documents Attached
                      </Typography>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AttachFileIcon sx={{ fontSize: 16 }} />
                        {claim.documents.length} file(s)
                      </Typography>
                    </Box>
                    {claim.notes && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Notes
                        </Typography>
                        <Typography variant="body2">
                          {claim.notes}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {claim.documents.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Attached Documents:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {claim.documents.map((doc, index) => (
                          <Chip
                            key={index}
                            icon={<AttachFileIcon />}
                            label={`${doc.originalName} (${formatFileSize(doc.size)})`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/policies/${claim.policyId._id}`)}
                    >
                      View Policy
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="info"
                      onClick={() => navigate(`/claims/${claim.claimId}`)}
                    >
                      View Details
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default MyClaims;
