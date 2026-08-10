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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import DownloadIcon from '@mui/icons-material/Download';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AddIcon from '@mui/icons-material/Add';
import { purchaseAPI, policyAPI } from '../services/api';

interface Purchase {
  _id: string;
  policyId: {
    _id: string;
    name: string;
    type: string;
    insurer: string;
    premium: number;
    model?: string;
    coverage?: any;
  };
  userId: string;
  policyNumber: string;
  status: string;
  paymentMethod: string;
  transactionId: string;
  amount: number;
  purchaseDate: string;
  startDate: string;
  endDate: string;
  expiryDate?: string;
  renewalStatus?: string;
  createdAt: string;
}

const MyPurchases: React.FC = () => {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testPolicyId, setTestPolicyId] = useState('');
  const [testDaysUntilExpiry, setTestDaysUntilExpiry] = useState(5);
  const [policies, setPolicies] = useState<any[]>([]);
  const [creatingTest, setCreatingTest] = useState(false);

  useEffect(() => {
    fetchPurchases();
    fetchPolicies();
  }, []);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const response = await purchaseAPI.getUserPurchases();
      console.log('Purchases response:', response); // Debug
      if (response.success) {
        console.log('Purchases data:', response.data); // Debug
        setPurchases(response.data);
      } else {
        setError('Failed to load your purchases');
      }
    } catch (err: any) {
      console.error('Error fetching purchases:', err);
      setError(err.response?.data?.message || 'Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  const fetchPolicies = async () => {
    try {
      const response = await policyAPI.searchPolicies({});
      if (response.success) {
        setPolicies(response.data);
      }
    } catch (err: any) {
      console.error('Error fetching policies:', err);
    }
  };

  const handleCreateTestPurchase = async () => {
    if (!testPolicyId) {
      setError('Please select a policy');
      return;
    }

    try {
      setCreatingTest(true);
      setError(null);
      const response = await purchaseAPI.createTestPurchase(testPolicyId, testDaysUntilExpiry);
      if (response.success) {
        setShowTestDialog(false);
        setTestPolicyId('');
        setTestDaysUntilExpiry(5);
        fetchPurchases(); // Refresh the list
        alert(`Test purchase created! Expires in ${testDaysUntilExpiry} days.`);
      }
    } catch (err: any) {
      console.error('Error creating test purchase:', err);
      setError(err.response?.data?.message || 'Failed to create test purchase');
    } finally {
      setCreatingTest(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon sx={{ fontSize: 20 }} />;
      case 'pending':
        return <PendingIcon sx={{ fontSize: 20 }} />;
      case 'failed':
        return <CancelIcon sx={{ fontSize: 20 }} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'success':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const calculateDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isEligibleForRenewal = (purchase: Purchase) => {
    if (!purchase.expiryDate || purchase.renewalStatus === 'renewed') return false;
    const daysLeft = calculateDaysUntilExpiry(purchase.expiryDate);
    return daysLeft >= 0 && daysLeft <= 7;
  };

  const handleDownloadReceipt = (purchaseId: string) => {
    // Assuming there's a download endpoint
    window.open(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/purchase/${purchaseId}/download`, '_blank');
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
            My Purchased Policies
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined" 
              color="secondary"
              startIcon={<AddIcon />}
              onClick={() => setShowTestDialog(true)}
            >
              Create Test Purchase (Renewal Testing)
            </Button>
            <Button variant="outlined" onClick={() => navigate('/policies')}>
              Browse More Policies
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {purchases.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <ReceiptIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Purchases Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              You haven't purchased any policies yet. Browse our policies to get started!
            </Typography>
            <Button variant="contained" onClick={() => navigate('/policies')}>
              Browse Policies
            </Button>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {purchases.map((purchase) => (
              <Card key={purchase._id} sx={{ '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.3s' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flex: 1, minWidth: '250px' }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {purchase.policyId.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {purchase.policyId.insurer} • {purchase.policyId.type}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        icon={getStatusIcon(purchase.status) || undefined}
                        label={purchase.status.toUpperCase()}
                        color={getStatusColor(purchase.status)}
                        size="small"
                      />
                      {isEligibleForRenewal(purchase) && (
                        <Chip
                          label="Renewal Available"
                          color="warning"
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      )}
                      {purchase.renewalStatus === 'renewed' && (
                        <Chip
                          label="Renewed"
                          color="success"
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                    gap: 2,
                    mb: 2 
                  }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Policy Number
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {purchase.policyNumber}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Transaction ID
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {purchase.transactionId}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Amount Paid
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {formatCurrency(purchase.amount)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Purchase Date
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(purchase.purchaseDate)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Coverage Period
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                        {formatDate(purchase.startDate)} - {formatDate(purchase.endDate)}
                      </Typography>
                    </Box>
                    {purchase.expiryDate && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Expiry Date
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 600,
                            color: isEligibleForRenewal(purchase) ? 'warning.main' : 'text.primary'
                          }}
                        >
                          {formatDate(purchase.expiryDate)}
                          {isEligibleForRenewal(purchase) && (
                            <Typography variant="caption" display="block" color="warning.main">
                              ({calculateDaysUntilExpiry(purchase.expiryDate)} days left)
                            </Typography>
                          )}
                        </Typography>
                      </Box>
                    )}
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Payment Method
                      </Typography>
                      <Typography variant="body2">
                        {purchase.paymentMethod}
                      </Typography>
                    </Box>
                  </Box>

                  {purchase.policyId.model && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Model: {purchase.policyId.model}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/policies/${purchase.policyId._id}`)}
                    >
                      View Policy Details
                    </Button>
                    
                    {purchase.status === 'success' && (
                      <>
                        {isEligibleForRenewal(purchase) && (
                          <Button
                            variant="contained"
                            size="small"
                            color="warning"
                            onClick={() => {
                              console.log('Navigating to renewal with purchaseId:', purchase._id);
                              navigate(`/renewals/${purchase._id}`);
                            }}
                            sx={{ fontWeight: 600 }}
                          >
                            Renew Policy
                          </Button>
                        )}
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={() => handleDownloadReceipt(purchase._id)}
                        >
                          Download Receipt
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="secondary"
                          onClick={() => navigate('/claims/submit')}
                        >
                          File a Claim
                        </Button>
                      </>
                    )}
                    
                    {purchase.status === 'pending' && (
                      <Alert severity="info" sx={{ mt: 1, width: '100%' }}>
                        Payment is being processed
                      </Alert>
                    )}
                    
                    {purchase.status === 'failed' && (
                      <Alert severity="error" sx={{ mt: 1, width: '100%' }}>
                        Payment failed. Please try again.
                      </Alert>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Test Purchase Dialog */}
        <Dialog open={showTestDialog} onClose={() => setShowTestDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create Test Purchase for Renewal Testing</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Alert severity="info">
                This creates a test purchase with a custom expiry date for testing the renewal feature.
                The purchase will be marked as "success" immediately.
              </Alert>

              <FormControl fullWidth>
                <InputLabel>Select Policy</InputLabel>
                <Select
                  value={testPolicyId}
                  onChange={(e) => setTestPolicyId(e.target.value)}
                  label="Select Policy"
                >
                  {policies.map((policy) => (
                    <MenuItem key={policy._id} value={policy._id}>
                      {policy.name} - {policy.type} (₹{policy.premium})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                type="number"
                label="Days Until Expiry"
                value={testDaysUntilExpiry}
                onChange={(e) => setTestDaysUntilExpiry(parseInt(e.target.value) || 5)}
                helperText="Set to 5 or less to make it eligible for renewal (7-day window)"
                inputProps={{ min: 1, max: 365 }}
              />

              {error && (
                <Alert severity="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowTestDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateTestPurchase} 
              variant="contained"
              disabled={creatingTest || !testPolicyId}
            >
              {creatingTest ? 'Creating...' : 'Create Test Purchase'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default MyPurchases;
