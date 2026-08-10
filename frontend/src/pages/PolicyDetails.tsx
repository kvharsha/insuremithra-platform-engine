import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Divider,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
} from '@mui/material';
import { policyAPI } from '../services/api';
import HomeIcon from '@mui/icons-material/Home';
import PolicyIcon from '@mui/icons-material/Policy';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

interface Policy {
  _id: string;
  name: string;
  type: string;
  model: string;
  insurer: string;
  premium: number;
  coverage: string;
  tenure: string;
  description?: string;
  exclusions?: string[];
  benefits?: string[];
}

const PolicyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPolicy = async () => {
      if (!id) {
        setError('Policy ID is missing');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await policyAPI.getPolicyById(id);
        if (response.success && response.data) {
          setPolicy(response.data);
        } else {
          setError('Policy not found');
        }
      } catch (err: any) {
        console.error('Failed to fetch policy:', err);
        setError(err.response?.data?.message || 'Failed to load policy details');
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, [id]);

  const handleBuyNow = () => {
    if (policy) {
      navigate(`/purchase/${policy._id}`);
    }
  };

  const handleBackToSearch = () => {
    navigate('/policies');
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', py: 4, bgcolor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !policy) {
    return (
      <Box sx={{ minHeight: '100vh', py: 4, bgcolor: '#f5f5f5' }}>
        <Container maxWidth="lg">
          <Alert severity="error" sx={{ mb: 3 }}>{error || 'Policy not found'}</Alert>
          <Button variant="contained" onClick={handleBackToSearch}>Back to Search</Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', py: 4, bgcolor: '#f5f5f5' }}>
      <Container maxWidth="lg">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          sx={{ mb: 3 }}
          aria-label="breadcrumb"
        >
          <Link
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            color="inherit"
            onClick={() => navigate('/dashboard')}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Home
          </Link>
          <Link
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            color="inherit"
            onClick={handleBackToSearch}
          >
            <PolicyIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Policies
          </Link>
          <Typography
            sx={{ display: 'flex', alignItems: 'center' }}
            color="text.primary"
          >
            {policy.name}
          </Typography>
        </Breadcrumbs>

        {/* Policy Details Card */}
        <Card sx={{ bgcolor: 'white', boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            {/* Header Section */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h4" component="h1" gutterBottom>
                    {policy.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip label={policy.type} color="primary" size="small" />
                    <Chip label={policy.model} variant="outlined" size="small" />
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold' }}>
                    ₹{policy.premium.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    per {policy.tenure}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                <strong>Insurer:</strong> {policy.insurer}
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Description Section */}
            {policy.description && (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {policy.description}
                  </Typography>
                </Box>
                <Divider sx={{ my: 3 }} />
              </>
            )}

            {/* Details Grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
              {/* Coverage Section */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Coverage
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {policy.coverage}
                </Typography>
              </Box>

              {/* Tenure Section */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Policy Tenure
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {policy.tenure}
                </Typography>
              </Box>

              {/* Benefits Section */}
              {policy.benefits && policy.benefits.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Benefits
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                    {policy.benefits.map((benefit, index) => (
                      <Typography component="li" key={index} variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                        {benefit}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Exclusions Section */}
              {policy.exclusions && policy.exclusions.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Exclusions
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                    {policy.exclusions.map((exclusion, index) => (
                      <Typography component="li" key={index} variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                        {exclusion}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                size="large"
                onClick={handleBackToSearch}
              >
                Back to Search
              </Button>
              <Button
                variant="contained"
                size="large"
                color="primary"
                onClick={handleBuyNow}
              >
                Buy Now
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default PolicyDetails;
