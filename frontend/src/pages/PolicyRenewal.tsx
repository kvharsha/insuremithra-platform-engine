import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccessTime as AccessTimeIcon,
  Payment as PaymentIcon,
  CalendarToday as CalendarIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { renewalAPI } from '../services/api';

const PolicyRenewal: React.FC = () => {
  const { purchaseId } = useParams<{ purchaseId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [processing, setProcessing] = useState(false);
  // renewalId state removed because it's not used in the UI
  const [renewalStatus, setRenewalStatus] = useState<any>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showFailureDialog, setShowFailureDialog] = useState(false);

  const checkEligibility = useCallback(async () => {
    if (!purchaseId) return;

    try {
      setLoading(true);
      setError(null);
      console.log('Checking eligibility for purchaseId:', purchaseId); // Debug log
      const response = await renewalAPI.checkEligibility(purchaseId);
      console.log('Eligibility response:', response); // Debug log
      setEligibility(response);
    } catch (err: any) {
      console.error('Eligibility error:', err); // Debug log
      console.error('Error response data:', err.response?.data); // Debug log
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to check renewal eligibility';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [purchaseId]);

  useEffect(() => {
    checkEligibility();
  }, [checkEligibility]);

  const handleRenew = async () => {
    if (!purchaseId) return;

    try {
      setProcessing(true);
      setError(null);
      const response = await renewalAPI.initiateRenewal(purchaseId, paymentMethod);
      // renewalId available in response if needed but not stored in UI

      // Poll for renewal status
      pollRenewalStatus(response.renewalId);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initiate renewal');
      setProcessing(false);
    }
  };

  const pollRenewalStatus = async (id: string) => {
    let attempts = 0;
    const maxAttempts = 10;
    const interval = 1000; // 1 second

    const poll = setInterval(async () => {
      try {
        attempts++;
        const status = await renewalAPI.getRenewalStatus(id);
        setRenewalStatus(status.renewal);

        if (status.renewal.status === 'success') {
          clearInterval(poll);
          setProcessing(false);
          setShowSuccessDialog(true);
        } else if (status.renewal.status === 'failed') {
          clearInterval(poll);
          setProcessing(false);
          setShowFailureDialog(true);
        } else if (attempts >= maxAttempts) {
          clearInterval(poll);
          setProcessing(false);
          setError('Renewal is taking longer than expected. Please check your renewal history.');
        }
      } catch (err: any) {
        clearInterval(poll);
        setProcessing(false);
        setError('Failed to get renewal status');
      }
    }, interval);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
    }).format(amount);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error && !eligibility) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/purchases')}>
          Back to My Purchases
        </Button>
      </Box>
    );
  }

  if (!eligibility) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load renewal information. Purchase not found.
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/purchases')}>
          Back to My Purchases
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Policy Renewal
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Policy Information Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                {eligibility.policyName}
              </Typography>
              <Chip
                label={eligibility.policyType}
                color="primary"
                size="small"
                sx={{ mr: 1 }}
              />
            </Box>
            <Chip
              icon={eligibility.eligible ? <CheckCircleIcon /> : <InfoIcon />}
              label={eligibility.eligible ? 'Eligible for Renewal' : 'Not Yet Eligible'}
              color={eligibility.eligible ? 'success' : 'default'}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Current Expiry Date
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <CalendarIcon color="action" fontSize="small" />
                <Typography variant="body1" fontWeight={500}>
                  {formatDate(eligibility.expiryDate)}
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Days Until Expiry
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <AccessTimeIcon color="action" fontSize="small" />
                <Typography
                  variant="body1"
                  fontWeight={500}
                  color={eligibility.daysLeft <= 7 ? 'error' : 'text.primary'}
                >
                  {eligibility.daysLeft} {eligibility.daysLeft === 1 ? 'day' : 'days'}
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Renewal Amount
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <PaymentIcon color="action" fontSize="small" />
                <Typography variant="h6" color="primary" fontWeight={600}>
                  {formatCurrency(eligibility.renewalAmount, eligibility.currency)}
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Renewal Window
              </Typography>
              <Typography variant="body1">
                {eligibility.renewalWindowDays} days before expiry
              </Typography>
            </Box>
          </Box>

          {!eligibility.eligible && (
            <Alert severity="info" sx={{ mt: 3 }}>
              {eligibility.message}. Come back when you're within the renewal window.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Payment Section */}
      {eligibility.eligible && !processing && !renewalStatus && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Payment Method
            </Typography>

            <FormControl component="fieldset" sx={{ mt: 2, width: '100%' }}>
              <FormLabel component="legend">Select your payment method</FormLabel>
              <RadioGroup
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                sx={{ mt: 2 }}
              >
                <Box display="flex" flexDirection="column" gap={1}>
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: paymentMethod === 'card' ? 'primary.main' : 'grey.300',
                      borderRadius: 2,
                      p: 2,
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                    }}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <Box display="flex" alignItems="center">
                      <Radio value="card" />
                      <Box ml={1}>
                        <Typography variant="body1" fontWeight={500}>
                          Credit/Debit Card
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Pay securely with your card
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: paymentMethod === 'upi' ? 'primary.main' : 'grey.300',
                      borderRadius: 2,
                      p: 2,
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                    }}
                    onClick={() => setPaymentMethod('upi')}
                  >
                    <Box display="flex" alignItems="center">
                      <Radio value="upi" />
                      <Box ml={1}>
                        <Typography variant="body1" fontWeight={500}>
                          UPI
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Pay via Google Pay, PhonePe, etc.
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: paymentMethod === 'netbanking' ? 'primary.main' : 'grey.300',
                      borderRadius: 2,
                      p: 2,
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                    }}
                    onClick={() => setPaymentMethod('netbanking')}
                  >
                    <Box display="flex" alignItems="center">
                      <Radio value="netbanking" />
                      <Box ml={1}>
                        <Typography variant="body1" fontWeight={500}>
                          Net Banking
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Pay through your bank account
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: paymentMethod === 'wallet' ? 'primary.main' : 'grey.300',
                      borderRadius: 2,
                      p: 2,
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                    }}
                    onClick={() => setPaymentMethod('wallet')}
                  >
                    <Box display="flex" alignItems="center">
                      <Radio value="wallet" />
                      <Box ml={1}>
                        <Typography variant="body1" fontWeight={500}>
                          Wallet
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Paytm, Amazon Pay, etc.
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </RadioGroup>
            </FormControl>

            <Box mt={4} display="flex" gap={2}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleRenew}
                sx={{
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                Renew Now - {formatCurrency(eligibility.renewalAmount, eligibility.currency)}
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/purchases')}
              >
                Cancel
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Processing State */}
      {processing && (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <CircularProgress size={60} sx={{ mb: 3 }} />
              <Typography variant="h6" gutterBottom>
                Processing Your Renewal...
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Please wait while we process your payment. This may take a few moments.
              </Typography>
              <LinearProgress />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onClose={() => setShowSuccessDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
            <Typography variant="h5" fontWeight={600}>
              Renewal Successful!
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 3 }}>
            Your policy has been successfully renewed. Your coverage continues without interruption.
          </Alert>

          {renewalStatus && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Transaction ID
              </Typography>
              <Typography variant="body1" fontWeight={500} mb={2}>
                {renewalStatus.transactionId}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Amount Paid
              </Typography>
              <Typography variant="body1" fontWeight={500} mb={2}>
                {formatCurrency(renewalStatus.amount, renewalStatus.currency)}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                New Expiry Date
              </Typography>
              <Typography variant="body1" fontWeight={500} color="success.main">
                {renewalStatus.newExpiryDate && formatDate(renewalStatus.newExpiryDate)}
              </Typography>
            </Box>
          )}

          <Alert severity="info" sx={{ mt: 3 }}>
            A confirmation email has been sent to your registered email address with the renewal details.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/purchases')} variant="contained" fullWidth>
            View My Policies
          </Button>
        </DialogActions>
      </Dialog>

      {/* Failure Dialog */}
      <Dialog open={showFailureDialog} onClose={() => setShowFailureDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <CancelIcon color="error" sx={{ fontSize: 40 }} />
            <Typography variant="h5" fontWeight={600}>
              Renewal Failed
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 3 }}>
            {renewalStatus?.errorMessage || 'We were unable to process your renewal payment.'}
          </Alert>

          {renewalStatus && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Transaction ID
              </Typography>
              <Typography variant="body1" fontWeight={500} mb={2}>
                {renewalStatus.transactionId}
              </Typography>
            </Box>
          )}

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            What to do next:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mt: 1 }}>
            <li><Typography variant="body2">Check your payment method details</Typography></li>
            <li><Typography variant="body2">Ensure you have sufficient funds</Typography></li>
            <li><Typography variant="body2">Try using a different payment method</Typography></li>
            <li><Typography variant="body2">Contact your bank if the issue persists</Typography></li>
          </Box>

          <Alert severity="warning" sx={{ mt: 3 }}>
            Your policy will expire on its original expiry date. Please complete the renewal before expiry to avoid any lapse in coverage.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowFailureDialog(false);
            setRenewalStatus(null);
            checkEligibility();
          }} variant="contained" fullWidth>
            Try Again
          </Button>
          <Button onClick={() => navigate('/purchases')} variant="outlined">
            Back to Policies
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PolicyRenewal;
