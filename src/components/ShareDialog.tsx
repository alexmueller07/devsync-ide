import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Divider,
  CircularProgress
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, collection, query, where, getDocs, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface File {
  id: string;
  name: string;
  type: 'file' | 'folder';
  language?: string;
  content?: string;
  lastModified: Date;
  parentId?: string;
  ownerId: string;
  sharedWith?: {
    [userId: string]: {
      email: string;
      permission: 'editor' | 'viewer';
      userId?: string;
    }
  };
}

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  file: File;
}

export default function ShareDialog({ open, onClose, file }: ShareDialogProps) {
  const { currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'editor' | 'viewer'>('viewer');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleShare = async () => {
    if (!currentUser || !email.trim()) return;

    try {
      setIsLoading(true);
      setError('');

      // Check if user is trying to share with themselves
      if (email === currentUser.email) {
        setError('You cannot share with yourself');
        return;
      }

      // Look up user by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      let userId: string;
      if (querySnapshot.empty) {
        // If user not found in users collection, use email as the key
        userId = email;
      } else {
        userId = querySnapshot.docs[0].id;
      }

      // Check if user is already shared
      if (file.sharedWith?.[userId]) {
        setError('User already has access');
        return;
      }

      const fileRef = doc(db, 'files', file.id);
      const sharedWith = { ...(file.sharedWith || {}) };
      
      // Store both the user's ID and email in the sharedWith object
      sharedWith[userId] = {
        email,
        permission,
        userId: userId
      };

      await updateDoc(fileRef, {
        sharedWith,
        lastModified: serverTimestamp()
      });

      // Create a notification for the shared user
      const notificationsRef = collection(db, 'notifications');
      await addDoc(notificationsRef, {
        userId: userId,
        fileId: file.id,
        fileName: file.name,
        sharedBy: currentUser.email,
        permission: permission,
        timestamp: serverTimestamp(),
        read: false
      });

      setEmail('');
      setPermission('viewer');
      setError('');
      onClose();
    } catch (error) {
      console.error('Error sharing file:', error);
      setError('Failed to share file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveShare = async (userId: string) => {
    if (!currentUser) return;

    try {
      setIsLoading(true);
      const fileRef = doc(db, 'files', file.id);
      const sharedWith = { ...(file.sharedWith || {}) };
      delete sharedWith[userId];

      await updateDoc(fileRef, {
        sharedWith,
        lastModified: serverTimestamp()
      });
    } catch (error) {
      console.error('Error removing share:', error);
      setError('Failed to remove access');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePermission = async (userId: string, newPermission: 'editor' | 'viewer') => {
    if (!currentUser) return;

    try {
      setIsLoading(true);
      const fileRef = doc(db, 'files', file.id);
      const sharedWith = { ...(file.sharedWith || {}) };
      
      if (sharedWith[userId]) {
        sharedWith[userId] = {
          ...sharedWith[userId],
          permission: newPermission
        };

        await updateDoc(fileRef, {
          sharedWith,
          lastModified: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating permission:', error);
      setError('Failed to update permission');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'var(--surface-bg)',
          color: 'var(--primary-text)',
          boxShadow: 'var(--shadow-lg)',
          borderRadius: 2
        }
      }}
    >
      <DialogTitle sx={{ 
        color: 'var(--primary-text)',
        borderBottom: '1px solid var(--border-color)',
        pb: 2
      }}>
        Share "{file.name}"
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Box sx={{ mb: 3 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!error}
            helperText={error}
            disabled={isLoading}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'var(--primary-text)',
                '& fieldset': {
                  borderColor: 'var(--border-color)',
                },
                '&:hover fieldset': {
                  borderColor: 'var(--accent-color)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'var(--accent-color)',
                },
              },
              '& .MuiInputLabel-root': {
                color: 'var(--secondary-text)',
                '&.Mui-focused': {
                  color: 'var(--accent-color)',
                },
              },
              '& .MuiFormHelperText-root': {
                color: 'var(--error-color)',
              },
            }}
          />
          <FormControl fullWidth margin="dense" sx={{
            '& .MuiOutlinedInput-root': {
              color: 'var(--primary-text)',
              '& fieldset': {
                borderColor: 'var(--border-color)',
              },
              '&:hover fieldset': {
                borderColor: 'var(--accent-color)',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'var(--accent-color)',
              },
            },
            '& .MuiInputLabel-root': {
              color: 'var(--secondary-text)',
              '&.Mui-focused': {
                color: 'var(--accent-color)',
              },
            },
          }}>
            <InputLabel>Permission</InputLabel>
            <Select
              value={permission}
              label="Permission"
              onChange={(e) => setPermission(e.target.value as 'editor' | 'viewer')}
              disabled={isLoading}
            >
              <MenuItem value="editor">Editor</MenuItem>
              <MenuItem value="viewer">Viewer</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={handleShare}
            sx={{ 
              mt: 2,
              backgroundColor: 'var(--accent-color)',
              color: 'var(--primary-bg)',
              '&:hover': {
                backgroundColor: '#aecbfa'
              }
            }}
            fullWidth
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Share'}
          </Button>
        </Box>

        <Divider sx={{ my: 2, borderColor: 'var(--border-color)' }} />

        <Typography variant="subtitle2" sx={{ 
          mb: 1,
          color: 'var(--primary-text)',
          fontWeight: 500
        }}>
          People with access
        </Typography>
        <List>
          {Object.entries(file.sharedWith || {}).map(([userId, data]) => (
            <ListItem 
              key={userId}
              sx={{
                '&:hover': {
                  backgroundColor: 'var(--hover-color)',
                  borderRadius: 1
                }
              }}
            >
              <ListItemText
                primary={data.email}
                secondary={data.permission === 'editor' ? 'Can edit' : 'Can view'}
                primaryTypographyProps={{
                  sx: { color: 'var(--primary-text)' }
                }}
                secondaryTypographyProps={{
                  sx: { color: 'var(--secondary-text)' }
                }}
              />
              <ListItemSecondaryAction>
                <FormControl size="small" sx={{ mr: 1 }}>
                  <Select
                    value={data.permission}
                    onChange={(e) => handleUpdatePermission(userId, e.target.value as 'editor' | 'viewer')}
                    size="small"
                    disabled={isLoading}
                    sx={{
                      color: 'var(--primary-text)',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'var(--border-color)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'var(--accent-color)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'var(--accent-color)',
                      },
                    }}
                  >
                    <MenuItem value="editor">Editor</MenuItem>
                    <MenuItem value="viewer">Viewer</MenuItem>
                  </Select>
                </FormControl>
                <IconButton
                  edge="end"
                  onClick={() => handleRemoveShare(userId)}
                  size="small"
                  disabled={isLoading}
                  sx={{
                    color: 'var(--secondary-text)',
                    '&:hover': {
                      color: 'var(--error-color)',
                      backgroundColor: 'var(--hover-color)'
                    }
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions sx={{ 
        borderTop: '1px solid var(--border-color)',
        px: 3,
        py: 2
      }}>
        <Button 
          onClick={onClose} 
          disabled={isLoading}
          sx={{
            color: 'var(--primary-text)',
            '&:hover': {
              backgroundColor: 'var(--hover-color)'
            }
          }}
        >
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
} 