import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, CircularProgress, Card, CardContent, Divider, Chip } from '@mui/material';
import { policyAPI, purchaseAPI } from '../services/api';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

const PolicyPurchase: React.FC = () => {
  const { policyId } = useParams();
  const navigate = useNavigate();
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // fetch policy details via search endpoint by id
    (async () => {
      try {
        setLoading(true);
        const res = await policyAPI.searchPolicies({});
        const items = res?.data ?? res?.results ?? [];
        const p = items.find((it: any) => it._id === policyId);
        setPolicy(p || null);
      } catch (err) {
        setError('Failed to load policy');
      } finally {
        setLoading(false);
      }
    })();
  }, [policyId]);

  useEffect(() => {
    let interval: any;
    if (purchaseId) {
      interval = setInterval(async () => {
        try {
          const res = await purchaseAPI.get(purchaseId);
          if (res?.success) {
            setStatus(res.data.status);
            if (res.data.status === 'success' || res.data.status === 'failed') {
              clearInterval(interval);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [purchaseId]);

  const handleSimulatePayment = async () => {
    if (!policyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await purchaseAPI.initiate(policyId);
      if (res?.success) {
        setPurchaseId(res.data.purchaseId);
        setStatus('initiated');
      } else {
        setError(res?.message || 'Failed to initiate purchase');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to initiate purchase');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!purchaseId) return;
    try {
      const blob = await purchaseAPI.download(purchaseId);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `policy_${purchaseId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      setError('Failed to download PDF');
    }
  };

  const getStatusDisplay = () => {
    if (status === 'processing' || status === 'initiated') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body1">Processing payment (10-30 seconds)...</Typography>
        </Box>
      );
    }
    if (status === 'success') {
      return (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CheckCircleIcon color="success" />
            <Typography variant="h6" color="success.main">Payment Successful!</Typography>
          </Box>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Your policy has been purchased. You can now download your policy receipt.
          </Typography>
          <Button variant="contained" color="success" onClick={handleDownload} startIcon={<CheckCircleIcon />}>
            Download Policy Receipt (PDF)
          </Button>
        </Box>
      );
    }
    if (status === 'failed') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
          <ErrorIcon color="error" />
          <Typography variant="body1" color="error">Payment failed or timed out. Please try again.</Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box sx={{ minHeight: '100vh', py: 4, bgcolor: '#f5f5f5' }}>
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>Purchase Policy</Typography>
        
        {error && (
          <Card sx={{ mb: 3, bgcolor: '#ffebee' }}>
            <CardContent>
              <Typography color="error">{error}</Typography>
            </CardContent>
          </Card>
        )}

        {loading && !policy && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && policy && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>{policy.name}</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Chip label={policy.type} color="primary" size="small" />
                <Chip label={policy.insurer} variant="outlined" size="small" />
                {policy.model && <Chip label={policy.model} variant="outlined" size="small" />}
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Coverage</Typography>
                <Typography variant="body1">{policy.coverage}</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Tenure</Typography>
                <Typography variant="body1">{policy.tenure}</Typography>
              </Box>

              {policy.benefits && policy.benefits.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Benefits</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {policy.benefits.map((benefit: string, idx: number) => (
                      <Chip key={idx} label={benefit} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" color="text.secondary">Total Premium</Typography>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>₹{policy.premium}</Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {!loading && policy && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Payment</Typography>
              
              {!purchaseId && (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Click the button below to simulate a sandbox payment. The payment will process automatically in 10-30 seconds.
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    size="large"
                    onClick={handleSimulatePayment} 
                    disabled={!!purchaseId}
                    fullWidth
                  >
                    Simulate Payment
                  </Button>
                </Box>
              )}

              {purchaseId && getStatusDisplay()}
            </CardContent>
          </Card>
        )}

        {!policy && !loading && (
          <Card>
            <CardContent>
              <Typography variant="body1" sx={{ mb: 2 }}>No policy found. Please go back to search.</Typography>
              <Button variant="outlined" onClick={() => navigate('/policy-search')}>Back to Policy Search</Button>
            </CardContent>
          </Card>
        )}

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button variant="outlined" onClick={() => navigate(-1)}>Back</Button>
          <Button variant="text" onClick={() => navigate('/policy-search')}>Browse More Policies</Button>
        </Box>
      </Container>
    </Box>
  );
};

export default PolicyPurchase;
