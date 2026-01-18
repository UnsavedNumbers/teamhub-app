import { fakeTeams, fakeLevels, fakePrograms, fakeSeasons, fakeTeamSeasons } from './fakeTeams'

export function validateFakeDataStructure() {
    const errors: string[] = []

    // Validate Teams
    fakeTeams.forEach(team => {
        if (!team.level_id) errors.push(`Team ${team.name} (${team.id}) missing level_id`)
        else if (!fakeLevels.find(l => l.id === team.level_id)) errors.push(`Team ${team.name} references invalid level ${team.level_id}`)
    })

    // Validate Levels
    fakeLevels.forEach(level => {
        if (!level.program_id) errors.push(`Level ${level.name} (${level.id}) missing program_id`)
        else if (!fakePrograms.find(p => p.id === level.program_id)) errors.push(`Level ${level.name} references invalid program ${level.program_id}`)
    })

    // Validate Programs
    fakePrograms.forEach(program => {
        if (!program.gender_category) errors.push(`Program ${program.name} (${program.id}) missing gender_category`)
    })

    // Validate TeamSeasons
    fakeTeamSeasons.forEach(ts => {
        if (!fakeTeams.find(t => t.id === ts.team_id)) errors.push(`TeamSeason references invalid team ${ts.team_id}`)
        if (!fakeSeasons.find(s => s.id === ts.season_id)) errors.push(`TeamSeason references invalid season ${ts.season_id}`)
    })

    if (errors.length > 0) {
        console.error('FAKE DATA VALIDATION ERRORS:', errors)
        throw new Error('Fake Data Integrity Check Failed: ' + errors.join('; '))
    } else {
        console.log('Fake Data Integrity Check Passed')
    }
}
