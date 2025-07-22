import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, or, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Box, Typography, Breadcrumbs, Link, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
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
      userId?: string;
    }
  };
}

export default function SharedFiles() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<'file' | 'folder'>('file');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser) return;

    const filesRef = collection(db, 'files');
    // Get all files and filter them in memory
    const q = query(filesRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const filesData: File[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const sharedWith = data.sharedWith || {};
        
        // Check if the file is shared with the current user
        const isShared = Object.entries(sharedWith).some(([key, value]) => {
          const shareData = value as { email: string; permission: 'editor' | 'viewer'; userId?: string };
          return shareData.email === currentUser.email || key === currentUser.uid;
        });
        
        if (isShared) {
          filesData.push({
            id: doc.id,
            name: data.name,
            type: data.type,
            language: data.language,
            content: data.content,
            lastModified: data.lastModified?.toDate() || new Date(),
            parentId: data.parentId,
            ownerId: data.ownerId,
            sharedWith: data.sharedWith
          });
        }
      });
      setFiles(filesData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleFileClick = (file: File) => {
    if (file.type === 'folder') {
      setCurrentPath([...currentPath, file.id]);
    } else {
      navigate(`/editor/${file.id}`);
    }
  };

  const handleNavigate = (path: string[]) => {
    setCurrentPath(path);
  };

  const handleDeleteFile = async (file: File) => {
    if (!currentUser) return;

    try {
      const fileRef = doc(db, 'files', file.id);
      await updateDoc(fileRef, {
        deleted: true
      });
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleRenameFile = async (file: File) => {
    // Implement rename functionality if needed
    console.log('Rename file:', file);
  };

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

  const handleCreateFile = async () => {
    if (!currentUser || !newFileName.trim()) return;

    try {
      // Get the current folder's shared permissions
      const currentFolderId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;
      const currentFolder = files.find(f => f.id === currentFolderId);
      
      const fileData = {
        name: newFileName,
        type: newFileType,
        language: newFileType === 'file' ? getFileLanguage(newFileName) : undefined,
        content: newFileType === 'file' ? getInitialContent(newFileName) : undefined,
        lastModified: serverTimestamp(),
        parentId: currentFolderId,
        ownerId: currentUser.uid,
        starred: false,
        sharedWith: currentFolder?.sharedWith || {}
      };

      // Remove undefined fields for folders
      if (newFileType === 'folder') {
        delete fileData.language;
        delete fileData.content;
      }

      await addDoc(collection(db, 'files'), fileData);
      setIsCreateDialogOpen(false);
      setNewFileName('');
      setNewFileType('file');
    } catch (error) {
      console.error('Error creating file:', error);
      setError('Failed to create file');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Breadcrumbs>
          <Link
            component="button"
            variant="body1"
            onClick={() => setCurrentPath([])}
            sx={{ color: 'text.primary', textDecoration: 'none' }}
          >
            Shared with me
          </Link>
          {currentPath.map((folderId, index) => {
            const folder = files.find(f => f.id === folderId);
            return (
              <Link
                key={folderId}
                component="button"
                variant="body1"
                onClick={() => setCurrentPath(currentPath.slice(0, index + 1))}
                sx={{ color: 'text.primary', textDecoration: 'none' }}
              >
                {folder?.name || 'Folder'}
              </Link>
            );
          })}
        </Breadcrumbs>
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setNewFileType('file');
              setIsCreateDialogOpen(true);
            }}
            sx={{ mr: 1 }}
          >
            New File
          </Button>
          <Button
            variant="outlined"
            startIcon={<CreateNewFolderIcon />}
            onClick={() => {
              setNewFileType('folder');
              setIsCreateDialogOpen(true);
            }}
          >
            New Folder
          </Button>
        </Box>
      </Box>

      <FileGrid
        files={files.filter(file => 
          file.parentId === (currentPath.length > 0 ? currentPath[currentPath.length - 1] : null)
        )}
        onFileClick={handleFileClick}
        onCreateFile={(type) => {
          setNewFileType(type);
          setIsCreateDialogOpen(true);
        }}
        onDeleteFile={handleDeleteFile}
        onRenameFile={handleRenameFile}
        currentPath={currentPath}
        onNavigate={handleNavigate}
        readOnly={false}
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
    </Box>
  );
} 