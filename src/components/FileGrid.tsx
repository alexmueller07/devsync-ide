import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Tooltip
} from '@mui/material';
import type { GridProps } from '@mui/material/Grid';
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  MoreVert as MoreVertIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  ContentCopy as ContentCopyIcon,
  NavigateNext as NavigateNextIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import ShareDialog from './ShareDialog';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
  starred?: boolean;
  sharedWith?: {
    [userId: string]: {
      email: string;
      permission: 'editor' | 'viewer';
    }
  };
}

interface FileGridProps {
  files: File[];
  onFileClick: (file: File) => void;
  onCreateFile: (type: 'file' | 'folder') => void;
  onDeleteFile: (file: File) => void;
  onRenameFile: (file: File) => void;
  currentPath: string[];
  onNavigate: (path: string[]) => void;
  readOnly?: boolean;
  onStar?: (file: File) => void;
}

export default function FileGrid({
  files,
  onFileClick,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  currentPath,
  onNavigate,
  readOnly = false,
  onStar
}: FileGridProps) {
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, file: File) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setSelectedFile(file);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleStar = async (file: File) => {
    try {
      const fileRef = doc(db, 'files', file.id);
      const newStarredState = !file.starred;
      
      // Update the local state immediately for better UX
      const updatedFile = { ...file, starred: newStarredState };
      const updatedFiles = files.map(f => f.id === file.id ? updatedFile : f);
      
      // Update Firestore
      await updateDoc(fileRef, {
        starred: newStarredState,
        lastModified: serverTimestamp()
      });
    } catch (error) {
      console.error('Error toggling star:', error);
      // Revert the local state if the update fails
      const updatedFiles = files.map(f => f.id === file.id ? { ...f, starred: !f.starred } : f);
    }
  };

  const handleShare = (file: File) => {
    setSelectedFile(file);
    setIsShareDialogOpen(true);
    handleMenuClose();
  };

  const handleDownload = (file: File) => {
    if (file.type === 'file' && file.content) {
      const blob = new Blob([file.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleCopy = (file: File) => {
    if (file.type === 'file' && file.content) {
      navigator.clipboard.writeText(file.content);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'folder') {
      return <FolderIcon sx={{ color: 'var(--accent-color)', fontSize: 32 }} />;
    }
    return <FileIcon sx={{ color: 'var(--accent-color)', fontSize: 32 }} />;
  };

  const detectLanguage = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'jsx': 'React',
      'tsx': 'React',
      'py': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'cs': 'C#',
      'html': 'HTML',
      'css': 'CSS',
      'json': 'JSON',
      'md': 'Markdown',
      'php': 'PHP',
      'rb': 'Ruby',
      'go': 'Go',
      'rs': 'Rust',
      'swift': 'Swift',
      'kt': 'Kotlin',
      'scala': 'Scala',
      'sql': 'SQL',
      'sh': 'Shell',
      'yml': 'YAML',
      'yaml': 'YAML',
      'xml': 'XML'
    };
    return languageMap[extension || ''] || 'Text';
  };

  const getFileTypeColor = (file: File) => {
    const colors: { [key: string]: string } = {
      javascript: '#f7df1e',
      typescript: '#3178c6',
      python: '#3776ab',
      java: '#007396',
      cpp: '#00599c',
      csharp: '#68217a',
      html: '#e34c26',
      css: '#264de4',
      default: '#5f6368'
    };
    return colors[file.language?.toLowerCase() || ''] || colors.default;
  };

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
        {files.map((file) => (
          <Card
            key={file.id}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              backgroundColor: 'var(--surface-bg)',
              border: '1px solid var(--border-color)',
              '&:hover': {
                borderColor: 'var(--accent-color)'
              }
            }}
          >
            <CardActionArea 
              onClick={() => onFileClick(file)}
              sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'stretch',
                '&:hover': {
                  backgroundColor: 'var(--hover-color)'
                }
              }}
            >
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                {file.type === 'folder' ? (
                  <FolderIcon sx={{ color: 'var(--accent-color)', fontSize: 32 }} />
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: '120px',
                      backgroundColor: 'var(--primary-bg)',
                      borderRadius: '4px',
                      p: 1,
                      overflow: 'hidden',
                      position: 'relative',
                      border: '1px solid var(--border-color)',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '40px',
                        background: 'linear-gradient(transparent, var(--primary-bg))',
                      }
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'var(--primary-text)',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all'
                      }}
                    >
                      {file.content || ''}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: '100%',
                  mt: 1,
                  gap: 1
                }}>
                  {file.type === 'file' && (
                    <Chip
                      label={detectLanguage(file.name)}
                      size="small"
                      sx={{
                        backgroundColor: getFileTypeColor(file),
                        color: 'white',
                        fontSize: '0.75rem',
                        height: '20px'
                      }}
                    />
                  )}
                  {onStar && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStar(file);
                      }}
                      sx={{ 
                        color: file.starred ? 'var(--accent-color)' : 'var(--secondary-text)',
                        '&:hover': {
                          color: 'var(--accent-color)'
                        }
                      }}
                    >
                      {file.starred ? <StarIcon /> : <StarBorderIcon />}
                    </IconButton>
                  )}
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: 'var(--primary-text)',
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}
                  >
                    {file.name}
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'var(--secondary-text)',
                    textAlign: 'center'
                  }}
                >
                  {format(file.lastModified, 'MMM d, yyyy')}
                </Typography>
              </CardContent>
            </CardActionArea>
            <Box sx={{ 
              p: 1, 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: 1,
              borderTop: '1px solid var(--border-color)'
            }}>
              {!readOnly && (
                <>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(file);
                    }}
                    sx={{ 
                      color: 'var(--secondary-text)',
                      '&:hover': {
                        backgroundColor: 'var(--hover-color)'
                      }
                    }}
                  >
                    <ShareIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, file)}
                    sx={{ 
                      color: 'var(--secondary-text)',
                      '&:hover': {
                        backgroundColor: 'var(--hover-color)'
                      }
                    }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Box>
          </Card>
        ))}
      </Box>
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: 'var(--surface-bg)',
            color: 'var(--primary-text)',
            mt: 1,
            '& .MuiMenuItem-root': {
              color: 'var(--primary-text)',
              '&:hover': {
                backgroundColor: 'var(--hover-color)'
              }
            }
          }
        }}
      >
        {selectedFile && (
          <>
            <MenuItem onClick={() => {
              handleMenuClose();
              onRenameFile(selectedFile);
            }}>
              <ListItemIcon>
                <EditIcon sx={{ color: 'var(--primary-text)' }} />
              </ListItemIcon>
              <ListItemText>Rename</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => {
              handleMenuClose();
              handleShare(selectedFile);
            }}>
              <ListItemIcon>
                <ShareIcon sx={{ color: 'var(--primary-text)' }} />
              </ListItemIcon>
              <ListItemText>Share</ListItemText>
            </MenuItem>
            {selectedFile.type === 'file' && (
              <>
                <MenuItem onClick={() => {
                  handleMenuClose();
                  handleDownload(selectedFile);
                }}>
                  <ListItemIcon>
                    <DownloadIcon sx={{ color: 'var(--primary-text)' }} />
                  </ListItemIcon>
                  <ListItemText>Download</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => {
                  handleMenuClose();
                  handleCopy(selectedFile);
                }}>
                  <ListItemIcon>
                    <ContentCopyIcon sx={{ color: 'var(--primary-text)' }} />
                  </ListItemIcon>
                  <ListItemText>Copy content</ListItemText>
                </MenuItem>
              </>
            )}
            <Divider sx={{ my: 1, borderColor: 'var(--border-color)' }} />
            <MenuItem 
              onClick={() => {
                handleMenuClose();
                onDeleteFile(selectedFile);
              }}
              sx={{ color: 'var(--error-color)' }}
            >
              <ListItemIcon>
                <DeleteIcon sx={{ color: 'var(--error-color)' }} />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
      {selectedFile && (
        <ShareDialog
          open={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
          file={selectedFile}
        />
      )}
    </>
  );
} 