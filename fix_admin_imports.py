#!/usr/bin/env python3
"""
Add missing orgAdmin.css imports to admin pages
"""
import os
import re
from pathlib import Path

ADMIN_DIR = Path("c:/YouthSports.team/web/src/pages/admin")
IMPORT_STMT = "import '../../styles/orgAdmin.css'\n"

# Pages to fix (excluding ones we already fixed: Sports.tsx, AdminDashboard.tsx)
PAGES_TO_FIX = [
    "AdminAttendance.tsx", "AdminChildren.tsx", "AdminFamilies.tsx",
    "AdminSettings.tsx", "AdminSportSettings.tsx", "AdminTryoutDetail.tsx", "AdminTryouts.tsx",
    "AthleteDetail.tsx", "AttendanceRoster.tsx", "CreateAthlete.tsx", "CreateChild.tsx",
    "CreateEvent.tsx", "CreateFamily.tsx", "CreateGallery.tsx", "CreateTicketedEvent.tsx",
    "CreateTicketType.tsx", "CreateTravelPlan.tsx", "CreateTryout.tsx", "CreateUniform.tsx",
    "CreateUser.tsx", "EditAthlete.tsx", "EditEvent.tsx", "EditTravelPlan.tsx",
    "EditUniform.tsx", "EditUser.tsx", "FamilyDetail.tsx", "GalleryDetail.tsx",
    "GuardianAttachmentRequests.tsx", "ImportAthletes.tsx", "LevelDetail.tsx", "LevelsManagement.tsx",
    "LevelUpdate.tsx", "OrganizationSettings.tsx", "OrganizationStructureForms.tsx", "OrganizationStructureNew.tsx",
    "OrganizationUsers.tsx", "PaymentDetail.tsx", "Payments.tsx", "PhotoDetail.tsx",
    "Photos.tsx", "ProgramDetail.tsx", "Programs.tsx", "Roster.tsx",
    "SeasonDetail.tsx", "SeasonsManagement.tsx", "SeasonUpdate.tsx", "SportDetail.tsx",
    "SportUpdate.tsx", "TeamDetail.tsx", "TeamUpdate.tsx", "TicketedEventDetail.tsx",
    "TicketingEvents.tsx", "TicketingOrders.tsx", "UniformOrders.tsx", "ValidationDashboard.tsx"
]

count = 0
for filename in PAGES_TO_FIX:
    filepath = ADMIN_DIR / filename
    
    if not filepath.exists():
        continue
    
    content = filepath.read_text()
    
    # Skip if already has orgAdmin import
    if "import '../../styles/orgAdmin.css'" in content or 'import "../../styles/orgAdmin.css"' in content:
        continue
    
    # Skip if doesn't use oa- classes
    if not re.search(r'oa-\w+', content):
        continue
    
    # Find the position to insert: after all top-level imports, before the first export
    lines = content.split('\n')
    insert_pos = 0
    
    # Find the last import statement
    for i, line in enumerate(lines):
        if line.startswith('import '):
            insert_pos = i + 1
    
    # Insert the orgAdmin.css import
    if insert_pos > 0:
        lines.insert(insert_pos, IMPORT_STMT.rstrip('\n'))
        new_content = '\n'.join(lines)
        filepath.write_text(new_content)
        count += 1
        print(f"✓ {filename}")

print(f"\nUpdated {count} admin pages with orgAdmin.css import")
