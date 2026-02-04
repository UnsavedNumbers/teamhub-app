/**
 * EntityCard Component
 * 
 * Reusable card component for displaying entities (orgs, teams, athletes)
 * in discovery and following lists
 */

import { useNavigate } from 'react-router-dom'
import FollowButton from './FollowButton'
import { getLink, RouteKeys } from '../../utils/routes'

interface BaseEntity {
  id: string
  name: string
  isFollowing: boolean
}

interface OrgEntity extends BaseEntity {
  type: 'org'
  slug?: string
  location_city?: string
  location_state?: string
  description?: string
}

interface TeamEntity extends BaseEntity {
  type: 'team'
  sport?: string
  parent_org_name?: string
  season?: string
}

interface AthleteEntity extends BaseEntity {
  type: 'athlete'
  jersey_number?: string
  position?: string
  parent_org_name?: string
  current_teams?: string[]
}

type EntityCardProps = OrgEntity | TeamEntity | AthleteEntity

export default function EntityCard(props: EntityCardProps & { 
  onFollowChange?: (isFollowing: boolean) => void 
  showFollowButton?: boolean
}) {
  const navigate = useNavigate()
  const { onFollowChange, showFollowButton = true } = props

  const handleCardClick = () => {
    if (props.type === 'org') {
      navigate(getLink(RouteKeys.FAN_ORG_PROFILE, { orgId: props.id }))
    } else if (props.type === 'team') {
      navigate(getLink(RouteKeys.FAN_TEAM_PROFILE, { teamId: props.id }))
    } else if (props.type === 'athlete') {
      navigate(getLink(RouteKeys.FAN_ATHLETE_PROFILE, { athleteId: props.id }))
    }
  }

  const getEntityIcon = () => {
    switch (props.type) {
      case 'org':
        return 'apartment'
      case 'team':
        return 'groups'
      case 'athlete':
        return 'person'
    }
  }

  const getEntitySubtitle = () => {
    if (props.type === 'org') {
      const parts = []
      if (props.location_city) parts.push(props.location_city)
      if (props.location_state) parts.push(props.location_state)
      return parts.join(', ') || 'Organization'
    } else if (props.type === 'team') {
      const parts = []
      if (props.sport) parts.push(props.sport)
      if (props.parent_org_name) parts.push(props.parent_org_name)
      return parts.join(' • ') || 'Team'
    } else if (props.type === 'athlete') {
      const parts = []
      if (props.jersey_number) parts.push(`#${props.jersey_number}`)
      if (props.position) parts.push(props.position)
      if (props.parent_org_name) parts.push(props.parent_org_name)
      return parts.join(' • ') || 'Athlete'
    }
    return ''
  }

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 p-4 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="material-symbols-rounded text-indigo-600 text-2xl">
              {getEntityIcon()}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {props.name}
            </h3>
            <p className="text-sm text-gray-600 truncate mt-0.5">
              {getEntitySubtitle()}
            </p>

            {/* Description (org only) */}
            {props.type === 'org' && props.description && (
              <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                {props.description}
              </p>
            )}

            {/* Teams (athlete only) */}
            {props.type === 'athlete' && props.current_teams && props.current_teams.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {props.current_teams.slice(0, 3).map((team, idx) => (
                  <span 
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                  >
                    {team}
                  </span>
                ))}
                {props.current_teams.length > 3 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    +{props.current_teams.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Follow Button */}
        {showFollowButton && (
          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <FollowButton
              orgId={props.id}
              isFollowing={props.isFollowing}
              onToggle={onFollowChange}
              variant="compact"
            />
          </div>
        )}
      </div>
    </div>
  )
}
