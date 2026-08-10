import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Card, CardContent, Chip, Button, CircularProgress, List, ListItem, ListItemText, Divider } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { claimAPI } from '../services/api';

const statusColor = (status: string) => {
  const s = status?.toLowerCase();
  switch (s) {
    case 'approved': return 'success';
    case 'rejected': return 'error';
    case 'under review': return 'warning';
    case 'submitted': return 'info';
    default: return 'default';
  }
};

const ClaimStatus: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const fetchClaim = async () => {
    try {
      setLoading(true);
      const response = await claimAPI.getClaimById(id as string);
      if (response.success) {
        setClaim(response.data);
      } else {
        setError('Failed to load claim');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load claim');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaim();
    // poll every 20 seconds
    intervalRef.current = window.setInterval(() => {
      fetchClaim();
    }, 20000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return (<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>);

  if (!claim) return (<Container><Typography variant="h6">{error || 'Claim not found'}</Typography></Container>);

  return (
    <Box sx={{ minHeight: '100vh', py: 4, bgcolor: '#f5f5f5' }}>
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Claim Details</Typography>
          <Button onClick={() => navigate('/claims/my')}>Back to My Claims</Button>
        </Box>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="h6">{claim.policyId?.name || 'Policy'}</Typography>
                <Typography variant="body2" color="text.secondary">Claim ID: <strong>{claim.claimId}</strong></Typography>
                <Typography variant="body2" color="text.secondary">Submitted: {new Date(claim.submittedAt).toLocaleString()}</Typography>
              </Box>
              <Chip label={claim.status} color={statusColor(claim.status)} />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1">History</Typography>
            <List>
              {(claim.history || []).slice().reverse().map((h: any, idx: number) => (
                <ListItem key={idx} alignItems="flex-start">
                  <ListItemText
                    primary={`${h.status} • ${new Date(h.updatedAt).toLocaleString()}`}
                    secondary={h.note || ''}
                  />
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1">Documents</Typography>
            {claim.documents && claim.documents.length > 0 ? (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {claim.documents.map((d: any, i: number) => (
                  <Button key={i} variant="outlined" size="small" startIcon={<AttachFileIcon />} href={`/api/claims/${claim.claimId}/documents/${encodeURIComponent(d.filename)}`}>
                    {d.originalName}
                  </Button>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">No documents attached.</Typography>
            )}

          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default ClaimStatus;
