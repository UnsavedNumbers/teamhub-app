/**
 * Fake Athlete Sport Profiles Data Module
 *
 * Provides fake sport profiles for demo athletes with realistic data.
 * Each athlete has at least 3 sports with complete profile and equipment data.
 */

import { DEMO_ORG_A_ID } from '../config'
import {
    CHILD_EMMA_JOHNSON_ID,
    CHILD_LIAM_JOHNSON_ID,
    CHILD_OLIVIA_SMITH_ID,
    CHILD_NOAH_SMITH_ID,
    CHILD_AVA_WILLIAMS_ID,
    CHILD_ETHAN_WILLIAMS_ID,
    CHILD_SOPHIA_CHEN_ID,
    CHILD_MASON_RODRIGUEZ_ID,
    CHILD_ISABELLA_RODRIGUEZ_ID,
    CHILD_AIDEN_PATEL_ID,
} from './fakeUsers'
import type { AthleteSportProfile } from '../../types/athleteSportProfiles'
import type { SportCode } from '../../types/sports'

const getDateInCurrentYear = (month: number, day: number): string => {
    const year = new Date().getFullYear()
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00Z`
}

// Helper to create sport profile
function createSportProfile(
    athleteId: string,
    sportCode: SportCode,
    profileData: Record<string, unknown>,
    equipmentData: Record<string, unknown>,
    orgId: string = DEMO_ORG_A_ID
): AthleteSportProfile {
    const allData = { ...profileData, ...equipmentData }
    const completedFields = Object.values(allData).filter(v => v !== null && v !== undefined && v !== '').length
    const totalFields = Object.keys(allData).length
    const completenessScore = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0

    return {
        id: `sport-profile-${athleteId}-${sportCode}`,
        org_id: orgId,
        athlete_id: athleteId,
        sport_code: sportCode,
        profile_data: profileData,
        equipment_data: equipmentData,
        completeness_score: completenessScore,
        last_verified_at: getDateInCurrentYear(2, 15),
        created_by: null,
        updated_by: null,
        created_at: getDateInCurrentYear(1, 20),
        updated_at: getDateInCurrentYear(2, 15),
    }
}

// Fake sport profiles for each athlete
export const fakeAthleteSportProfiles: AthleteSportProfile[] = [
    // Emma Johnson (age ~10, female) - Soccer, Basketball, Tennis
    createSportProfile(
        CHILD_EMMA_JOHNSON_ID,
        'soccer',
        {
            position: 'Forward',
            experience_years: 4,
            preferred_foot: 'Right',
            playing_style: 'Aggressive',
        },
        {
            jersey_size: 'YS',
            shorts_size: 'YS',
            shin_guard_size: 'Youth Medium',
            cleat_size: '3.5',
            cleat_width: 'Standard',
        }
    ),
    createSportProfile(
        CHILD_EMMA_JOHNSON_ID,
        'basketball',
        {
            position: 'Point Guard',
            experience_years: 3,
            shooting_hand: 'Right',
            playing_style: 'Playmaker',
        },
        {
            jersey_size: 'YS',
            shorts_size: 'YS',
            shoe_size: '3.5',
            shoe_width: 'Standard',
        }
    ),
    createSportProfile(
        CHILD_EMMA_JOHNSON_ID,
        'tennis',
        {
            playing_hand: 'Right',
            experience_years: 2,
            playing_style: 'Baseline',
        },
        {
            shirt_size: 'YS',
            shorts_size: 'YS',
            shoe_size: '3.5',
            racket_grip_size: '4 1/8',
        }
    ),

    // Liam Johnson (age ~8, male) - Soccer, Baseball, Basketball
    createSportProfile(
        CHILD_LIAM_JOHNSON_ID,
        'soccer',
        {
            position: 'Midfielder',
            experience_years: 2,
            preferred_foot: 'Right',
            playing_style: 'Defensive',
        },
        {
            jersey_size: 'YS',
            shorts_size: 'YS',
            shin_guard_size: 'Youth Small',
            cleat_size: '2',
            cleat_width: 'Standard',
        }
    ),
    createSportProfile(
        CHILD_LIAM_JOHNSON_ID,
        'baseball',
        {
            position: 'Shortstop',
            experience_years: 3,
            batting_stance: 'Right',
            throwing_hand: 'Right',
        },
        {
            jersey_size: 'YS',
            pants_size: 'YS',
            hat_size: 'Youth',
            glove_size: '10.5',
            bat_size: '27/17',
        }
    ),
    createSportProfile(
        CHILD_LIAM_JOHNSON_ID,
        'basketball',
        {
            position: 'Shooting Guard',
            experience_years: 2,
            shooting_hand: 'Right',
            playing_style: 'Scorer',
        },
        {
            jersey_size: 'YS',
            shorts_size: 'YS',
            shoe_size: '2',
            shoe_width: 'Standard',
        }
    ),

    // Olivia Smith (age ~11, female) - Volleyball, Soccer, Gymnastics
    createSportProfile(
        CHILD_OLIVIA_SMITH_ID,
        'volleyball',
        {
            position: 'Setter',
            experience_years: 5,
            playing_hand: 'Right',
            playing_style: 'Technical',
        },
        {
            jersey_size: 'YM',
            shorts_size: 'YM',
            knee_pad_size: 'Youth',
            shoe_size: '4',
            shoe_width: 'Standard',
        }
    ),
    createSportProfile(
        CHILD_OLIVIA_SMITH_ID,
        'soccer',
        {
            position: 'Midfielder',
            experience_years: 4,
            preferred_foot: 'Left',
            playing_style: 'Creative',
        },
        {
            jersey_size: 'YM',
            shorts_size: 'YM',
            shin_guard_size: 'Youth Large',
            cleat_size: '4',
            cleat_width: 'Standard',
        }
    ),
    createSportProfile(
        CHILD_OLIVIA_SMITH_ID,
        'gymnastics',
        {
            events: ['Floor', 'Beam', 'Bars'],
            experience_years: 6,
            level: 'Level 4',
        },
        {
            leotard_size: 'Child 8',
            shoe_size: '4',
            grip_size: 'Small',
        }
    ),

    // Noah Smith (age ~9, male) - Baseball, Basketball, Soccer
    createSportProfile(
        CHILD_NOAH_SMITH_ID,
        'baseball',
        {
            position: 'Pitcher',
            experience_years: 4,
            batting_stance: 'Left',
            throwing_hand: 'Right',
        },
        {
            jersey_size: 'YS',
            pants_size: 'YS',
            hat_size: 'Youth',
            glove_size: '11',
            bat_size: '28/18',
        }
    ),
    createSportProfile(
        CHILD_NOAH_SMITH_ID,
        'basketball',
        {
            position: 'Center',
            experience_years: 3,
            shooting_hand: 'Right',
            playing_style: 'Rebounder',
        },
        {
            jersey_size: 'YM',
            shorts_size: 'YM',
            shoe_size: '3',
            shoe_width: 'Wide',
        }
    ),
    createSportProfile(
        CHILD_NOAH_SMITH_ID,
        'soccer',
        {
            position: 'Goalkeeper',
            experience_years: 2,
            preferred_foot: 'Right',
            playing_style: 'Aggressive',
        },
        {
            jersey_size: 'YM',
            shorts_size: 'YM',
            shin_guard_size: 'Youth Medium',
            cleat_size: '3',
            cleat_width: 'Wide',
            goalkeeper_gloves_size: 'Youth',
        }
    ),

    // Ava Williams (age ~10, female) - Soccer, Basketball, Swimming
    createSportProfile(
        CHILD_AVA_WILLIAMS_ID,
        'soccer',
        {
            position: 'Defender',
            experience_years: 5,
            preferred_foot: 'Right',
            playing_style: 'Defensive',
        },
        {
            jersey_size: 'YS',
            shorts_size: 'YS',
            shin_guard_size: 'Youth Medium',
            cleat_size: '3.5',
            cleat_width: 'Standard',
        }
    ),
    createSportProfile(
        CHILD_AVA_WILLIAMS_ID,
        'basketball',
        {
            position: 'Small Forward',
            experience_years: 4,
            shooting_hand: 'Right',
            playing_style: 'Versatile',
        },
        {
            jersey_size: 'YS',
            shorts_size: 'YS',
            shoe_size: '3.5',
            shoe_width: 'Standard',
        }
    ),
    createSportProfile(
        CHILD_AVA_WILLIAMS_ID,
        'swimming',
        {
            strokes: ['Freestyle', 'Backstroke', 'Breaststroke'],
            experience_years: 6,
            preferred_distance: '50m',
        },
        {
            suit_size: 'Child 10',
            cap_size: 'Youth',
            goggles_size: 'Youth',
        }
    ),

    // Ethan Williams (age ~7, male) - Soccer, Baseball, Basketball
    createSportProfile(
        CHILD_ETHAN_WILLIAMS_ID,
        'soccer',
        {
            position: 'Forward',
            experience_years: 1,
            preferred_foot: 'Right',
            playing_style: 'Energetic',
        },
        {
            jersey_size: 'YS',
            shorts_size: 'YS',
            shin_guard_size: 'Youth Small',
            cleat_size: '1.5',
            cleat_width: 'Standard',
        }
    ),
    createSportProfile(
        CHILD_ETHAN_WILLIAMS_ID,
        'baseball',
        {
            position: 'Outfielder',
            experience_years: 2,
            batting_stance: 'Right',
            throwing_hand: 'Right',
        },
        {
            jersey_size: 'YS',
            pants_size: 'YS',
            hat_size: 'Youth',
            glove_size: '10',
            bat_size: '26/16',
        }
    ),
    createSportProfile(
        CHILD_ETHAN_WILLIAMS_ID,
        'basketball',
        {
            position: 'Point Guard',
            experience_years: 1,
            shooting_hand: 'Right',
            playing_style: 'Fast',
        },
        {
            jersey_size: 'YS',
            shorts_size: 'YS',
            shoe_size: '1.5',
            shoe_width: 'Standard',
        }
    ),

    // Sophia Chen (age ~9, female) - Soccer, Volleyball, Track & Field
    createSportProfile(
        CHILD_SOPHIA_CHEN_ID,
        'soccer',
        {
            position: 'Winger',
            experience_years: 3,
            preferred_foot: 'Right',
            playing_style: 'Speed',
        },
        {
            jersey_size: 'YS',
            shorts_size: 'YS',
            shin_guard_size: 'Youth Medium',
            cleat_size: '3',
            cleat_width: 'Standard',
        }
    ),
    createSportProfile(
        CHILD_SOPHIA_CHEN_ID,
        'volleyball',
        {
            position: 'Outside Hitter',
            experience_years: 2,
            playing_hand: 'Right',
            playing_style: 'Power',
        },
        {
            jersey_size: 'YS',
            shorts_size: 'YS',
            knee_pad_size: 'Youth',
            shoe_size: '3',
            shoe_width: 'Standard',
        }
    ),
    createSportProfile(
        CHILD_SOPHIA_CHEN_ID,
        'track_field',
        {
            events: ['100m', '200m', 'Long Jump'],
            experience_years: 2,
            preferred_event: 'Sprints',
        },
        {
            jersey_size: 'YS',
            shorts_size: 'YS',
            shoe_size: '3',
            spike_size: '3',
        }
    ),

    // Mason Rodriguez (age ~10, male) - Basketball, Soccer, Baseball
    createSportProfile(
        CHILD_MASON_RODRIGUEZ_ID,
        'basketball',
        {
            position: 'Power Forward',
            experience_years: 4,
            shooting_hand: 'Right',
            playing_style: 'Physical',
        },
        {
            jersey_size: 'YM',
            shorts_size: 'YM',
            shoe_size: '4',
            shoe_width: 'Standard',
        }
    ),
    createSportProfile(
        CHILD_MASON_RODRIGUEZ_ID,
        'soccer',
        {
            position: 'Defender',
            experience_years: 3,
            preferred_foot: 'Right',
            playing_style: 'Strong',
        },
        {
            jersey_size: 'YM',
            shorts_size: 'YM',
            shin_guard_size: 'Youth Large',
            cleat_size: '4',
            cleat_width: 'Standard',
        }
    ),
    createSportProfile(
        CHILD_MASON_RODRIGUEZ_ID,
        'baseball',
        {
            position: 'First Base',
            experience_years: 3,
            batting_stance: 'Right',
            throwing_hand: 'Right',
        },
        {
            jersey_size: 'YM',
            pants_size: 'YM',
            hat_size: 'Youth',
            glove_size: '11.5',
            bat_size: '29/19',
        }
    ),

    // Isabella Rodriguez (age ~8, female) - Soccer, Softball, Gymnastics
    createSportProfile(
        CHILD_ISABELLA_RODRIGUEZ_ID,
        'soccer',
        {
            position: 'Midfielder',
            experience_years: 3,
            preferred_foot: 'Right',
            playing_style: 'Technical',
        },
        {
            jersey_size: 'YS',
            shorts_size: 'YS',
            shin_guard_size: 'Youth Medium',
            cleat_size: '2.5',
            cleat_width: 'Standard',
        }
    ),
    createSportProfile(
        CHILD_ISABELLA_RODRIGUEZ_ID,
        'softball',
        {
            position: 'Catcher',
            experience_years: 2,
            batting_stance: 'Right',
            throwing_hand: 'Right',
        },
        {
            jersey_size: 'YS',
            pants_size: 'YS',
            hat_size: 'Youth',
            glove_size: '11',
            bat_size: '27/17',
        }
    ),
    createSportProfile(
        CHILD_ISABELLA_RODRIGUEZ_ID,
        'gymnastics',
        {
            events: ['Floor', 'Beam'],
            experience_years: 4,
            level: 'Level 3',
        },
        {
            leotard_size: 'Child 6',
            shoe_size: '2.5',
            grip_size: 'Small',
        }
    ),

    // Aiden Patel (age ~9, male) - Soccer, Basketball, Baseball
    createSportProfile(
        CHILD_AIDEN_PATEL_ID,
        'soccer',
        {
            position: 'Midfielder',
            experience_years: 3,
            preferred_foot: 'Right',
            playing_style: 'Playmaker',
        },
        {
            jersey_size: 'YS',
            shorts_size: 'YS',
            shin_guard_size: 'Youth Medium',
            cleat_size: '3',
            cleat_width: 'Standard',
        }
    ),
    createSportProfile(
        CHILD_AIDEN_PATEL_ID,
        'basketball',
        {
            position: 'Shooting Guard',
            experience_years: 2,
            shooting_hand: 'Right',
            playing_style: 'Shooter',
        },
        {
            jersey_size: 'YS',
            shorts_size: 'YS',
            shoe_size: '3',
            shoe_width: 'Standard',
        }
    ),
    createSportProfile(
        CHILD_AIDEN_PATEL_ID,
        'baseball',
        {
            position: 'Second Base',
            experience_years: 2,
            batting_stance: 'Right',
            throwing_hand: 'Right',
        },
        {
            jersey_size: 'YS',
            pants_size: 'YS',
            hat_size: 'Youth',
            glove_size: '10.5',
            bat_size: '28/18',
        }
    ),
]

/**
 * Get sport profiles for an athlete
 */
export function getSportProfilesForAthlete(athleteId: string): AthleteSportProfile[] {
    return fakeAthleteSportProfiles.filter(p => p.athlete_id === athleteId)
}

/**
 * Get a specific sport profile for an athlete
 */
export function getSportProfileForAthlete(athleteId: string, sportCode: SportCode): AthleteSportProfile | null {
    return fakeAthleteSportProfiles.find(
        p => p.athlete_id === athleteId && p.sport_code === sportCode
    ) || null
}

/**
 * Generate sport profiles for demo org athletes
 * Creates profiles for each athlete based on their team's sport and org's sports
 * Each athlete gets 1-3 sports from the org's sports_sponsored list
 */
export function generateDemoAthleteSportProfiles(
    athletes: Array<{ id: string; team_id: string }>,
    teams: Array<{ id: string; sport_id: string }>,
    sports: Array<{ id: string; slug: string }>,
    orgId: string,
    seed: string
): AthleteSportProfile[] {
    const profiles: AthleteSportProfile[] = []
    const random = (() => {
        let seedNum = 0
        for (let i = 0; i < seed.length; i++) {
            seedNum = ((seedNum << 5) - seedNum) + seed.charCodeAt(i)
            seedNum = seedNum & seedNum
        }
        return () => {
            seedNum = (seedNum * 9301 + 49297) % 233280
            return seedNum / 233280
        }
    })()

    // Map sport_id to sport_code (slug)
    const sportIdToCode: Record<string, SportCode> = {}
    const availableSportCodes: SportCode[] = []
    sports.forEach(sport => {
        if (sport.slug) {
            const code = sport.slug.replace(/-/g, '_') as SportCode
            sportIdToCode[sport.id] = code
            availableSportCodes.push(code)
        }
    })

    // Map team_id to sport_code
    const teamIdToSportCode: Record<string, SportCode> = {}
    teams.forEach(team => {
        const sportCode = sportIdToCode[team.sport_id]
        if (sportCode) {
            teamIdToSportCode[team.id] = sportCode
        }
    })

    // Generate profiles for each athlete
    athletes.forEach((athlete, _index) => {
        const teamSportCode = teamIdToSportCode[athlete.team_id]
        if (!teamSportCode || availableSportCodes.length === 0) return

        // Each athlete gets 1-3 sports (always includes their team sport)
        const numSports = Math.min(1 + Math.floor(random() * Math.min(3, availableSportCodes.length)), availableSportCodes.length)
        const athleteSports = new Set<SportCode>([teamSportCode])
        
        // Add additional random sports from org's sports
        while (athleteSports.size < numSports && athleteSports.size < availableSportCodes.length) {
            const randomSport = availableSportCodes[Math.floor(random() * availableSportCodes.length)]
            athleteSports.add(randomSport)
        }

        // Create profile for each sport
        athleteSports.forEach(sportCode => {
            const profileData: Record<string, unknown> = {
                experience_years: Math.floor(random() * 5) + 1,
            }

            const equipmentData: Record<string, unknown> = {
                jersey_size: ['YS', 'YM', 'YL'][Math.floor(random() * 3)],
                shorts_size: ['YS', 'YM', 'YL'][Math.floor(random() * 3)],
            }

            // Add sport-specific fields
            if (sportCode === 'soccer') {
                profileData.position = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'][Math.floor(random() * 4)]
                profileData.preferred_foot = ['Right', 'Left'][Math.floor(random() * 2)]
                equipmentData.shin_guard_size = ['Youth Small', 'Youth Medium', 'Youth Large'][Math.floor(random() * 3)]
                equipmentData.cleat_size = String((Math.floor(random() * 5) + 1) + (random() < 0.5 ? 0 : 0.5))
                equipmentData.cleat_width = ['Standard', 'Wide'][Math.floor(random() * 2)]
            } else if (sportCode === 'basketball') {
                profileData.position = ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'][Math.floor(random() * 5)]
                profileData.shooting_hand = ['Right', 'Left'][Math.floor(random() * 2)]
                equipmentData.shoe_size = String((Math.floor(random() * 5) + 1) + (random() < 0.5 ? 0 : 0.5))
                equipmentData.shoe_width = ['Standard', 'Wide'][Math.floor(random() * 2)]
            } else if (sportCode === 'baseball') {
                profileData.position = ['Pitcher', 'Catcher', 'First Base', 'Second Base', 'Shortstop', 'Third Base', 'Outfielder'][Math.floor(random() * 7)]
                profileData.batting_stance = ['Right', 'Left'][Math.floor(random() * 2)]
                profileData.throwing_hand = ['Right', 'Left'][Math.floor(random() * 2)]
                equipmentData.pants_size = ['YS', 'YM', 'YL'][Math.floor(random() * 3)]
                equipmentData.hat_size = 'Youth'
                equipmentData.glove_size = String(10 + Math.floor(random() * 2) + (random() < 0.5 ? 0 : 0.5))
                equipmentData.bat_size = `${26 + Math.floor(random() * 4)}/${16 + Math.floor(random() * 4)}`
            } else if (sportCode === 'softball') {
                profileData.position = ['Pitcher', 'Catcher', 'First Base', 'Second Base', 'Shortstop', 'Third Base', 'Outfielder'][Math.floor(random() * 7)]
                profileData.batting_stance = ['Right', 'Left'][Math.floor(random() * 2)]
                profileData.throwing_hand = ['Right', 'Left'][Math.floor(random() * 2)]
                equipmentData.pants_size = ['YS', 'YM', 'YL'][Math.floor(random() * 3)]
                equipmentData.hat_size = 'Youth'
                equipmentData.glove_size = String(10 + Math.floor(random() * 2) + (random() < 0.5 ? 0 : 0.5))
                equipmentData.bat_size = `${26 + Math.floor(random() * 4)}/${16 + Math.floor(random() * 4)}`
            } else {
                // Generic fallback for other sports
                equipmentData.shoe_size = String((Math.floor(random() * 5) + 1) + (random() < 0.5 ? 0 : 0.5))
            }

            profiles.push(createSportProfile(
                athlete.id,
                sportCode,
                profileData,
                equipmentData,
                orgId
            ))
        })
    })

    return profiles
}
