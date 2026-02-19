import type { SportCode } from '@/types/sports'

export interface SportProfile {
  levels: string[]
  programNames: string[]
  rosterMin: number
  rosterMax: number
  baseFeeCents: number
}

export const SPORT_PROFILES: Record<SportCode, SportProfile> = {
  baseball: { levels: ['U8', 'U10', 'U12'], programNames: ['Rec Baseball'], rosterMin: 10, rosterMax: 14, baseFeeCents: 12000 },
  basketball: { levels: ['U10', 'U12', 'U14'], programNames: ['Rec Basketball', 'Competitive Basketball'], rosterMin: 8, rosterMax: 12, baseFeeCents: 12500 },
  cheerleading: { levels: ['Junior', 'Varsity'], programNames: ['Sideline Cheer'], rosterMin: 8, rosterMax: 14, baseFeeCents: 9000 },
  cross_country: { levels: ['Middle School', 'High School'], programNames: ['Cross Country'], rosterMin: 8, rosterMax: 20, baseFeeCents: 8500 },
  dance: { levels: ['Junior', 'Senior'], programNames: ['Dance Team'], rosterMin: 8, rosterMax: 16, baseFeeCents: 9500 },
  diving: { levels: ['Beginner', 'Advanced'], programNames: ['Diving Club'], rosterMin: 6, rosterMax: 12, baseFeeCents: 11000 },
  field_hockey: { levels: ['U12', 'U14'], programNames: ['Field Hockey'], rosterMin: 10, rosterMax: 16, baseFeeCents: 11500 },
  flag_football: { levels: ['U8', 'U10', 'U12'], programNames: ['Flag Football'], rosterMin: 8, rosterMax: 12, baseFeeCents: 10000 },
  football: { levels: ['U10', 'U12', 'U14'], programNames: ['Tackle Football'], rosterMin: 16, rosterMax: 24, baseFeeCents: 16000 },
  golf: { levels: ['Beginner', 'Intermediate'], programNames: ['Junior Golf'], rosterMin: 6, rosterMax: 12, baseFeeCents: 9800 },
  gymnastics: { levels: ['Level 1', 'Level 2'], programNames: ['Gymnastics'], rosterMin: 8, rosterMax: 14, baseFeeCents: 13000 },
  ice_hockey: { levels: ['U10', 'U12', 'U14'], programNames: ['Ice Hockey'], rosterMin: 10, rosterMax: 18, baseFeeCents: 17500 },
  lacrosse: { levels: ['U10', 'U12', 'U14'], programNames: ['Lacrosse'], rosterMin: 10, rosterMax: 16, baseFeeCents: 13000 },
  soccer: { levels: ['U8', 'U10', 'U12', 'U14'], programNames: ['Rec Soccer', 'Competitive Soccer'], rosterMin: 10, rosterMax: 18, baseFeeCents: 13500 },
  softball: { levels: ['U10', 'U12', 'U14'], programNames: ['Softball'], rosterMin: 10, rosterMax: 15, baseFeeCents: 12000 },
  swimming: { levels: ['Beginner', 'Intermediate', 'Advanced'], programNames: ['Swim Team'], rosterMin: 10, rosterMax: 24, baseFeeCents: 14500 },
  tennis: { levels: ['Beginner', 'Intermediate'], programNames: ['Tennis Academy'], rosterMin: 8, rosterMax: 14, baseFeeCents: 10500 },
  track_field: { levels: ['U10', 'U12', 'U14'], programNames: ['Track & Field'], rosterMin: 12, rosterMax: 24, baseFeeCents: 9000 },
  volleyball: { levels: ['U10', 'U12', 'U14'], programNames: ['Volleyball'], rosterMin: 8, rosterMax: 12, baseFeeCents: 11500 },
  wrestling: { levels: ['Beginner', 'Intermediate'], programNames: ['Wrestling'], rosterMin: 8, rosterMax: 16, baseFeeCents: 9800 },
  poms: { levels: ['Junior', 'Senior'], programNames: ['Poms Team'], rosterMin: 8, rosterMax: 14, baseFeeCents: 9000 },
}
