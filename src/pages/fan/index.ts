/**
 * Fan Pages Index
 * 
 * Central export for all fan-facing pages
 */

// Main Pages
export { default as FanHome } from './FanHome'
export { default as FanSchedule } from './FanSchedule'
export { default as FanTickets, FanTicketDetail } from './FanTickets'
export { default as FanPhotos, FanGalleryDetail, FanAthletePhotos } from './FanPhotos'
export { default as FanFollowing } from './FanFollowing'
export { 
  default as FanProfile, 
  FanProfileEdit, 
  FanProfileNotifications,
  FanProfileLinkedAthletes,
  FanProfilePrivacy,
} from './FanProfile'

// Entity Profiles
export { default as FanOrgProfile } from './FanOrgProfile'
export { default as FanTeamProfile } from './FanTeamProfile'
export { default as FanAthleteProfile } from './FanAthleteProfile'

// Layout
export { default as FanLayout } from '../../components/fan/FanLayout'
