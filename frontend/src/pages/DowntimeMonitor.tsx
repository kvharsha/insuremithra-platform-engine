import React, { useState, useEffect } from 'react';
import {
  Box,
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
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
  PlayArrow,
  Info,
  Timeline,
} from '@mui/icons-material';
import api from '../services/api';

interface DowntimeIncident {
  _id: string;
  service: string;
  startAt: string;
  endAt: string | null;
  durationMs: number | null;
  status: 'down' | 'ongoing' | 'recovered';
  details: string;
  alertSent: boolean;
  recoverySent: boolean;
}

interface MonitorConfig {
  intervalMinutes: number;
  thresholdMs: number;
  timeoutMs: number;
  services: string[];
  isRunning: boolean;
}

interface ServiceState {
  lastCheckAt: Date | null;
  lastSuccessAt: Date | null;
  consecutiveFailures: number;
  currentIncident: string | null;
}

interface Stats {
  period: string;
  totalIncidents: number;
  ongoingIncidents: number;
  recoveredIncidents: number;
  avgDurationMs: number;
  byService: Array<{
    _id: string;
    count: number;
    totalDowntime: number;
  }>;
}

const DowntimeMonitor: React.FC = () => {
  const [incidents, setIncidents] = useState<DowntimeIncident[]>([]);
  const [config, setConfig] = useState<MonitorConfig | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [incidentsRes, configRes, statsRes] = await Promise.all([
        api.get('/admin/downtimes?limit=20'),
        api.get('/admin/downtimes/monitor/config'),
        api.get('/admin/downtimes/stats?days=30'),
      ]);

      setIncidents(incidentsRes.data.data.incidents);
      setConfig(configRes.data.data.config);
      // serviceStates available in configRes.data.data.serviceStates if needed
      setStats(statsRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch monitoring data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleManualTest = async () => {
    try {
      setTestRunning(true);
      setTestResult(null);
      setError(null);
      
      const response = await api.post('/admin/downtimes/test');
      const results = response.data.data.results;
      
      const successCount = results.filter((r: any) => r.result.ok).length;
      const failCount = results.length - successCount;
      
      setTestResult(
        `Health check completed: ${successCount} services OK, ${failCount} failed`
      );
      
      // Refresh data after test
      setTimeout(fetchData, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to run health check');
    } finally {
      setTestRunning(false);
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'recovered':
        return 'success';
      case 'down':
      case 'ongoing':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {testResult && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setTestResult(null)}>
          {testResult}
        </Alert>
      )}

      {/* Header Actions */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Downtime Monitoring
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<PlayArrow />}
            onClick={handleManualTest}
            disabled={testRunning}
            sx={{ mr: 2 }}
          >
            {testRunning ? 'Running...' : 'Run Health Check'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchData}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      {stats && (
        <Box sx={{ mb: 4, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <Timeline color="primary" sx={{ mr: 1 }} />
                  <Typography color="textSecondary" variant="body2">
                    Total Incidents
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {stats.totalIncidents}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Last 30 days
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <ErrorIcon color="error" sx={{ mr: 1 }} />
                  <Typography color="textSecondary" variant="body2">
                    Ongoing
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold" color="error">
                  {stats.ongoingIncidents}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Requires attention
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <CheckCircle color="success" sx={{ mr: 1 }} />
                  <Typography color="textSecondary" variant="body2">
                    Recovered
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {stats.recoveredIncidents}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Last 30 days
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <Info color="info" sx={{ mr: 1 }} />
                  <Typography color="textSecondary" variant="body2">
                    Avg Duration
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {formatDuration(stats.avgDurationMs)}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Per incident
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* Monitor Configuration */}
      {config && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Monitor Configuration
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 2 }}>
              <Box sx={{ flex: '1 1 200px' }}>
                <Typography variant="body2" color="textSecondary">
                  Status
                </Typography>
                <Chip
                  label={config.isRunning ? 'Running' : 'Stopped'}
                  color={config.isRunning ? 'success' : 'default'}
                  size="small"
                  icon={config.isRunning ? <CheckCircle /> : <ErrorIcon />}
                />
              </Box>
              <Box sx={{ flex: '1 1 200px' }}>
                <Typography variant="body2" color="textSecondary">
                  Check Interval
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {config.intervalMinutes} minutes
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 200px' }}>
                <Typography variant="body2" color="textSecondary">
                  Alert Threshold
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {formatDuration(config.thresholdMs)}
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 200px' }}>
                <Typography variant="body2" color="textSecondary">
                  Monitored Services
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {config.services.length}
                </Typography>
              </Box>
            </Box>

            {/* Services List */}
            <Box mt={2}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Monitored URLs:
              </Typography>
              {config.services.map((service, idx) => (
                <Chip
                  key={idx}
                  label={service}
                  size="small"
                  sx={{ mr: 1, mb: 1 }}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Downtime Incidents Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Incidents
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Service</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Started</TableCell>
                  <TableCell>Ended</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell align="center">Alerts</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {incidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Box py={4}>
                        <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                        <Typography variant="h6" color="textSecondary">
                          No Downtime Incidents
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          All monitored services are healthy
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  incidents.map((incident) => (
                    <TableRow key={incident._id}>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {incident.service}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={incident.status}
                          color={getStatusColor(incident.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(incident.startAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {incident.endAt
                          ? new Date(incident.endAt).toLocaleString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {formatDuration(incident.durationMs)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={incident.details}>
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{ maxWidth: 200, cursor: 'pointer' }}
                          >
                            {incident.details}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" justifyContent="center" gap={1}>
                          {incident.alertSent && (
                            <Tooltip title="Alert sent">
                              <ErrorIcon fontSize="small" color="error" />
                            </Tooltip>
                          )}
                          {incident.recoverySent && (
                            <Tooltip title="Recovery notification sent">
                              <CheckCircle fontSize="small" color="success" />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DowntimeMonitor;
