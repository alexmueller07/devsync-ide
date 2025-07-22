import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Box, Typography, Breadcrumbs, Link, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Add as AddIcon, CreateNewFolder as CreateNewFolderIcon } from '@mui/icons-material';
import FileGrid from '../components/FileGrid';

interface File {
  id: string;
  name: string;
  type: 'file' | 'folder';
  language?: string;
  content?: string;
  lastModified: Date;
  parentId?: string;
  ownerId: string;
  starred?: boolean;
  sharedWith?: {
    [userId: string]: {
      email: string;
      permission: 'editor' | 'viewer';
    }
  };
}

export default function FileSystem() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<'file' | 'folder'>('file');
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<File | null>(null);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser) {
      console.log('No current user found');
      return;
    }

    console.log('Fetching files for user:', currentUser.uid);
    const filesRef = collection(db, 'files');
    const q = query(
      filesRef,
      where('ownerId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        try {
          console.log('Received snapshot with', snapshot.docs.length, 'documents');
          
          if (snapshot.empty) {
            console.log('No files found for user');
            setFiles([]);
            setError('');
            return;
          }

          const filesData = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log('Processing document:', doc.id, data);
            return {
              id: doc.id,
              name: data.name,
              type: data.type,
              language: data.language,
              content: data.content,
              lastModified: data.lastModified ? data.lastModified.toDate() : new Date(),
              parentId: data.parentId,
              ownerId: data.ownerId,
              starred: data.starred || false,
              sharedWith: data.sharedWith || {}
            };
          });

          // Sort files by lastModified in memory instead of in the query
          const sortedFiles = filesData.sort((a, b) => 
            b.lastModified.getTime() - a.lastModified.getTime()
          );

          // Filter files based on current path
          const filteredFiles = sortedFiles.filter(file => {
            if (currentPath.length === 0) {
              return !file.parentId; // Root level files
            }
            return file.parentId === currentPath[currentPath.length - 1];
          });

          console.log('Filtered files:', filteredFiles);
          setFiles(filteredFiles);
          setError(''); // Clear any previous errors
        } catch (error) {
          console.error('Error processing files:', error);
          setError(`Failed to load files: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }, 
      (error) => {
        console.error('Error in files snapshot:', error);
        setError(`Failed to load files: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    );

    return () => {
      console.log('Cleaning up file listener');
      unsubscribe();
    };
  }, [currentUser, currentPath]);

  const getFileLanguage = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'txt': 'plaintext'
    };
    return languageMap[extension || ''] || 'plaintext';
  };

  const handleCreateFile = async () => {
    if (!currentUser || !newFileName.trim()) return;

    try {
      const fileRef = collection(db, 'files');
      await addDoc(fileRef, {
        name: newFileName,
        type: newFileType,
        content: newFileType === 'file' ? '' : null,
        lastModified: serverTimestamp(),
        ownerId: currentUser.uid,
        parentId: currentPath.length > 0 ? currentPath[currentPath.length - 1] : null,
        starred: false
      });
      setIsCreateDialogOpen(false);
      setNewFileName('');
    } catch (error) {
      console.error('Error creating file:', error);
      setError('Failed to create file');
    }
  };

  const getInitialContent = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const contentMap: { [key: string]: string } = {
      'py': '# Start coding here\n',
      'java': '// Start coding here\n',
      'c': '// Start coding here\n',
      'cpp': '// Start coding here\n',
      'cs': '// Start coding here\n',
      'html': '<!DOCTYPE html>\n<html>\n<head>\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>',
      'css': '/* Start styling here */\n',
      'js': '// Start coding here\n',
      'ts': '// Start coding here\n',
      'json': '{\n  \n}',
      'md': '# Start writing here\n',
      'txt': ''
    };
    return contentMap[extension || ''] || '// Start coding here\n';
  };

  const handleDeleteFile = async (file: File) => {
    if (!currentUser) return;

    try {
      await deleteDoc(doc(db, 'files', file.id));
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Failed to delete file');
    }
  };

  const handleRenameFile = async () => {
    if (!currentUser || !fileToRename || !newName.trim()) return;

    try {
      await updateDoc(doc(db, 'files', fileToRename.id), {
        name: newName
      });
      setIsRenameDialogOpen(false);
      setFileToRename(null);
      setNewName('');
    } catch (error) {
      console.error('Error renaming file:', error);
      setError('Failed to rename file');
    }
  };

  const handleNavigate = (path: string[]) => {
    setCurrentPath(path);
  };

  const handleFileClick = (file: File) => {
    if (file.type === 'folder') {
      setCurrentPath([...currentPath, file.id]);
    } else {
      navigate(`/editor/${file.id}`);
    }
  };

  const handleStar = async (file: File) => {
    if (!currentUser) return;

    try {
      const fileRef = doc(db, 'files', file.id);
      const newStarredState = !file.starred;
      
      await updateDoc(fileRef, {
        starred: newStarredState,
        lastModified: serverTimestamp()
      });
    } catch (error) {
      console.error('Error toggling star:', error);
      setError('Failed to toggle star');
    }
  };

  // Add error display with more details
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error" variant="h6" gutterBottom>
          Error Loading Files
        </Typography>
        <Typography color="error" variant="body2">
          {error}
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()} 
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  // Add loading state
  if (!files) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading files...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Breadcrumbs>
          <Link
            component="button"
            variant="body1"
            onClick={() => setCurrentPath([])}
            sx={{ color: 'var(--primary-text)' }}
          >
            Root
          </Link>
          {currentPath.map((folderId, index) => {
            const folder = files.find(f => f.id === folderId);
            return (
              <Link
                key={folderId}
                component="button"
                variant="body1"
                onClick={() => setCurrentPath(currentPath.slice(0, index + 1))}
                sx={{ color: 'var(--primary-text)' }}
              >
                {folder?.name || 'Unknown'}
              </Link>
            );
          })}
        </Breadcrumbs>
        <Box>
          <Button
            variant="contained"
            startIcon={<CreateNewFolderIcon />}
            onClick={() => {
              setNewFileType('folder');
              setIsCreateDialogOpen(true);
            }}
            sx={{ mr: 1 }}
          >
            New Folder
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setNewFileType('file');
              setIsCreateDialogOpen(true);
            }}
          >
            New File
          </Button>
        </Box>
      </Box>

      <FileGrid
        files={files}
        onFileClick={handleFileClick}
        onCreateFile={() => setIsCreateDialogOpen(true)}
        onDeleteFile={handleDeleteFile}
        onRenameFile={(file) => {
          setFileToRename(file);
          setNewName(file.name);
          setIsRenameDialogOpen(true);
        }}
        currentPath={currentPath}
        onNavigate={handleNavigate}
        onStar={handleStar}
      />

      <Dialog open={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)}>
        <DialogTitle>Create New {newFileType === 'file' ? 'File' : 'Folder'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateFile} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isRenameDialogOpen} onClose={() => setIsRenameDialogOpen(false)}>
        <DialogTitle>Rename {fileToRename?.type === 'file' ? 'File' : 'Folder'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Name"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsRenameDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRenameFile} variant="contained">Rename</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 