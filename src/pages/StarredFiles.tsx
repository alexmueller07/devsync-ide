import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Box, Typography } from '@mui/material';
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

export default function StarredFiles() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const filesRef = collection(db, 'files');
    const q = query(
      filesRef,
      where('ownerId', '==', currentUser.uid),
      where('starred', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const filesData: File[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        filesData.push({
          id: doc.id,
          name: data.name,
          type: data.type,
          language: data.language,
          content: data.content,
          lastModified: data.lastModified?.toDate() || new Date(),
          parentId: data.parentId,
          ownerId: data.ownerId,
          starred: data.starred,
          sharedWith: data.sharedWith
        });
      });
      setFiles(filesData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleFileClick = (file: File) => {
    if (file.type === 'folder') {
      navigate('/editor', { state: { folderId: file.id } });
    } else {
      navigate(`/editor/${file.id}`);
    }
  };

  const handleStar = async (file: File) => {
    try {
      const fileRef = doc(db, 'files', file.id);
      await updateDoc(fileRef, {
        starred: !file.starred,
        lastModified: serverTimestamp()
      });
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Starred Files</Typography>
      <FileGrid
        files={files}
        onFileClick={handleFileClick}
        onCreateFile={() => {}}
        onDeleteFile={() => {}}
        onRenameFile={() => {}}
        currentPath={[]}
        onNavigate={() => {}}
        readOnly={false}
        onStar={handleStar}
      />
    </Box>
  );
} 