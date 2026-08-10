import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, TextField, Button, Card, CardContent, Typography, MenuItem, Select, Checkbox, FormControlLabel } from '@mui/material';
import { policyAPI } from '../services/api';

const Policies: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ type: '', model: '', insurer: '', minPrice: '', maxPrice: '' });
  const [policies, setPolicies] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.type) params.type = filters.type;
      if (filters.model) params.model = filters.model;
      if (filters.insurer) params.insurer = filters.insurer;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;

      const res = await policyAPI.searchPolicies(params as any);
      const items = res?.data ?? res?.results ?? [];
      setPolicies(items);
    } catch (e) {
      console.error('Failed to fetch policies', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 3) return prev; // max 3 policies
      return [...prev, id];
    });
  };

  const handleCompareNow = () => {
    if (selectedIds.length < 2) return;
    const qs = new URLSearchParams({ ids: selectedIds.join(',') }).toString();
    navigate(`/compare?${qs}`);
  };

  return (
    <Box sx={{ py: 4 }}>
      <Container>
        <Typography variant="h4" sx={{ mb: 3 }}>Search Insurance Policies</Typography>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          <div style={{ minWidth: 140 }}>
            <Select fullWidth value={filters.type} onChange={(e) => setFilters({ ...filters, type: String(e.target.value) })} displayEmpty>
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="2W">2W</MenuItem>
              <MenuItem value="4W">4W</MenuItem>
              <MenuItem value="Health">Health</MenuItem>
              <MenuItem value="Life">Life</MenuItem>
              <MenuItem value="Travel">Travel</MenuItem>
            </Select>
          </div>
          <div style={{ minWidth: 200 }}>
            <TextField fullWidth placeholder="Model" value={filters.model} onChange={(e) => setFilters({ ...filters, model: e.target.value })} />
          </div>
          <div style={{ minWidth: 200 }}>
            <TextField fullWidth placeholder="Insurer" value={filters.insurer} onChange={(e) => setFilters({ ...filters, insurer: e.target.value })} />
          </div>
          <div style={{ minWidth: 100 }}>
            <TextField fullWidth type="number" placeholder="Min ₹" value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} />
          </div>
          <div style={{ minWidth: 100 }}>
            <TextField fullWidth type="number" placeholder="Max ₹" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} />
          </div>
          <div style={{ minWidth: 120 }}>
            <Button variant="contained" onClick={fetchPolicies} disabled={loading}>{loading ? 'Searching...' : 'Search'}</Button>
          </div>
        </div>

        {/* Compare Button */}
        {selectedIds.length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button 
              variant="contained" 
              color="primary" 
              disabled={selectedIds.length < 2} 
              onClick={handleCompareNow}
            >
              Compare Now ({selectedIds.length})
            </Button>
            {selectedIds.length > 3 && (
              <Typography color="error">You can only compare up to 3 policies.</Typography>
            )}
            {selectedIds.length > 0 && selectedIds.length < 2 && (
              <Typography color="text.secondary">Select at least 2 policies to compare</Typography>
            )}
          </Box>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {policies.length ? policies.map((p) => (
            <Card 
              key={p._id}
              sx={{ 
                cursor: 'pointer',
                border: selectedIds.includes(p._id) ? '2px solid #1976d2' : '1px solid #e0e0e0',
                '&:hover': { boxShadow: 6 } 
              }}
            >
              <CardContent>
                {/* Checkbox for comparison */}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedIds.includes(p._id)}
                      onChange={() => toggleSelect(p._id)}
                      disabled={!selectedIds.includes(p._id) && selectedIds.length >= 3}
                      onClick={(e) => e.stopPropagation()}
                    />
                  }
                  label="Compare"
                  sx={{ mb: 1 }}
                />
                
                <div onClick={() => navigate(`/policies/${p._id}/details`)}>
                  <Typography variant="h6">{p.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{p.type} — {p.model}</Typography>
                  <Typography><strong>Insurer:</strong> {p.insurer}</Typography>
                  <Typography><strong>Premium:</strong> ₹{p.premium}</Typography>
                  <Typography><strong>Coverage:</strong> {p.coverage}</Typography>
                  {p.benefits?.length ? (
                    <ul style={{ marginTop: 8 }}>
                      {p.benefits.map((b: string, i: number) => <li key={i}>{b}</li>)}
                    </ul>
                  ) : null}
                </div>
                
                <div style={{ marginTop: 12 }}>
                  <Button 
                    variant="contained" 
                    color="secondary" 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/purchase/${p._id}`);
                    }}
                  >
                    Buy Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )) : (
            <Typography color="text.secondary">No policies found matching your criteria.</Typography>
          )}
        </div>
      </Container>
    </Box>
  );
};

export default Policies;
