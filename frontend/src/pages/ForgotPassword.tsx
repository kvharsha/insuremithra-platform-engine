import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
} from '@mui/material';
import {
  Email,
  ArrowBack,
  Send,
} from '@mui/icons-material';
import { authAPI } from '../services/api';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await authAPI.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box className="auth-container">
        <Card className="auth-card fade-in">
          <CardContent>
            <Box className="auth-header">
              <Box className="auth-logo">
                <Send />
              </Box>
              <Typography variant="h4" className="auth-title">
                Check Your Email
              </Typography>
              <Typography className="auth-subtitle">
                We've sent a password reset link to your email address.
              </Typography>
            </Box>

            <Alert severity="success" sx={{ mb: 3 }}>
              If an account with that email exists, a password reset link has been sent.
            </Alert>

            <Box textAlign="center">
              <Link
                to="/login"
                style={{
                  color: '#1976d2',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                ← Back to Login
              </Link>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box className="auth-container">
      <Card className="auth-card fade-in">
        <CardContent>
          <Box className="auth-header">
            <Box className="auth-logo">
              <ArrowBack />
            </Box>
            <Typography variant="h4" className="auth-title">
              Forgot Password?
            </Typography>
            <Typography className="auth-subtitle">
              Enter your email address and we'll send you a reset link
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} className="form-container">
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                mb: 2,
                background: 'linear-gradient(135deg, #1976d2, #42a5f5)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1565c0, #1976d2)',
                },
              }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <Box textAlign="center">
              <Link
                to="/login"
                style={{
                  color: '#1976d2',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                ← Back to Login
              </Link>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ForgotPassword;
