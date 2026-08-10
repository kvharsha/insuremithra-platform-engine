import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow, Paper } from '@mui/material';
import { policyAPI } from '../services/api';

const ComparePolicies: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [policyIds, setPolicyIds] = useState<string[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const idsRaw = params.get('ids') || '';
    const ids = idsRaw ? idsRaw.split(',').filter(Boolean) : [];
    setPolicyIds(ids);
  }, [location.search]);

  useEffect(() => {
    if (!policyIds.length) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await policyAPI.comparePolicies(policyIds);
        if (res?.success) {
          setPolicies(res.data || []);
        } else {
          setError(res?.message || 'Comparison failed');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Comparison failed');
      } finally {
        setLoading(false);
      }
    })();
  }, [policyIds]);

  if (!policyIds.length) {
    return (
      <Box sx={{ p: 4 }}>
        <Container>
          <Typography variant="h5">No policies selected for comparison.</Typography>
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/policy-search')}>Go to Search</Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Container>
        <Typography variant="h4" sx={{ mb: 2 }}>Compare Policies</Typography>
        {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
        {loading && <Typography sx={{ mb: 2 }}>Loading...</Typography>}
        {!loading && policies.length > 0 && (
          <Paper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Attribute</TableCell>
                  {policies.map((p) => (
                    <TableCell key={p._id}>{p.name}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Type</TableCell>
                  {policies.map((p) => <TableCell key={p._id}>{p.type}</TableCell>)}
                </TableRow>
                <TableRow>
                  <TableCell>Insurer</TableCell>
                  {policies.map((p) => <TableCell key={p._id}>{p.insurer}</TableCell>)}
                </TableRow>
                <TableRow>
                  <TableCell>Model</TableCell>
                  {policies.map((p) => <TableCell key={p._id}>{p.model}</TableCell>)}
                </TableRow>
                <TableRow>
                  <TableCell>Premium (₹)</TableCell>
                  {policies.map((p) => <TableCell key={p._id}>₹{p.premium}</TableCell>)}
                </TableRow>
                <TableRow>
                  <TableCell>Coverage</TableCell>
                  {policies.map((p) => <TableCell key={p._id}>{p.coverage}</TableCell>)}
                </TableRow>
                <TableRow>
                  <TableCell>Tenure</TableCell>
                  {policies.map((p) => <TableCell key={p._id}>{p.tenure}</TableCell>)}
                </TableRow>
                <TableRow>
                  <TableCell>Benefits</TableCell>
                  {policies.map((p) => (
                    <TableCell key={p._id}>{Array.isArray(p.benefits) ? p.benefits.join(', ') : p.benefits}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Description</TableCell>
                  {policies.map((p) => <TableCell key={p._id}>{p.description || '-'}</TableCell>)}
                </TableRow>
                <TableRow>
                  <TableCell><strong>Actions</strong></TableCell>
                  {policies.map((p) => (
                    <TableCell key={p._id}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Button 
                          variant="outlined" 
                          size="small"
                          onClick={() => navigate(`/policies/${p._id}/details`)}
                        >
                          View Details
                        </Button>
                        <Button 
                          variant="contained" 
                          color="secondary" 
                          size="small"
                          onClick={() => navigate(`/purchase/${p._id}`)}
                        >
                          Buy Now
                        </Button>
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </Paper>
        )}

        <div style={{ marginTop: 16 }}>
          <Button variant="outlined" sx={{ mr: 2 }} onClick={() => navigate(-1)}>Back</Button>
          <Button variant="contained" onClick={() => navigate('/policy-search')}>New Search</Button>
          {policies.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Button variant="contained" color="secondary" onClick={() => navigate(`/purchase/${policies[0]._id}`)}>Buy First Policy</Button>
            </div>
          )}
        </div>
      </Container>
    </Box>
  );
};

export default ComparePolicies;
