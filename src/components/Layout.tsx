import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Drawer, 
  List, 
  ListItemButton, 
  ListItemText, 
  Typography, 
  Button, 
  Divider,
  AppBar,
  Toolbar,
  IconButton,
  InputBase,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  CircularProgress
} from '@mui/material';
import { 
  Add as AddIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Folder as FolderIcon,
  Share as ShareIcon,
  AccessTime as AccessTimeIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  GitHub as GitHubIcon,
  LinkedIn as LinkedInIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { styled, alpha } from '@mui/material/styles';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  getDocs,
  DocumentData,
  doc,
  updateDoc
} from 'firebase/firestore';
import FileGrid from './FileGrid';
import { format } from 'date-fns';
import CodeEditor from './CodeEditor';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';

interface FileData {
  name: string;
  type: 'file' | 'folder';
  language?: string;
  content?: string;
  lastModified: any;
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

interface Notification {
  id: string;
  userId: string;
  fileId: string;
  fileName: string;
  sharedBy: string;
  permission: 'editor' | 'viewer';
  timestamp: Date;
  read: boolean;
}

interface LayoutProps {
  children: React.ReactNode;
}

const DRAWER_WIDTH = 280;

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: 'var(--surface-bg)',
  '&:hover': {
    backgroundColor: 'var(--hover-color)',
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '40ch',
    },
  },
}));

export default function Layout({ children }: LayoutProps) {
  const { currentUser, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<File[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentFiles, setRecentFiles] = useState<File[]>([]);
  const [starredFiles, setStarredFiles] = useState<File[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<'file' | 'folder'>('file');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState<HTMLElement | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sharedFiles, setSharedFiles] = useState<File[]>([]);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    console.log('Setting up file listeners for user:', currentUser.uid);

    // Fetch recent files
    const recentQuery = query(
      collection(db, 'files'),
      where('ownerId', '==', currentUser.uid),
      orderBy('lastModified', 'desc')
    );

    const recentUnsubscribe = onSnapshot(recentQuery, (snapshot) => {
      const files = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        lastModified: doc.data().lastModified?.toDate() || new Date()
      })) as File[];
      console.log('Recent files updated:', files.length);
      setRecentFiles(files);
    }, (error) => {
      console.error('Error fetching recent files:', error);
    });

    // Fetch starred files
    const starredQuery = query(
      collection(db, 'files'),
      where('ownerId', '==', currentUser.uid),
      where('starred', '==', true)
    );

    const starredUnsubscribe = onSnapshot(starredQuery, (snapshot) => {
      const files = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        lastModified: doc.data().lastModified?.toDate() || new Date()
      })) as File[];
      console.log('Starred files updated:', files.length);
      setStarredFiles(files);
    }, (error) => {
      console.error('Error fetching starred files:', error);
    });

    // Fetch shared files
    const sharedQuery = query(
      collection(db, 'files')
    );

    const sharedUnsubscribe = onSnapshot(sharedQuery, (snapshot) => {
      const files = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            type: data.type,
            language: data.language,
            content: data.content,
            lastModified: data.lastModified?.toDate() || new Date(),
            parentId: data.parentId,
            ownerId: data.ownerId,
            starred: data.starred || false,
            sharedWith: data.sharedWith || {}
          } as File;
        })
        .filter(file => {
          const sharedWith = file.sharedWith || {};
          return Object.entries(sharedWith).some(([key, value]) => {
            const shareData = value as { email: string; permission: 'editor' | 'viewer' };
            return key === currentUser.uid || shareData.email === currentUser.email;
          });
        });
      console.log('Shared files updated:', files.length);
      setSharedFiles(files);
    }, (error) => {
      console.error('Error fetching shared files:', error);
    });

    // Fetch notifications
    const notificationsRef = collection(db, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc')
    );

    const notificationsUnsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId as string,
          fileId: data.fileId as string,
          fileName: data.fileName as string,
          sharedBy: data.sharedBy as string,
          permission: data.permission as 'editor' | 'viewer',
          timestamp: data.timestamp?.toDate() || new Date(),
          read: data.read as boolean || false
        } satisfies Notification;
      });
      setNotifications(notificationsData);
    });

    // Cleanup function
    return () => {
      console.log('Cleaning up file listeners');
      recentUnsubscribe();
      starredUnsubscribe();
      sharedUnsubscribe();
      notificationsUnsubscribe();
    };
  }, [currentUser]);

  const handleNewFile = () => {
    navigate('/editor');
    // Trigger the new file dialog in the parent component
    if (window.location.pathname.includes('/editor')) {
      window.location.reload();
    }
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
        parentId: null,
        starred: false
      });
      setIsCreateDialogOpen(false);
      setNewFileName('');
    } catch (error) {
      console.error('Error creating file:', error);
    }
  };

  const handleSearch = async (searchText: string) => {
    if (!currentUser || !searchText.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const filesRef = collection(db, 'files');
      const searchQuery = query(
        filesRef,
        where('ownerId', '==', currentUser.uid)
      );

      const querySnapshot = await getDocs(searchQuery);
      const results = querySnapshot.docs
        .map(doc => {
          const data = doc.data() as DocumentData;
          return {
            id: doc.id,
            name: data.name,
            type: data.type,
            language: data.language,
            content: data.content,
            lastModified: data.lastModified?.toDate() || new Date(),
            parentId: data.parentId,
            ownerId: data.ownerId,
            starred: data.starred || false,
            sharedWith: data.sharedWith
          } as File;
        })
        .filter(file => 
          file.name.toLowerCase().includes(searchText.toLowerCase()) ||
          (file.content && file.content.toLowerCase().includes(searchText.toLowerCase()))
        );

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching files:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark notification as read
      const notificationRef = doc(db, 'notifications', notification.id);
      await updateDoc(notificationRef, {
        read: true
      });

      // Navigate to the shared file
      navigate(`/editor/${notification.fileId}`);
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  };

  const renderDrawerContent = () => (
    <Box sx={{ overflow: 'auto' }}>
      <List>
        <ListItemButton onClick={() => navigate('/files')}>
          <ListItemIcon>
            <FolderIcon sx={{ color: isDarkMode ? '#ffffff' : '#202124' }} />
          </ListItemIcon>
          <ListItemText primary="My Files" />
        </ListItemButton>
        <ListItemButton onClick={() => navigate('/starred')}>
          <ListItemIcon>
            <StarIcon sx={{ color: isDarkMode ? '#ffffff' : '#202124' }} />
          </ListItemIcon>
          <ListItemText primary="Starred" />
        </ListItemButton>
        <ListItemButton onClick={() => navigate('/shared')}>
          <ListItemIcon>
            <ShareIcon sx={{ color: isDarkMode ? '#ffffff' : '#202124' }} />
          </ListItemIcon>
          <ListItemText primary="Shared with me" />
        </ListItemButton>
        <ListItemButton onClick={() => navigate('/recent')}>
          <ListItemIcon>
            <AccessTimeIcon sx={{ color: isDarkMode ? '#ffffff' : '#202124' }} />
          </ListItemIcon>
          <ListItemText primary="Recent" />
        </ListItemButton>
      </List>
    </Box>
  );

  const renderNotifications = () => (
    <Box sx={{ width: 320, maxHeight: 400, overflow: 'auto' }}>
      {notifications.length === 0 ? (
        <Typography sx={{ p: 2, textAlign: 'center' }}>
          No notifications
        </Typography>
      ) : (
        notifications.map((notification) => (
          <MenuItem
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              p: 2,
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: notification.read ? 'inherit' : 'var(--hover-color)',
              '&:hover': {
                backgroundColor: 'var(--hover-color)'
              }
            }}
          >
            <Typography variant="subtitle2" sx={{ color: 'var(--primary-text)' }}>
              {notification.sharedBy} shared "{notification.fileName}" with you
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--secondary-text)' }}>
              {format(notification.timestamp, 'MMM d, yyyy h:mm a')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--secondary-text)' }}>
              Permission: {notification.permission}
            </Typography>
          </MenuItem>
        ))
      )}
    </Box>
  );

  const renderEditor = (file: File) => {
    if (!currentUser) return null;
    
    return (
      <CodeEditor
        value={file.content || ''}
        language={file.language}
        onChange={(value) => {
          const fileRef = doc(db, 'files', file.id);
          updateDoc(fileRef, {
            content: value,
            lastModified: serverTimestamp()
          });
        }}
        fileName={file.name}
        fileId={file.id}
        currentUser={{
          id: currentUser.uid,
          name: currentUser.displayName || 'Anonymous',
          email: currentUser.email || '',
          photoURL: currentUser.photoURL || undefined
        }}
        onShare={() => {
          // Handle share functionality
        }}
      />
    );
  };

  const handleSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'var(--primary-bg)' }}>
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'var(--secondary-bg)',
          color: 'var(--primary-text)',
          boxShadow: 'var(--shadow-sm)',
          borderBottom: '1px solid var(--border-color)'
        }}
      >
        <Toolbar>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <Box
              sx={{
                position: 'relative',
                borderRadius: 1,
                backgroundColor: 'var(--surface-bg)',
                '&:hover': {
                  backgroundColor: 'var(--hover-color)',
                },
                width: '100%',
                maxWidth: 600,
              }}
            >
              <Box
                sx={{
                  padding: '0 16px',
                  height: '100%',
                  position: 'absolute',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SearchIcon sx={{ color: 'var(--secondary-text)' }} />
              </Box>
              <InputBase
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                sx={{
                  color: 'var(--primary-text)',
                  width: '100%',
                  '& .MuiInputBase-input': {
                    padding: '8px 8px 8px 48px',
                    width: '100%',
                  },
                }}
              />
            </Box>
          </Box>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 3,
            mx: 4,
            color: 'var(--secondary-text)'
          }}>
            <Typography variant="body2">
              Created By: Alexander Mueller
            </Typography>
            <Tooltip title="GitHub">
              <IconButton
                component="a"
                href="https://github.com/alexmueller07"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: 'var(--secondary-text)', '&:hover': { color: 'var(--accent-color)' } }}
              >
                <GitHubIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="LinkedIn">
              <IconButton
                component="a"
                href="https://www.linkedin.com/in/alexander-mueller-021658307/"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: 'var(--secondary-text)', '&:hover': { color: 'var(--accent-color)' } }}
              >
                <LinkedInIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Email: amueller.code@gmail.com">
              <IconButton
                component="a"
                href="mailto:amueller.code@gmail.com"
                sx={{ color: 'var(--secondary-text)', '&:hover': { color: 'var(--accent-color)' } }}
              >
                <EmailIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Notifications">
              <IconButton
                color="inherit"
                onClick={(e: React.MouseEvent<HTMLElement>) => setNotificationsAnchorEl(e.currentTarget)}
                sx={{ ml: 1 }}
              >
                <Badge badgeContent={notifications.filter(n => !n.read).length} color="error">
                  <NotificationsIcon sx={{ color: isDarkMode ? '#ffffff' : '#202124' }} />
                </Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton onClick={handleSettingsClick}>
                <SettingsIcon sx={{ color: isDarkMode ? '#ffffff' : '#202124' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Profile">
              <IconButton
                color="inherit"
                onClick={() => setIsProfileOpen(true)}
                sx={{ color: 'var(--primary-text)' }}
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'var(--accent-color)' }}>
                  {currentUser?.email?.[0].toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            backgroundColor: 'var(--primary-bg)',
            borderRight: '1px solid var(--border-color)',
            color: 'var(--primary-text)'
          },
        }}
      >
        <Toolbar />
        {renderDrawerContent()}
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: '64px',
          backgroundColor: 'var(--primary-bg)'
        }}
      >
        {children}
      </Box>
      <Dialog open={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)}>
        <DialogTitle>Create New</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Type</InputLabel>
            <Select
              value={newFileType}
              label="Type"
              onChange={(e) => setNewFileType(e.target.value as 'file' | 'folder')}
            >
              <MenuItem value="file">File</MenuItem>
              <MenuItem value="folder">Folder</MenuItem>
            </Select>
          </FormControl>
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
      {searchQuery && (
        <Box
          sx={{
            position: 'fixed',
            top: '64px',
            left: DRAWER_WIDTH,
            right: 0,
            bottom: 0,
            backgroundColor: 'var(--primary-bg)',
            zIndex: (theme) => theme.zIndex.drawer,
            p: 3,
            overflow: 'auto'
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Search Results for "{searchQuery}"
          </Typography>
          {isSearching ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : searchResults.length > 0 ? (
            <FileGrid
              files={searchResults}
              onFileClick={(file: File) => {
                navigate(`/editor/${file.id}`);
                setSearchQuery('');
              }}
              onCreateFile={() => {}}
              onDeleteFile={() => {}}
              onRenameFile={() => {}}
              currentPath={[]}
              onNavigate={() => {}}
              readOnly={true}
            />
          ) : (
            <Typography variant="body1" sx={{ color: 'var(--secondary-text)' }}>
              No files found matching your search.
            </Typography>
          )}
        </Box>
      )}
      <Dialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ color: 'var(--secondary-text)' }}>
            Settings will be available soon.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={notificationsAnchorEl}
        open={Boolean(notificationsAnchorEl)}
        onClose={() => setNotificationsAnchorEl(null)}
        PaperProps={{
          sx: {
            mt: 1.5,
            maxHeight: 400,
            width: 320,
            backgroundColor: 'var(--surface-bg)',
            color: 'var(--primary-text)',
            '& .MuiMenuItem-root': {
              color: 'var(--primary-text)',
              '&:hover': {
                backgroundColor: 'var(--hover-color)'
              }
            }
          }
        }}
      >
        {renderNotifications()}
      </Menu>

      <Dialog
        open={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Profile</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 }}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: 'var(--accent-color)', fontSize: '2rem' }}>
              {currentUser?.email?.[0].toUpperCase()}
            </Avatar>
            <Typography variant="h6">{currentUser?.email}</Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsProfileOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            boxShadow: '0 2px 10px 0 rgba(0,0,0,0.1)',
            borderRadius: '8px'
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ color: 'var(--secondary-text)' }}>
            Theme
          </Typography>
          <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />
        </Box>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </MenuItem>
      </Menu>
    </Box>
  );
} 