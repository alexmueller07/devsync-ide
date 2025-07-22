import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Box, Paper, Typography, IconButton, Tooltip, Avatar, AvatarGroup } from '@mui/material';
import { ContentCopy, Download, Share } from '@mui/icons-material';
import { collection, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  cursor?: {
    lineNumber: number;
    column: number;
  };
}

interface CodeEditorProps {
  value: string;
  language?: string;
  onChange?: (value: string | undefined) => void;
  readOnly?: boolean;
  fileName?: string;
  onShare?: () => void;
  fileId: string;
  currentUser: User;
}

export default function CodeEditor({ 
  value, 
  language = 'javascript',
  onChange,
  readOnly = false,
  fileName = 'untitled',
  onShare,
  fileId,
  currentUser
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const decorationsRef = useRef<string[]>([]);

  useEffect(() => {
    // Subscribe to active users in this file
    const unsubscribe = onSnapshot(
      collection(db, `files/${fileId}/activeUsers`),
      (snapshot) => {
        const users: User[] = [];
        snapshot.forEach((doc) => {
          const userData = doc.data() as User;
          if (userData.id !== currentUser.id) {
            users.push(userData);
          }
        });
        setActiveUsers(users);
      }
    );

    // Add current user to active users
    const userRef = doc(db, `files/${fileId}/activeUsers`, currentUser.id);
    const userData: any = {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      lastSeen: serverTimestamp()
    };
    
    // Only add photoURL if it exists
    if (currentUser.photoURL) {
      userData.photoURL = currentUser.photoURL;
    }

    // Check if document exists first
    getDoc(userRef).then((docSnap) => {
      if (docSnap.exists()) {
        // Update existing document
        updateDoc(userRef, {
          lastSeen: serverTimestamp()
        });
      } else {
        // Create new document
        setDoc(userRef, userData);
      }
    });

    return () => {
      unsubscribe();
      // Remove user from active users when component unmounts
      updateDoc(userRef, {
        lastSeen: serverTimestamp()
      }).catch(() => {
        // Ignore errors when removing user
      });
    };
  }, [fileId, currentUser]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;

    // Set up cursor position tracking
    editor.onDidChangeCursorPosition((e: any) => {
      const position = e.position;
      const userRef = doc(db, `files/${fileId}/activeUsers`, currentUser.id);
      updateDoc(userRef, {
        cursor: {
          lineNumber: position.lineNumber,
          column: position.column
        },
        lastSeen: serverTimestamp()
      }).catch(() => {
        // Ignore errors when updating cursor position
      });
    });

    // Remove cursor tracking on model content changes
    editor.onDidChangeModelContent(() => {
      // Don't update cursor position on content changes
    });
  };

  useEffect(() => {
    if (!editorRef.current) return;

    // Update cursor decorations for other users
    const decorations = activeUsers.map(user => ({
      range: {
        startLineNumber: user.cursor?.lineNumber || 1,
        startColumn: user.cursor?.column || 1,
        endLineNumber: user.cursor?.lineNumber || 1,
        endColumn: user.cursor?.column || 1
      },
      options: {
        className: `cursor-${user.id}`,
        hoverMessage: { value: user.name },
        before: {
          content: '👤',
          inlineClassName: 'cursor-avatar'
        }
      }
    }));

    decorationsRef.current = editorRef.current.deltaDecorations(
      decorationsRef.current,
      decorations
    );
  }, [activeUsers]);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
  };

  const handleDownload = () => {
    const blob = new Blob([value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 2,
        bgcolor: 'var(--primary-bg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-md)'
      }}
    >
      <Box 
        sx={{ 
          p: 1.5, 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          bgcolor: 'var(--surface-bg)'
        }}
      >
        <Typography 
          variant="subtitle1" 
          sx={{ 
            color: 'var(--primary-text)',
            fontFamily: 'Google Sans, Roboto, sans-serif',
            fontWeight: 500,
            fontSize: '0.95rem'
          }}
        >
          {fileName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AvatarGroup max={4} sx={{ mr: 1 }}>
            {activeUsers.map((user) => (
              <Tooltip key={user.id} title={user.name}>
                <Avatar
                  src={user.photoURL}
                  alt={user.name}
                  sx={{ width: 24, height: 24 }}
                >
                  {user.name[0]}
                </Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Copy code">
              <IconButton 
                onClick={handleCopy} 
                size="small" 
                sx={{ 
                  color: 'var(--secondary-text)',
                  '&:hover': {
                    backgroundColor: 'var(--hover-color)',
                    color: 'var(--primary-text)'
                  }
                }}
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download">
              <IconButton 
                onClick={handleDownload} 
                size="small" 
                sx={{ 
                  color: 'var(--secondary-text)',
                  '&:hover': {
                    backgroundColor: 'var(--hover-color)',
                    color: 'var(--primary-text)'
                  }
                }}
              >
                <Download fontSize="small" />
              </IconButton>
            </Tooltip>
            {onShare && (
              <Tooltip title="Share">
                <IconButton 
                  onClick={onShare} 
                  size="small" 
                  sx={{ 
                    color: 'var(--secondary-text)',
                    '&:hover': {
                      backgroundColor: 'var(--hover-color)',
                      color: 'var(--primary-text)'
                    }
                  }}
                >
                  <Share fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <Editor
          height="100%"
          defaultLanguage={language}
          language={language}
          value={value}
          onChange={onChange}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            wordWrap: 'on',
            readOnly,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            tabSize: 2,
            padding: { top: 16, bottom: 16 },
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true },
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            formatOnPaste: true,
            formatOnType: true,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              useShadows: false,
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10
            }
          }}
        />
      </Box>
      <style>
        {`
          .cursor-avatar {
            position: absolute;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 1000;
          }
          ${activeUsers.map(user => `
            .cursor-${user.id} {
              background-color: #00ff00;
              width: 2px !important;
              margin-left: -1px;
              animation: blink 1s step-end infinite;
            }
            @keyframes blink {
              0%, 100% { opacity: 1; }
              50% { opacity: 0; }
            }
          `).join('\n')}
        `}
      </style>
    </Paper>
  );
} 