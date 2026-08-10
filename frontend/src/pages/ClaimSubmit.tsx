import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { purchaseAPI, claimAPI } from '../services/api';

interface Purchase {
  _id: string;
  policyId: {
    _id: string;
    name: string;
    type: string;
    insurer: string;
    premium: number;
    model?: string;
  };
  status: string;
  policyNumber: string;
}

const ClaimSubmit: React.FC = () => {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [reason, setReason] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingPolicies, setFetchingPolicies] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submittedClaimId, setSubmittedClaimId] = useState<string | null>(null);

  // Fetch user's purchased policies
  useEffect(() => {
    const fetchPurchasedPolicies = async () => {
      try {
        setFetchingPolicies(true);
        const response = await purchaseAPI.getUserPurchases();
        if (response.success) {
          // Filter only successful purchases
          const successfulPurchases = response.data.filter(
            (p: Purchase) => p.status === 'success'
          );
          setPurchases(successfulPurchases);
        } else {
          setError('Failed to load your purchased policies');
        }
      } catch (err: any) {
        console.error('Error fetching purchases:', err);
        setError(err.response?.data?.message || 'Failed to load purchased policies');
      } finally {
        setFetchingPolicies(false);
      }
    };

    fetchPurchasedPolicies();
  }, []);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      
      // Validate file count
      if (files.length + newFiles.length > 5) {
        setError('Maximum 5 files allowed');
        return;
      }

      // Validate file types and sizes
      const validFiles: File[] = [];
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      for (const file of newFiles) {
        if (!allowedTypes.includes(file.type)) {
          setError(`Invalid file type: ${file.name}. Only PDF, JPEG, and PNG allowed.`);
          continue;
        }
        if (file.size > maxSize) {
          setError(`File too large: ${file.name}. Maximum size is 5MB.`);
          continue;
        }
        validFiles.push(file);
      }

      setFiles([...files, ...validFiles]);
      setError(null);
    }
  };

  // Remove file from list
  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Submit claim
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!selectedPolicyId) {
      setError('Please select a policy');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for the claim');
      return;
    }
    if (files.length === 0) {
      setError('Please upload at least one document');
      return;
    }

    try {
      setLoading(true);

      // Create FormData
      const formData = new FormData();
      formData.append('policyId', selectedPolicyId);
      formData.append('reason', reason.trim());
      
      // Append all files
      files.forEach((file) => {
        formData.append('documents', file);
      });

      // Submit claim
      const response = await claimAPI.submit(formData);

      if (response.success) {
        setSuccess(`Claim submitted successfully! Your Claim ID: ${response.claimId}`);
        setSubmittedClaimId(response.claimId);
        
        // Reset form
        setSelectedPolicyId('');
        setReason('');
        setFiles([]);
      } else {
        setError(response.message || 'Failed to submit claim');
      }
    } catch (err: any) {
      console.error('Error submitting claim:', err);
      setError(err.response?.data?.message || 'Failed to submit claim');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingPolicies) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (submittedClaimId) {
    return (
      <Box sx={{ minHeight: '100vh', py: 4, bgcolor: '#f5f5f5' }}>
        <Container maxWidth="md">
          <Card sx={{ textAlign: 'center', py: 4 }}>
            <CardContent>
              <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
              <Typography variant="h4" gutterBottom color="success.main">
                Claim Submitted Successfully!
              </Typography>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Claim ID: <strong>{submittedClaimId}</strong>
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Your claim has been submitted and is being reviewed. You will be notified about the status via email.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button variant="contained" onClick={() => navigate('/claims')}>
                  View My Claims
                </Button>
                <Button variant="outlined" onClick={() => window.location.reload()}>
                  Submit Another Claim
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', py: 4, bgcolor: '#f5f5f5' }}>
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
          Submit Insurance Claim
        </Typography>

        {purchases.length === 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            You don't have any purchased policies. Please purchase a policy before submitting a claim.
            <Button size="small" onClick={() => navigate('/policies')} sx={{ ml: 2 }}>
              Browse Policies
            </Button>
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Card>
          <CardContent>
            <form onSubmit={handleSubmit}>
              {/* Policy Selection */}
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Select Policy *</InputLabel>
                <Select
                  value={selectedPolicyId}
                  onChange={(e) => setSelectedPolicyId(e.target.value)}
                  label="Select Policy *"
                  disabled={purchases.length === 0}
                >
                  {purchases.map((purchase) => (
                    <MenuItem key={purchase._id} value={purchase.policyId._id}>
                      <Box>
                        <Typography variant="body1">
                          {purchase.policyId.name} - {purchase.policyId.type}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {purchase.policyId.insurer} • Policy #: {purchase.policyNumber}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Reason */}
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Reason for Claim *"
                placeholder="Please describe the incident and reason for your claim..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                sx={{ mb: 3 }}
                inputProps={{ maxLength: 2000 }}
                helperText={`${reason.length}/2000 characters`}
              />

              {/* File Upload */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Upload Documents * (Max 5 files, 5MB each)
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Accepted formats: PDF, JPEG, PNG
                </Typography>

                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadFileIcon />}
                  disabled={files.length >= 5}
                >
                  Choose Files
                  <input
                    type="file"
                    hidden
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={handleFileChange}
                  />
                </Button>

                {/* File List */}
                {files.length > 0 && (
                  <List sx={{ mt: 2 }}>
                    {files.map((file, index) => (
                      <ListItem key={index} sx={{ bgcolor: '#f9f9f9', mb: 1, borderRadius: 1 }}>
                        <ListItemText
                          primary={file.name}
                          secondary={`${formatFileSize(file.size)} • ${file.type}`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton edge="end" onClick={() => handleRemoveFile(index)}>
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>

              {/* Submit Button */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || purchases.length === 0}
                  startIcon={loading && <CircularProgress size={20} />}
                >
                  {loading ? 'Submitting...' : 'Submit Claim'}
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default ClaimSubmit;
