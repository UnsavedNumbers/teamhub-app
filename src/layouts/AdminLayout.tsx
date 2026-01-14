import { useState } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Groups as TeamsIcon,
  People as PeopleIcon,
  FamilyRestroom as FamiliesIcon,
  ChildCare as ChildrenIcon,
  Payment as PaymentsIcon,
  Event as EventsIcon,
  Checkroom as UniformsIcon,
  Flight as TravelIcon,
  EmojiEvents as TryoutsIcon,
  Message as MessagesIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material'
import { useAuth } from '../hooks/useAuth'
import { useOrganization } from '../contexts/OrganizationContext'

const drawerWidth = 280

// Navigation menu items based on ADMIN_PANEL_STRUCTURE.txt
const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin' },
  { text: 'Organization', icon: <SettingsIcon />, path: '/admin/organization' },
  { text: 'Teams', icon: <TeamsIcon />, path: '/admin/teams' },
  { text: 'Families', icon: <FamiliesIcon />, path: '/admin/families' },
  { text: 'Children', icon: <ChildrenIcon />, path: '/admin/children' },
  { text: 'Payments', icon: <PaymentsIcon />, path: '/admin/payments' },
  { text: 'Events', icon: <EventsIcon />, path: '/admin/events' },
  { text: 'Attendance', icon: <PeopleIcon />, path: '/admin/attendance' },
  { text: 'Uniforms', icon: <UniformsIcon />, path: '/admin/uniforms' },
  { text: 'Travel', icon: <TravelIcon />, path: '/admin/travel' },
  { text: 'Tryouts', icon: <TryoutsIcon />, path: '/admin/tryouts' },
  { text: 'Messages', icon: <MessagesIcon />, path: '/admin/messages' },
  { text: 'Reports', icon: <ReportsIcon />, path: '/admin/reports' },
]

export default function AdminLayout() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const drawer = (
    <Box>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: [1],
        }}
      >
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
          Admin Panel
        </Typography>
        {isMobile && (
          <IconButton onClick={handleDrawerToggle}>
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/admin' && location.pathname.startsWith(item.path))
          
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={isActive}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark,
                    },
                    '& .MuiListItemIcon-root': {
                      color: theme.palette.primary.contrastText,
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? theme.palette.primary.contrastText : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: '#ffffff',
          color: theme.palette.text.primary,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {currentOrganization?.name || profile?.display_name || 'Admin'}
          </Typography>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              View Main Site
            </Typography>
          </Link>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          backgroundColor: theme.palette.background.default,
          minHeight: '100vh',
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        <Outlet /> {/* Child routes render here */}
      </Box>
    </Box>
  )
}
