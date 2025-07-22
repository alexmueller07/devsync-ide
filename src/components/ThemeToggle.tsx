import React from 'react';
import { Box, Switch, styled } from '@mui/material';
import { LightMode, DarkMode } from '@mui/icons-material';

interface ThemeToggleProps {
  isDarkMode: boolean;
  onToggle: () => void;
}

const ThemeSwitch = styled(Switch)(({ theme }) => ({
  width: 100,
  height: 40,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: 2,
    transitionDuration: '300ms',
    '&.Mui-checked': {
      transform: 'translateX(60px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: '#1a1a1a',
        opacity: 1,
        border: 0,
      },
    },
  },
  '& .MuiSwitch-thumb': {
    width: 36,
    height: 36,
    backgroundColor: '#fff',
    boxShadow: '0 2px 4px 0 rgba(0,0,0,0.2)',
  },
  '& .MuiSwitch-track': {
    borderRadius: 20,
    backgroundColor: '#e9e9ea',
    opacity: 1,
    transition: theme.transitions.create(['background-color'], {
      duration: 500,
    }),
  },
}));

const IconWrapper = styled(Box)({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#666',
  '&.left': {
    left: 8,
  },
  '&.right': {
    right: 8,
  },
});

export default function ThemeToggle({ isDarkMode, onToggle }: ThemeToggleProps) {
  return (
    <Box sx={{ position: 'relative', width: 100, height: 40 }}>
      <IconWrapper className="left">
        <LightMode sx={{ fontSize: 20 }} />
      </IconWrapper>
      <IconWrapper className="right">
        <DarkMode sx={{ fontSize: 20 }} />
      </IconWrapper>
      <ThemeSwitch
        checked={isDarkMode}
        onChange={onToggle}
        inputProps={{ 'aria-label': 'theme toggle' }}
      />
    </Box>
  );
} 