import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Typography, Container, Box } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          gap: 4
        }}
      >
        <Typography variant="h2" component="h1" gutterBottom>
          Welcome to DevSync
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          Your collaborative coding environment
        </Typography>
        
        {currentUser ? (
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/editor')}
            sx={{ mt: 2 }}
          >
            Go to Editor
          </Button>
        ) : (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/signup')}
            >
              Sign Up
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
          </Box>
        )}
      </Box>
    </Container>
  );
} 