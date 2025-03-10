import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  CircularProgress,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const columns = [
  { field: 'id', headerName: 'ID', width: 90 },
  { field: 'filename', headerName: 'Filename', width: 200 },
  { field: 'status', headerName: 'Status', width: 130 },
  {
    field: 'processed_at',
    headerName: 'Processed Date',
    width: 180,
    valueFormatter: (params) => {
      if (!params.value) return '';
      return new Date(params.value).toLocaleString();
    },
  },
  {
    field: 'total_amount',
    headerName: 'Total Amount',
    width: 130,
    valueFormatter: (params) => {
      if (!params.value) return '';
      return `$${params.value.toFixed(2)}`;
    },
  },
  { field: 'vendor', headerName: 'Vendor', width: 200 },
  { field: 'invoice_number', headerName: 'Invoice Number', width: 150 },
];

function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/documents`);
      setDocuments(response.data.documents);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Error fetching documents');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    Object.values(doc)
      .join(' ')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Documents
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <TextField
            fullWidth
            label="Search Documents"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card sx={{ height: 600 }}>
        <CardContent sx={{ height: '100%' }}>
          <DataGrid
            rows={filteredDocuments}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            checkboxSelection
            disableSelectionOnClick
            loading={loading}
            error={error}
          />
        </CardContent>
      </Card>
    </Box>
  );
}

export default Documents;
