import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  IconButton, 
  Tooltip, 
  Breadcrumbs,
  Link,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
  Button
} from '@mui/material';
import {
  Close as CloseIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  ContentCopy as ContentCopyIcon,
  NavigateNext as NavigateNextIcon,
  Save as SaveIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp, onSnapshot, collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import CodeEditor from '../components/CodeEditor';
import Layout from '../components/Layout';
import { format } from 'date-fns';
import ShareDialog from '../components/ShareDialog';

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
    }
  };
}

export default function Editor() {
  const { fileId } = useParams<{ fileId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    if (!fileId || !currentUser) return;

    // Set up real-time listener for the file
    const fileRef = doc(db, 'files', fileId);
    const unsubscribe = onSnapshot(fileRef, (doc) => {
      if (!doc.exists()) {
        setError('File not found');
        return;
      }

      const fileData = doc.data();
      if (fileData.type === 'folder') {
        navigate('/editor');
        return;
      }

      setFile({
        ...fileData,
        id: doc.id,
        lastModified: fileData.lastModified.toDate()
      } as File);

      // Load file path
      if (fileData.parentId) {
        loadFilePath(fileData.parentId);
      }

      // Check if user has edit permissions
      const isOwner = fileData.ownerId === currentUser.uid;
      const isEditor = fileData.sharedWith?.[currentUser.email || '']?.permission === 'editor';
      setIsReadOnly(!isOwner && !isEditor);
    }, (err) => {
      console.error('Error in real-time listener:', err);
      setError('Failed to load file');
    });

    // Load all files for breadcrumb navigation
    const loadFiles = async () => {
      try {
        const filesRef = collection(db, 'files');
        const q = query(filesRef);
        const querySnapshot = await getDocs(q);
        const filesData = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          lastModified: doc.data().lastModified.toDate()
        })) as File[];
        setFiles(filesData);
      } catch (err) {
        console.error('Error loading files:', err);
      }
    };

    loadFiles();

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [fileId, currentUser]);

  const loadFilePath = async (parentId: string) => {
    try {
      const parentRef = doc(db, 'files', parentId);
      const parentDoc = await getDoc(parentRef);
      if (parentDoc.exists()) {
        const parentData = parentDoc.data();
        setCurrentPath([...currentPath, parentId]);
        if (parentData.parentId) {
          await loadFilePath(parentData.parentId);
        }
      }
    } catch (err) {
      console.error('Error loading file path:', err);
    }
  };

  const handleSave = async (content: string | undefined) => {
    if (!file || !currentUser || !content || isSaving) return;

    try {
      setIsSaving(true);
      const fileRef = doc(db, 'files', file.id);
      await updateDoc(fileRef, {
        content,
        lastModified: Timestamp.now()
      });
    } catch (err) {
      console.error('Error saving file:', err);
      setError('Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleDownload = () => {
    if (!file) return;
    const blob = new Blob([file.content || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (!file) return;
    navigator.clipboard.writeText(file.content || '');
  };

  const handleShare = () => {
    setIsShareDialogOpen(true);
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!file || !currentUser) return;

    try {
      await updateDoc(doc(db, 'files', file.id), {
        deleted: true
      });
      navigate('/files');
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error" variant="h6">{error}</Typography>
        <Button 
          variant="contained" 
          onClick={() => navigate('/editor')}
          sx={{ mt: 2 }}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  if (!file) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '16px',
        borderBottom: '1px solid #dadce0',
        backgroundColor: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Breadcrumbs 
            separator={<NavigateNextIcon fontSize="small" />}
            sx={{ mr: 2 }}
          >
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/editor')}
              sx={{ 
                color: '#5f6368',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              My Files
            </Link>
            {currentPath.map((id, index) => (
              <Link
                key={id}
                component="button"
                variant="body2"
                onClick={() => navigate(`/editor/${id}`)}
                sx={{ 
                  color: '#5f6368',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                {files.find(f => f.id === id)?.name || 'Loading...'}
              </Link>
            ))}
          </Breadcrumbs>
          <Typography variant="h6" sx={{ color: '#202124' }}>
            {file.name}
          </Typography>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tooltip title="Save">
            <IconButton 
              size="small"
              onClick={() => handleSave(file.content)}
              disabled={isSaving}
            >
              <SaveIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download">
            <IconButton size="small" onClick={handleDownload}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Copy">
            <IconButton size="small" onClick={handleCopy}>
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="More">
            <IconButton size="small" onClick={handleMenuOpen}>
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {currentUser ? (
          <CodeEditor
            value={file.content || ''}
            language={file.language || 'plaintext'}
            onChange={(value) => {
              if (file) {
                setFile({ ...file, content: value });
                handleSave(value);
              }
            }}
            readOnly={isReadOnly}
            fileId={file.id}
            currentUser={{
              id: currentUser.uid,
              name: currentUser.displayName || 'Anonymous',
              email: currentUser.email || '',
              photoURL: currentUser.photoURL || undefined
            }}
          />
        ) : (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%' 
          }}>
            <CircularProgress />
          </Box>
        )}
      </div>
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            boxShadow: '0 2px 10px 0 rgba(0,0,0,0.1)',
            borderRadius: '8px'
          }
        }}
      >
        {!isReadOnly && (
          <>
            <MenuItem onClick={handleShare}>
              <ListItemIcon>
                <ShareIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Share" />
            </MenuItem>
            <Divider />
            <MenuItem 
              onClick={handleDelete}
              sx={{ color: '#d93025' }}
            >
              <ListItemIcon>
                <DeleteIcon fontSize="small" sx={{ color: '#d93025' }} />
              </ListItemIcon>
              <ListItemText primary="Delete" />
            </MenuItem>
          </>
        )}
      </Menu>

      {file && (
        <ShareDialog
          open={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
          file={file}
        />
      )}
    </div>
  );
} 