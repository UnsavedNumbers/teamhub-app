/**
 * Demo Page Guides Registry
 * 
 * Central registry of contextual guides for every individual page/sub-item.
 * Each guide provides: what the page does, top actions, try this now, tips, and business value.
 */

import type { DemoAllowedRole } from '@/types/demoManagement'

/**
 * Page guide definition
 */
export interface PageGuide {
  /** Unique page identifier (e.g., 'portal-dashboard', 'admin-teams-list') */
  pageId: string
  /** What this page does (title) */
  title: string
  /** 3 most important actions on this page */
  topActions: string[]
  /** Suggested "Try this now" action */
  tryThisNow: string
  /** 2-3 practical tips */
  tips: string[]
  /** Short explanation of business value */
  businessValue: string
  /** Roles that can see this guide */
  roles: DemoAllowedRole[]
}

/**
 * All page guides organized by page ID
 */
export const pageGuides: Record<string, PageGuide> = {
  // ============================================================================
  // PORTAL PAGES - Guardian/Parent Role
  // ============================================================================
  'portal-dashboard': {
    pageId: 'portal-dashboard',
    title: 'Your Family Dashboard',
    topActions: [
      'View upcoming events for your athletes',
      'Check payment status and outstanding fees',
      'See recent team announcements and updates',
    ],
    tryThisNow: 'Click on an upcoming event to see details and RSVP',
    tips: [
      'Bookmark important events to find them quickly',
      'Use the filters to focus on specific athletes or teams',
      'Check the payment section regularly to avoid missed deadlines',
    ],
    businessValue: 'Stay organized and never miss an important event or payment deadline.',
    roles: ['parent'],
  },
  'portal-calendar': {
    pageId: 'portal-calendar',
    title: 'Events Calendar',
    topActions: [
      'View all upcoming events in calendar format',
      'Filter events by athlete, team, or event type',
      'Bookmark events you want to remember',
    ],
    tryThisNow: 'Click on any event to see full details and location',
    tips: [
      'Use the month/week/day views to see your schedule at different levels',
      'Bookmarked events appear in a separate list for quick access',
      'Event colors indicate different types (practices, games, etc.)',
    ],
    businessValue: 'See everything happening with your athletes in one organized calendar view.',
    roles: ['parent'],
  },
  'portal-bookmarkedEvents': {
    pageId: 'portal-bookmarkedEvents',
    title: 'My Bookmarked Events',
    topActions: [
      'View all events you\'ve saved',
      'Remove bookmarks you no longer need',
      'Quickly access important event details',
    ],
    tryThisNow: 'Click on a bookmarked event to view full details',
    tips: [
      'Bookmark important games or events you don\'t want to miss',
      'Bookmarked events are also shown on your dashboard',
      'You can bookmark events from the main calendar view',
    ],
    businessValue: 'Keep track of the events that matter most to you.',
    roles: ['parent'],
  },
  'portal-athletes': {
    pageId: 'portal-athletes',
    title: 'My Athletes',
    topActions: [
      'View athlete profiles and information',
      'See which teams each athlete is on',
      'Access athlete-specific schedules and events',
    ],
    tryThisNow: 'Click on an athlete to view their full profile',
    tips: [
      'Each athlete card shows their current teams and sports',
      'Click through to see athlete-specific events and information',
      'Update athlete information as needed',
    ],
    businessValue: 'Manage all your athletes\' information in one convenient place.',
    roles: ['parent'],
  },
  'portal-requestAttachment': {
    pageId: 'portal-requestAttachment',
    title: 'Request Athlete Attachment',
    topActions: [
      'Request to be linked to an existing athlete',
      'Provide your relationship to the athlete',
      'Submit the request for approval',
    ],
    tryThisNow: 'Fill out the form to request attachment to an athlete',
    tips: [
      'You\'ll need the athlete\'s information to make the request',
      'Requests are reviewed by organization administrators',
      'You\'ll be notified once your request is approved or denied',
    ],
    businessValue: 'Get connected to your athlete\'s account when you\'re not already linked.',
    roles: ['parent'],
  },
  'portal-myTickets': {
    pageId: 'portal-myTickets',
    title: 'My Tickets',
    topActions: [
      'View all tickets you\'ve purchased',
      'Access ticket QR codes for entry',
      'See upcoming events you have tickets for',
    ],
    tryThisNow: 'Click on a ticket to view the QR code and event details',
    tips: [
      'Ticket QR codes are available on your phone for easy entry',
      'You can resend tickets to your email if needed',
      'Past events show your ticket history',
    ],
    businessValue: 'Never forget your tickets - access them anytime from your phone.',
    roles: ['parent'],
  },
  'portal-payments': {
    pageId: 'portal-payments',
    title: 'Payment History',
    topActions: [
      'View outstanding fees and amounts due',
      'See your payment history',
      'Make payments securely online',
    ],
    tryThisNow: 'Click on an outstanding fee to make a payment',
    tips: [
      'Outstanding fees are highlighted at the top',
      'Payment history shows all past transactions',
      'You can set up payment reminders for important fees',
    ],
    businessValue: 'Stay on top of fees and make payments quickly and securely.',
    roles: ['parent'],
  },
  'portal-uniforms': {
    pageId: 'portal-uniforms',
    title: 'Uniform Orders',
    topActions: [
      'View available uniform kits',
      'Place orders for your athletes',
      'Track order status and delivery',
    ],
    tryThisNow: 'Browse available uniform kits and place an order',
    tips: [
      'Uniform sizes are based on your athlete\'s profile information',
      'Orders are processed through your organization',
      'You\'ll receive updates on order status',
    ],
    businessValue: 'Order uniforms easily without coordinating with coaches or administrators.',
    roles: ['parent'],
  },
  'portal-messages': {
    pageId: 'portal-messages',
    title: 'Huddles - Team Communication',
    topActions: [
      'Read team announcements and updates',
      'Participate in team discussions',
      'Stay informed about important news',
    ],
    tryThisNow: 'Read the latest team announcements',
    tips: [
      'Important announcements are pinned at the top',
      'You can reply to announcements and participate in discussions',
      'Notifications alert you to new messages',
    ],
    businessValue: 'Stay connected with coaches and other parents through organized team communication.',
    roles: ['parent'],
  },
  'portal-following': {
    pageId: 'portal-following',
    title: 'Followed Organizations',
    topActions: [
      'View organizations you follow',
      'See updates from followed organizations',
      'Unfollow organizations you no longer need',
    ],
    tryThisNow: 'Browse organizations you\'re following',
    tips: [
      'Following an organization keeps you updated on their public events',
      'You can follow multiple organizations',
      'Updates appear in your dashboard',
    ],
    businessValue: 'Stay connected with organizations and teams you care about.',
    roles: ['parent'],
  },
  'portal-discoverOrgs': {
    pageId: 'portal-discoverOrgs',
    title: 'Browse Organizations',
    topActions: [
      'Discover new organizations and teams',
      'View public organization information',
      'Follow organizations you\'re interested in',
    ],
    tryThisNow: 'Search for organizations by name or location',
    tips: [
      'Use filters to find organizations by sport or location',
      'Public organizations show their upcoming events',
      'Following an organization gives you access to their public updates',
    ],
    businessValue: 'Find and connect with organizations and teams in your area.',
    roles: ['parent'],
  },
  'portal-join': {
    pageId: 'portal-join',
    title: 'Join a Team',
    topActions: [
      'Enter an invite code to join a team',
      'Request access to an organization',
      'Connect with teams your athlete wants to join',
    ],
    tryThisNow: 'Enter an invite code if you have one',
    tips: [
      'Invite codes are provided by coaches or administrators',
      'You can request access if you don\'t have a code',
      'Once joined, you\'ll have access to team information and events',
    ],
    businessValue: 'Easily join teams and organizations using invite codes.',
    roles: ['parent'],
  },
  'portal-photos': {
    pageId: 'portal-photos',
    title: 'Team Photos',
    topActions: [
      'Browse team photo galleries',
      'View and download photos',
      'See photos your athletes are tagged in',
    ],
    tryThisNow: 'Click on a gallery to view photos',
    tips: [
      'Photos are organized by gallery and team',
      'You can download photos you like',
      'Athletes are tagged in photos for easy searching',
    ],
    businessValue: 'Preserve and share team memories with organized photo galleries.',
    roles: ['parent'],
  },
  'portal-videos': {
    pageId: 'portal-videos',
    title: 'Video Library',
    topActions: [
      'Watch team and athlete videos',
      'View game highlights and recordings',
      'Access coaching feedback videos',
    ],
    tryThisNow: 'Click on a video to watch it',
    tips: [
      'Videos are organized by team and event',
      'You can download videos for offline viewing',
      'Coaching feedback videos help athletes improve',
    ],
    businessValue: 'Watch game highlights and coaching feedback to support your athlete\'s development.',
    roles: ['parent'],
  },
  'portal-tryouts': {
    pageId: 'portal-tryouts',
    title: 'Tryouts',
    topActions: [
      'View upcoming tryout sessions',
      'Register athletes for tryouts',
      'See tryout results and evaluations',
    ],
    tryThisNow: 'Browse available tryout sessions',
    tips: [
      'Tryout sessions are scheduled by your organization',
      'Register early to secure a spot',
      'Results and evaluations are posted after tryouts',
    ],
    businessValue: 'Manage tryout registration and results in one place.',
    roles: ['parent'],
  },
  'portal-settings': {
    pageId: 'portal-settings',
    title: 'Settings',
    topActions: [
      'Update your account information',
      'Manage notification preferences',
      'Configure account security settings',
    ],
    tryThisNow: 'Review and update your account settings',
    tips: [
      'Keep your contact information up to date',
      'Configure notifications to stay informed',
      'Update your password regularly for security',
    ],
    businessValue: 'Keep your account secure and ensure you receive important updates.',
    roles: ['parent'],
  },
  'portal-help': {
    pageId: 'portal-help',
    title: 'Help & Support',
    topActions: [
      'Browse help articles and guides',
      'Search for answers to common questions',
      'Access support resources',
    ],
    tryThisNow: 'Search for help on a topic you need assistance with',
    tips: [
      'Use the search to find specific topics',
      'Help articles are organized by category',
      'Contact support if you can\'t find what you need',
    ],
    businessValue: 'Get help when you need it with comprehensive support resources.',
    roles: ['parent'],
  },
  'portal-contact': {
    pageId: 'portal-contact',
    title: 'Contact Support',
    topActions: [
      'Submit a support request',
      'Get help with account issues',
      'Report problems or provide feedback',
    ],
    tryThisNow: 'Fill out the contact form to get help',
    tips: [
      'Include as much detail as possible in your request',
      'Support typically responds within 24 hours',
      'Check the help center first for common questions',
    ],
    businessValue: 'Get personalized help when you need it.',
    roles: ['parent'],
  },

  // ============================================================================
  // PORTAL PAGES - Athlete Role
  // ============================================================================
  'portal-dashboard-athlete': {
    pageId: 'portal-dashboard-athlete',
    title: 'My Dashboard',
    topActions: [
      'View your upcoming events and schedule',
      'See team announcements',
      'Check your team information',
    ],
    tryThisNow: 'Click on an upcoming event to see details',
    tips: [
      'Your dashboard shows everything happening with your teams',
      'Important announcements appear at the top',
      'Use filters to focus on specific teams or sports',
    ],
    businessValue: 'Stay organized and never miss a practice or game.',
    roles: ['athlete'],
  },
  'portal-calendar-athlete': {
    pageId: 'portal-calendar-athlete',
    title: 'My Events',
    topActions: [
      'View your schedule in calendar format',
      'See all practices, games, and events',
      'Bookmark important events',
    ],
    tryThisNow: 'Click on an event to see full details',
    tips: [
      'Events are color-coded by type',
      'Bookmark events you don\'t want to miss',
      'Check the calendar regularly for schedule updates',
    ],
    businessValue: 'Keep track of your schedule and stay prepared.',
    roles: ['athlete'],
  },
  'portal-bookmarkedEvents-athlete': {
    pageId: 'portal-bookmarkedEvents-athlete',
    title: 'My Bookmarks',
    topActions: [
      'View events you\'ve saved',
      'Quickly access important dates',
      'Remove bookmarks you no longer need',
    ],
    tryThisNow: 'Click on a bookmarked event to view details',
    tips: [
      'Bookmark important games or events',
      'Bookmarked events also appear on your dashboard',
      'You can bookmark from the main calendar',
    ],
    businessValue: 'Keep track of the events that matter most to you.',
    roles: ['athlete'],
  },
  'portal-athletes-athlete': {
    pageId: 'portal-athletes-athlete',
    title: 'My Team',
    topActions: [
      'View your team roster',
      'See teammates and their information',
      'Check team details and information',
    ],
    tryThisNow: 'Browse your team roster to see teammates',
    tips: [
      'Team rosters show all athletes on your teams',
      'You can see basic information about teammates',
      'Team information includes coaches and contact details',
    ],
    businessValue: 'Stay connected with your team and teammates.',
    roles: ['athlete'],
  },
  'portal-myTickets-athlete': {
    pageId: 'portal-myTickets-athlete',
    title: 'My Tickets',
    topActions: [
      'View tickets you have for events',
      'Access ticket QR codes',
      'See upcoming events you\'re attending',
    ],
    tryThisNow: 'Click on a ticket to view the QR code',
    tips: [
      'Tickets are available on your phone for easy entry',
      'QR codes are scanned at event entry',
      'You can view ticket details anytime',
    ],
    businessValue: 'Never forget your tickets - access them from your phone.',
    roles: ['athlete'],
  },
  'portal-payments-athlete': {
    pageId: 'portal-payments-athlete',
    title: 'Payment History',
    topActions: [
      'View fees assigned to you',
      'See payment history',
      'Check outstanding balances',
    ],
    tryThisNow: 'Review fees and payment history',
    tips: [
      'Outstanding fees are shown at the top',
      'Payment history shows all past transactions',
      'Your guardian manages payments for you',
    ],
    businessValue: 'See what fees are assigned and track payment status.',
    roles: ['athlete'],
  },
  'portal-messages-athlete': {
    pageId: 'portal-messages-athlete',
    title: 'Announcements',
    topActions: [
      'Read team announcements',
      'Stay updated on team news',
      'See important updates from coaches',
    ],
    tryThisNow: 'Read the latest team announcements',
    tips: [
      'Important announcements are pinned',
      'Check regularly for updates',
      'Announcements include schedule changes and important news',
    ],
    businessValue: 'Never miss important team news or updates.',
    roles: ['athlete'],
  },
  'portal-photos-athlete': {
    pageId: 'portal-photos-athlete',
    title: 'Photos',
    topActions: [
      'Browse team photo galleries',
      'View photos you\'re tagged in',
      'Download photos you like',
    ],
    tryThisNow: 'Click on a gallery to view photos',
    tips: [
      'Photos are organized by team and event',
      'You can see photos where you\'re tagged',
      'Download photos to keep memories',
    ],
    businessValue: 'View and save team photos and memories.',
    roles: ['athlete'],
  },
  'portal-videos-athlete': {
    pageId: 'portal-videos-athlete',
    title: 'Video Library',
    topActions: [
      'Watch team and game videos',
      'View game highlights',
      'Access coaching feedback videos',
    ],
    tryThisNow: 'Click on a video to watch it',
    tips: [
      'Videos are organized by team and event',
      'Game highlights show key moments',
      'Coaching feedback helps you improve',
    ],
    businessValue: 'Watch game highlights and learn from coaching feedback.',
    roles: ['athlete'],
  },
  'portal-settings-athlete': {
    pageId: 'portal-settings-athlete',
    title: 'Settings',
    topActions: [
      'Update your account information',
      'Manage notification preferences',
      'Configure privacy settings',
    ],
    tryThisNow: 'Review and update your settings',
    tips: [
      'Keep your information up to date',
      'Configure notifications to stay informed',
      'Privacy settings control who can see your information',
    ],
    businessValue: 'Keep your account secure and control your privacy.',
    roles: ['athlete'],
  },
  'portal-help-athlete': {
    pageId: 'portal-help-athlete',
    title: 'Help & Support',
    topActions: [
      'Browse help articles',
      'Search for answers',
      'Access support resources',
    ],
    tryThisNow: 'Search for help on a topic',
    tips: [
      'Use search to find specific topics',
      'Help articles cover common questions',
      'Contact support if you need more help',
    ],
    businessValue: 'Get help when you need it.',
    roles: ['athlete'],
  },
  'portal-contact-athlete': {
    pageId: 'portal-contact-athlete',
    title: 'Contact Support',
    topActions: [
      'Submit a support request',
      'Get help with your account',
      'Report issues or provide feedback',
    ],
    tryThisNow: 'Fill out the contact form',
    tips: [
      'Include details about your question or issue',
      'Support responds within 24 hours',
      'Check help articles first for common questions',
    ],
    businessValue: 'Get personalized help when you need it.',
    roles: ['athlete'],
  },

  // ============================================================================
  // PORTAL PAGES - Coach Role
  // ============================================================================
  'portal-dashboard-coach': {
    pageId: 'portal-dashboard-coach',
    title: 'Coach Dashboard',
    topActions: [
      'View today\'s schedule and upcoming events',
      'See team rosters and athlete information',
      'Check recent announcements and updates',
    ],
    tryThisNow: 'Review today\'s schedule and upcoming events',
    tips: [
      'Your dashboard shows everything happening with your teams',
      'Important updates appear at the top',
      'Use filters to focus on specific teams',
    ],
    businessValue: 'Start each day knowing exactly what\'s happening with your teams.',
    roles: ['coach'],
  },
  'portal-athletes-coach': {
    pageId: 'portal-athletes-coach',
    title: 'My Athletes',
    topActions: [
      'View athlete profiles and information',
      'Access contact information for athletes and parents',
      'See team rosters',
    ],
    tryThisNow: 'Click on an athlete to view their profile',
    tips: [
      'Athlete profiles include contact information',
      'You can see which teams each athlete is on',
      'Parent contact information is available for communication',
    ],
    businessValue: 'Quickly find athlete information when you need it.',
    roles: ['coach'],
  },
  'portal-calendar-coach': {
    pageId: 'portal-calendar-coach',
    title: 'Schedule',
    topActions: [
      'View team schedules and events',
      'See practices, games, and other events',
      'Check event details and locations',
    ],
    tryThisNow: 'Click on an event to see full details',
    tips: [
      'Events are organized by team and date',
      'Use filters to focus on specific teams',
      'Event details include location and participants',
    ],
    businessValue: 'Keep your schedule organized and ensure you never miss an event.',
    roles: ['coach'],
  },
  'portal-photos-coach': {
    pageId: 'portal-photos-coach',
    title: 'Photos',
    topActions: [
      'Browse team photo galleries',
      'View and manage team photos',
      'Tag athletes in photos',
    ],
    tryThisNow: 'Click on a gallery to view photos',
    tips: [
      'Photos are organized by team and event',
      'You can tag athletes in photos',
      'Share galleries with parents and athletes',
    ],
    businessValue: 'Preserve and share team memories with organized photo galleries.',
    roles: ['coach'],
  },
  'portal-tryouts-coach': {
    pageId: 'portal-tryouts-coach',
    title: 'Tryouts',
    topActions: [
      'View tryout sessions and registrations',
      'Evaluate athletes during tryouts',
      'Manage tryout results',
    ],
    tryThisNow: 'Browse tryout sessions and registrations',
    tips: [
      'Tryout sessions are scheduled by administrators',
      'You can evaluate athletes and record results',
      'Results are shared with athletes and parents',
    ],
    businessValue: 'Manage tryout registration and evaluation efficiently.',
    roles: ['coach'],
  },
  'portal-travel-coach': {
    pageId: 'portal-travel-coach',
    title: 'Travel',
    topActions: [
      'View team travel plans',
      'See trip details and itineraries',
      'Access travel information',
    ],
    tryThisNow: 'Click on a travel plan to see details',
    tips: [
      'Travel plans include itineraries and details',
      'You can see which athletes are traveling',
      'Travel information is shared with parents',
    ],
    businessValue: 'Stay organized with team travel plans and details.',
    roles: ['coach'],
  },
  'portal-messages-coach': {
    pageId: 'portal-messages-coach',
    title: 'Messages',
    topActions: [
      'Read and send team announcements',
      'Communicate with parents and athletes',
      'Stay updated on team news',
    ],
    tryThisNow: 'Read team announcements and messages',
    tips: [
      'You can send announcements to your teams',
      'Messages are organized by team',
      'Important announcements are pinned',
    ],
    businessValue: 'Communicate effectively with your teams and parents.',
    roles: ['coach'],
  },
  'portal-settings-coach': {
    pageId: 'portal-settings-coach',
    title: 'Settings',
    topActions: [
      'Update your account information',
      'Manage notification preferences',
      'Configure account settings',
    ],
    tryThisNow: 'Review and update your settings',
    tips: [
      'Keep your contact information up to date',
      'Configure notifications for important updates',
      'Update your password regularly',
    ],
    businessValue: 'Keep your account secure and ensure you receive important updates.',
    roles: ['coach'],
  },

  // ============================================================================
  // ADMIN PAGES - Org Admin/Coach Role
  // ============================================================================
  'admin-dashboard': {
    pageId: 'admin-dashboard',
    title: 'Admin Dashboard',
    topActions: [
      'View organization overview and key metrics',
      'See recent activity and updates',
      'Monitor payment status and outstanding fees',
    ],
    tryThisNow: 'Review the organization overview and key metrics',
    tips: [
      'The dashboard shows a snapshot of your organization\'s activity',
      'Key metrics help you understand what\'s happening',
      'Recent activity shows the latest updates',
    ],
    businessValue: 'Stay informed about your organization\'s operations at a glance.',
    roles: ['org_admin', 'coach'],
  },
  'admin-organization-structure': {
    pageId: 'admin-organization-structure',
    title: 'Organization Overview',
    topActions: [
      'View organization structure and hierarchy',
      'See sports, programs, levels, teams, and seasons',
      'Understand your organization\'s setup',
    ],
    tryThisNow: 'Explore your organization\'s structure',
    tips: [
      'The overview shows your complete organization hierarchy',
      'You can navigate to specific sections from here',
      'This is a great place to understand your organization\'s setup',
    ],
    businessValue: 'Get a complete view of your organization\'s structure and hierarchy.',
    roles: ['org_admin'],
  },
  'admin-sports-list': {
    pageId: 'admin-sports-list',
    title: 'Sports',
    topActions: [
      'View all sports in your organization',
      'Configure sport-specific settings',
      'Manage sports and their details',
    ],
    tryThisNow: 'Click on a sport to view and configure its settings',
    tips: [
      'Sports are the foundation of your organization structure',
      'Each sport can have multiple programs and levels',
      'Configure sport-specific fields and settings',
    ],
    businessValue: 'Organize your programs by sport and configure sport-specific settings.',
    roles: ['org_admin'],
  },
  'admin-programs-list': {
    pageId: 'admin-programs-list',
    title: 'Programs',
    topActions: [
      'View and manage programs within sports',
      'Create new programs',
      'Configure program settings',
    ],
    tryThisNow: 'Browse programs and create a new one',
    tips: [
      'Programs organize teams within a sport',
      'Each program can have multiple levels and teams',
      'Programs help organize large organizations',
    ],
    businessValue: 'Organize teams into logical programs for better management.',
    roles: ['org_admin'],
  },
  'admin-levels-list': {
    pageId: 'admin-levels-list',
    title: 'Levels',
    topActions: [
      'View and manage levels within programs',
      'Create new levels',
      'Configure level settings',
    ],
    tryThisNow: 'Browse levels and create a new one',
    tips: [
      'Levels organize teams by skill or age within programs',
      'Each level can have multiple teams',
      'Levels help organize competition divisions',
    ],
    businessValue: 'Organize teams by skill level or age group for proper competition.',
    roles: ['org_admin'],
  },
  'admin-teams-list': {
    pageId: 'admin-teams-list',
    title: 'Teams',
    topActions: [
      'View and manage all teams',
      'Create new teams',
      'Manage team rosters and assignments',
    ],
    tryThisNow: 'Click on a team to view its roster and details',
    tips: [
      'Teams are the core of your organization',
      'Each team has a roster of athletes',
      'Teams can be assigned to seasons and events',
    ],
    businessValue: 'Manage all your teams and rosters in one place.',
    roles: ['org_admin', 'coach'],
  },
  'admin-seasons-list': {
    pageId: 'admin-seasons-list',
    title: 'Seasons',
    topActions: [
      'View and manage seasons',
      'Create new seasons',
      'Assign teams to seasons',
    ],
    tryThisNow: 'Browse seasons and create a new one',
    tips: [
      'Seasons organize teams and events by time period',
      'Teams are assigned to seasons',
      'Events are associated with seasons',
    ],
    businessValue: 'Organize your teams and events by season for better management.',
    roles: ['org_admin'],
  },
  'admin-organization-users': {
    pageId: 'admin-organization-users',
    title: 'Users',
    topActions: [
      'View organization members and their roles',
      'Manage user access and permissions',
      'Invite new users to your organization',
    ],
    tryThisNow: 'Review organization members and their roles',
    tips: [
      'Users can have different roles (admin, coach, staff)',
      'You can invite new users via email',
      'Manage permissions and access for each user',
    ],
    businessValue: 'Control who has access to your organization and what they can do.',
    roles: ['org_admin'],
  },
  'admin-organization-subOrgs': {
    pageId: 'admin-organization-subOrgs',
    title: 'Sub-Organizations',
    topActions: [
      'View and manage sub-organizations',
      'Create new sub-organizations',
      'Configure sub-organization settings',
    ],
    tryThisNow: 'Browse sub-organizations and create a new one',
    tips: [
      'Sub-organizations are useful for large organizations',
      'Each sub-org can have its own teams and structure',
      'Billing is handled by the parent organization',
    ],
    businessValue: 'Organize large organizations into manageable sub-organizations.',
    roles: ['org_admin'],
  },
  'admin-organization-billing': {
    pageId: 'admin-organization-billing',
    title: 'Billing',
    topActions: [
      'View billing information and subscription',
      'Manage payment methods',
      'Update subscription plan',
    ],
    tryThisNow: 'Review your billing and subscription details',
    tips: [
      'Billing is handled securely through Stripe',
      'You can update your plan at any time',
      'Payment methods are stored securely',
    ],
    businessValue: 'Manage your subscription and billing easily.',
    roles: ['org_admin'],
  },
  'admin-athletes-list': {
    pageId: 'admin-athletes-list',
    title: 'Athletes',
    topActions: [
      'View all athletes in your organization',
      'Add new athletes',
      'Manage athlete profiles and information',
    ],
    tryThisNow: 'Click on an athlete to view their profile',
    tips: [
      'Athlete profiles include contact information and details',
      'You can search and filter athletes',
      'Athletes can be assigned to multiple teams',
    ],
    businessValue: 'Maintain complete athlete information and manage rosters efficiently.',
    roles: ['org_admin', 'coach'],
  },
  'admin-guardians-list': {
    pageId: 'admin-guardians-list',
    title: 'Guardians',
    topActions: [
      'View all guardians in your organization',
      'See guardian contact information',
      'Manage guardian accounts',
    ],
    tryThisNow: 'Browse guardians and view their information',
    tips: [
      'Guardians are linked to athletes',
      'You can see which athletes each guardian is connected to',
      'Contact information is available for communication',
    ],
    businessValue: 'Manage guardian accounts and maintain contact information.',
    roles: ['org_admin'],
  },
  'admin-guardianRequests': {
    pageId: 'admin-guardianRequests',
    title: 'Guardian Requests',
    topActions: [
      'Review guardian attachment requests',
      'Approve or deny requests',
      'Manage guardian-athlete relationships',
    ],
    tryThisNow: 'Review pending guardian requests',
    tips: [
      'Guardians request to be linked to athletes',
      'You can approve or deny requests',
      'Approved guardians get access to athlete information',
    ],
    businessValue: 'Control guardian access and maintain proper athlete-guardian relationships.',
    roles: ['org_admin'],
  },
  'admin-ticketingEvents': {
    pageId: 'admin-ticketingEvents',
    title: 'Ticketed Events',
    topActions: [
      'Create ticketed events for games and competitions',
      'Configure ticket pricing and availability',
      'Manage event details and settings',
    ],
    tryThisNow: 'Create a new ticketed event',
    tips: [
      'Ticketed events allow you to sell tickets',
      'You can set pricing and availability',
      'Seat maps can be configured for assigned seating',
    ],
    businessValue: 'Monetize your events and simplify ticket sales.',
    roles: ['org_admin'],
  },
  'admin-ticketingEvents-seatMaps': {
    pageId: 'admin-ticketingEvents-seatMaps',
    title: 'Seat Maps',
    topActions: [
      'Create and manage seat maps for events',
      'Configure seating sections and pricing',
      'Assign seats to ticket purchases',
    ],
    tryThisNow: 'Create a seat map for an event',
    tips: [
      'Seat maps allow assigned seating for events',
      'You can create multiple sections with different pricing',
      'Seats are assigned automatically when tickets are purchased',
    ],
    businessValue: 'Offer assigned seating and maximize revenue with section-based pricing.',
    roles: ['org_admin'],
  },
  'admin-ticketingOrders': {
    pageId: 'admin-ticketingOrders',
    title: 'Orders',
    topActions: [
      'View all ticket orders',
      'Process refunds',
      'Search and manage orders',
    ],
    tryThisNow: 'Browse ticket orders and search for specific orders',
    tips: [
      'Orders show all ticket purchases',
      'You can process refunds if needed',
      'Search by customer name, email, or order ID',
    ],
    businessValue: 'Manage ticket sales and handle customer service efficiently.',
    roles: ['org_admin'],
  },
  'admin-ticketingScanner': {
    pageId: 'admin-ticketingScanner',
    title: 'Gate Entry',
    topActions: [
      'Scan ticket QR codes at event entry',
      'Validate tickets and grant access',
      'Track entry and attendance',
    ],
    tryThisNow: 'Use the scanner to validate tickets',
    tips: [
      'QR codes are scanned from customer phones',
      'Valid tickets grant immediate access',
      'Entry is tracked for attendance purposes',
    ],
    businessValue: 'Streamline event entry and prevent unauthorized access.',
    roles: ['org_admin'],
  },
  'admin-payments-list': {
    pageId: 'admin-payments-list',
    title: 'Payments',
    topActions: [
      'View all payments and outstanding fees',
      'Assign fees to athletes',
      'Process refunds and manage payments',
    ],
    tryThisNow: 'Review payments and assign fees',
    tips: [
      'Fees can be assigned to individual athletes or teams',
      'Payment status is tracked automatically',
      'You can process refunds when needed',
    ],
    businessValue: 'Streamline payment processing and reduce administrative time.',
    roles: ['org_admin'],
  },
  'admin-photos-list': {
    pageId: 'admin-photos-list',
    title: 'All Galleries',
    topActions: [
      'View all photo galleries',
      'Create new galleries',
      'Manage gallery settings and permissions',
    ],
    tryThisNow: 'Browse galleries and create a new one',
    tips: [
      'Galleries are organized by team and event',
      'You can control who can view each gallery',
      'Photos can be tagged with athletes',
    ],
    businessValue: 'Organize and share team photos with parents and athletes.',
    roles: ['org_admin', 'coach'],
  },
  'admin-photos-create': {
    pageId: 'admin-photos-create',
    title: 'New Gallery',
    topActions: [
      'Create a new photo gallery',
      'Configure gallery settings',
      'Upload photos to the gallery',
    ],
    tryThisNow: 'Create a gallery and upload photos',
    tips: [
      'Galleries can be associated with teams or events',
      'Set permissions to control who can view',
      'Upload multiple photos at once',
    ],
    businessValue: 'Create and share photo galleries quickly and easily.',
    roles: ['org_admin', 'coach'],
  },
  'admin-videos-list': {
    pageId: 'admin-videos-list',
    title: 'Video Library',
    topActions: [
      'View all team and athlete videos',
      'Upload new videos',
      'Manage video settings and permissions',
    ],
    tryThisNow: 'Browse videos and upload a new one',
    tips: [
      'Videos are organized by team and event',
      'You can set permissions for each video',
      'Videos can be shared with parents and athletes',
    ],
    businessValue: 'Share game highlights and coaching feedback through organized video libraries.',
    roles: ['org_admin', 'coach'],
  },
  'admin-videos-upload': {
    pageId: 'admin-videos-upload',
    title: 'Upload Video',
    topActions: [
      'Upload a new video',
      'Configure video settings',
      'Associate video with teams or events',
    ],
    tryThisNow: 'Upload a video and configure its settings',
    tips: [
      'Videos can be associated with specific teams or events',
      'Set permissions to control who can view',
      'Large videos may take time to process',
    ],
    businessValue: 'Share game footage and coaching feedback with your teams.',
    roles: ['org_admin', 'coach'],
  },
  'admin-events-list': {
    pageId: 'admin-events-list',
    title: 'Events',
    topActions: [
      'Create and manage events',
      'Schedule practices, games, and other events',
      'Send notifications to participants',
    ],
    tryThisNow: 'Create a new event',
    tips: [
      'Events can be practices, games, or other activities',
      'You can set up recurring events',
      'Notifications are sent automatically to participants',
    ],
    businessValue: 'Eliminate scheduling conflicts and ensure everyone knows when and where to be.',
    roles: ['org_admin', 'coach'],
  },
  'admin-attendance': {
    pageId: 'admin-attendance',
    title: 'Attendance',
    topActions: [
      'Take attendance at events',
      'View attendance history',
      'Track athlete participation',
    ],
    tryThisNow: 'Take attendance for an event',
    tips: [
      'Attendance is taken at events',
      'You can mark athletes as present, absent, or excused',
      'Attendance history helps track participation',
    ],
    businessValue: 'Track athlete participation and identify attendance patterns.',
    roles: ['org_admin', 'coach'],
  },
  'admin-notifications': {
    pageId: 'admin-notifications',
    title: 'Notifications',
    topActions: [
      'View notification settings',
      'Configure notification preferences',
      'Manage notification delivery',
    ],
    tryThisNow: 'Review and configure notification settings',
    tips: [
      'Notifications keep users informed about important updates',
      'You can configure what triggers notifications',
      'Notifications are sent via email and in-app',
    ],
    businessValue: 'Keep your organization informed with automated notifications.',
    roles: ['org_admin'],
  },
  'admin-announcements-list': {
    pageId: 'admin-announcements-list',
    title: 'Announcements',
    topActions: [
      'Create and send announcements',
      'Manage announcement delivery',
      'View announcement history',
    ],
    tryThisNow: 'Create a new announcement',
    tips: [
      'Announcements can be sent to specific teams or all members',
      'Important announcements can be pinned',
      'You can schedule announcements for later delivery',
    ],
    businessValue: 'Communicate important information to your organization efficiently.',
    roles: ['org_admin', 'coach'],
  },
  'admin-travel-list': {
    pageId: 'admin-travel-list',
    title: 'Travel',
    topActions: [
      'Create and manage travel plans',
      'Share trip details with participants',
      'Track travel arrangements',
    ],
    tryThisNow: 'Create a travel plan for a trip',
    tips: [
      'Travel plans include itineraries and details',
      'You can share plans with athletes and parents',
      'Travel information helps coordinate trips',
    ],
    businessValue: 'Organize team travel and share details with participants.',
    roles: ['org_admin', 'coach'],
  },
  'admin-uniforms-list': {
    pageId: 'admin-uniforms-list',
    title: 'Uniforms',
    topActions: [
      'Create uniform kits',
      'Manage uniform orders',
      'Track order fulfillment',
    ],
    tryThisNow: 'Create a uniform kit and manage orders',
    tips: [
      'Uniform kits define what\'s included in an order',
      'Parents can order uniforms through the portal',
      'You can track order status and fulfillment',
    ],
    businessValue: 'Simplify uniform ordering and reduce administrative coordination.',
    roles: ['org_admin'],
  },
  'admin-settings': {
    pageId: 'admin-settings',
    title: 'Settings',
    topActions: [
      'Update your account information',
      'Manage notification preferences',
      'Configure account security',
    ],
    tryThisNow: 'Review and update your account settings',
    tips: [
      'Keep your contact information up to date',
      'Configure notifications for important updates',
      'Update your password regularly for security',
    ],
    businessValue: 'Keep your account secure and ensure you receive important updates.',
    roles: ['org_admin', 'coach'],
  },
  'admin-help': {
    pageId: 'admin-help',
    title: 'Help & Support',
    topActions: [
      'Browse help articles',
      'Search for answers',
      'Access support resources',
    ],
    tryThisNow: 'Search for help on a topic',
    tips: [
      'Use search to find specific topics',
      'Help articles cover common questions',
      'Contact support if you need more help',
    ],
    businessValue: 'Get help when you need it with comprehensive support resources.',
    roles: ['org_admin', 'coach'],
  },
  'admin-contact': {
    pageId: 'admin-contact',
    title: 'Contact Support',
    topActions: [
      'Submit a support request',
      'Get help with your account',
      'Report issues or provide feedback',
    ],
    tryThisNow: 'Fill out the contact form',
    tips: [
      'Include details about your question or issue',
      'Support responds within 24 hours',
      'Check help articles first for common questions',
    ],
    businessValue: 'Get personalized help when you need it.',
    roles: ['org_admin', 'coach'],
  },
}

/**
 * Get a page guide by page ID
 */
export function getPageGuide(pageId: string): PageGuide | undefined {
  return pageGuides[pageId]
}

/**
 * Get all page guides for a specific role
 */
export function getPageGuidesForRole(role: DemoAllowedRole): PageGuide[] {
  return Object.values(pageGuides).filter(guide => guide.roles.includes(role))
}

/**
 * Check if a page has a guide
 */
export function hasPageGuide(pageId: string): boolean {
  return pageId in pageGuides
}
