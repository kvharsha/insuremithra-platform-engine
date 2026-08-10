import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Container, Card, CardContent, TextField, Button, Typography, InputAdornment, Checkbox, FormControlLabel } from '@mui/material';
import { policyAPI } from '../services/api';
import SearchIcon from '@mui/icons-material/Search';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';

const PolicySearch: React.FC = () => {
  const [filters, setFilters] = useState({ type: '', insurer: '', model: '', minPremium: '', maxPremium: '' });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Limit types to the Epic 2 story types
  const policyTypes = useMemo(() => ['2W', '4W', 'Health'], []);
  const insurers = useMemo(() => ['LIC', 'HDFC ERGO', 'ICICI Lombard', 'Tata AIG', 'SBI General'], []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError(null);
      const query: any = {};
      if (filters.type) query.type = filters.type;
      if (filters.insurer) query.insurer = filters.insurer;
      if (filters.model) query.model = filters.model;
      if (filters.minPremium) query.minPremium = filters.minPremium;
      if (filters.maxPremium) query.maxPremium = filters.maxPremium;
      const qs = new URLSearchParams(query).toString();
      navigate(qs ? `/policy-search?${qs}` : '/policy-search', { replace: true });
      const data = await policyAPI.searchPolicies(query);
      // Support both legacy { results } and new { success, count, data } formats
      const items = data?.data ?? data?.results ?? [];
      setResults(items || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Load from URL query on mount and when query changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const next = {
      type: params.get('type') || '',
      insurer: params.get('insurer') || '',
      model: params.get('model') || '',
      minPremium: params.get('minPremium') || '',
      maxPremium: params.get('maxPremium') || ''
    };
    setFilters(next as any);
    const hasAny = next.type || next.insurer || next.model || next.minPremium || next.maxPremium;
    if (hasAny) {
      (async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await policyAPI.searchPolicies(next as any);
          const items = data?.data ?? data?.results ?? [];
          setResults(items || []);
        } catch (err: any) {
          setError(err.response?.data?.error || 'Search failed');
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setResults([]);
    }
  }, [location.search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 3) return prev; // ignore beyond 3
      return [...prev, id];
    });
  };

  const handleCompareNow = () => {
    if (selectedIds.length < 2) return;
    const qs = new URLSearchParams({ ids: selectedIds.join(',') }).toString();
    navigate(`/compare?${qs}`);
  };

  return (
    <Box className="dashboard-container">
      <Container maxWidth="lg">
        <Typography variant="h4" sx={{ mb: 3 }}>Policy Search</Typography>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 220px', minWidth: 220 }}>
                <TextField select fullWidth label="Policy Type" name="type" value={filters.type} onChange={handleChange} SelectProps={{ native: true }}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}>
                  <option value="">All Types</option>
                  {policyTypes.map(t => (<option key={t} value={t}>{t}</option>))}
                </TextField>
              </div>
              <div style={{ flex: '1 1 220px', minWidth: 220 }}>
                <TextField select fullWidth label="Insurer" name="insurer" value={filters.insurer} onChange={handleChange} SelectProps={{ native: true }}>
                  <option value="">All Insurers</option>
                  {insurers.map(i => (<option key={i} value={i}>{i}</option>))}
                </TextField>
              </div>
              <div style={{ flex: '1 1 220px', minWidth: 220 }}>
                <TextField fullWidth label="Model" name="model" value={filters.model} onChange={handleChange} placeholder="e.g. Swift, Splendor" />
              </div>
              <div style={{ flex: '1 1 220px', minWidth: 220 }}>
                <TextField fullWidth type="number" label="Min Premium" name="minPremium" value={filters.minPremium} onChange={handleChange}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><MonetizationOnIcon /></InputAdornment>) }} />
              </div>
              <div style={{ flex: '1 1 220px', minWidth: 220 }}>
                <TextField fullWidth type="number" label="Max Premium" name="maxPremium" value={filters.maxPremium} onChange={handleChange}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><MonetizationOnIcon /></InputAdornment>) }} />
              </div>
              <div style={{ width: '100%' }}>
                <Button variant="contained" onClick={handleSearch} disabled={loading}>{loading ? 'Searching...' : 'Search'}</Button>
              </div>
            </div>
            {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
          </CardContent>
        </Card>

        {/* Compare Now Button - Shows when policies are selected */}
        {selectedIds.length > 0 && (
          <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2, display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {selectedIds.length} {selectedIds.length === 1 ? 'policy' : 'policies'} selected
              </Typography>
              {selectedIds.length > 0 && selectedIds.length < 2 && (
                <Typography variant="body2" color="text.secondary">Select at least 2 policies to compare</Typography>
              )}
              {selectedIds.length > 3 && (
                <Typography variant="body2" color="error">Maximum 3 policies can be compared</Typography>
              )}
            </Box>
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              disabled={selectedIds.length < 2 || selectedIds.length > 3} 
              onClick={handleCompareNow}
            >
              Compare Now ({selectedIds.length})
            </Button>
          </Box>
        )}

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {results.map((p, idx) => (
            <div key={p._id || idx} style={{ flex: '1 1 300px', minWidth: 280, maxWidth: 420 }}>
              <Card sx={{ 
                border: selectedIds.includes(p._id) ? '2px solid #1976d2' : '1px solid #e0e0e0',
                '&:hover': { boxShadow: 4 }
              }}>
                <CardContent>
                  {/* Checkbox for comparison */}
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedIds.includes(p._id)}
                        onChange={() => toggleSelect(p._id)}
                        disabled={!selectedIds.includes(p._id) && selectedIds.length >= 3}
                      />
                    }
                    label="Select to compare"
                    sx={{ mb: 1 }}
                  />
                  
                  <Typography variant="h6" sx={{ mb: 1 }}>{p.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{p.type} • {p.model ? `${p.model} • ` : ''}{p.insurer}</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1976d2' }}>Premium: ₹{p.premium}</Typography>
                  {p.sumAssured ? <Typography variant="body2">Sum Assured: ₹{p.sumAssured}</Typography> : null}
                  {p.description ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{p.description}</Typography> : null}
                  
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => navigate(`/policies/${p._id}/details`)}
                    >
                      View Details
                    </Button>
                    <Button 
                      size="small" 
                      variant="contained" 
                      color="secondary"
                      onClick={() => navigate(`/purchase/${p._id}`)}
                    >
                      Buy Now
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </div>
          ))}
          {!loading && results.length === 0 && (
            <Typography color="text.secondary">No results. Adjust filters and try again.</Typography>
          )}
        </div>
      </Container>
    </Box>
  );
};

export default PolicySearch;


