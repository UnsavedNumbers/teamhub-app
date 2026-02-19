$ErrorActionPreference = 'Stop'

function Build-Content {
  param([pscustomobject]$Article)

  $achieve = ($Article.Achieve | ForEach-Object { "<li>$_</li>" }) -join "`n"
  $before = ($Article.Before | ForEach-Object { "<li>$_</li>" }) -join "`n"
  $steps = ($Article.Steps | ForEach-Object { "<li>$_</li>" }) -join "`n"
  $mistakes = ($Article.Mistakes | ForEach-Object { "<li>$_</li>" }) -join "`n"
  $done = ($Article.DoneRight | ForEach-Object { "<li>$_</li>" }) -join "`n"

  return @"
<h1>$($Article.Title)</h1>
<p>$($Article.Intro)</p>

<h2>What you will achieve</h2>
<ul>
$achieve
</ul>

<h2>Before you start</h2>
<ul>
$before
</ul>

<h2>Step-by-step workflow</h2>
<ol>
$steps
</ol>

<h2>Common mistakes to avoid</h2>
<ul>
$mistakes
</ul>

<h2>Power move</h2>
<p>$($Article.PowerMove)</p>

<h2>Done right looks like</h2>
<ul>
$done
</ul>

<p>Run this workflow consistently and your organization gets faster, clearer, and more reliable for families, staff, and athletes.</p>
"@
}

$date = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

$articles = @(
  [pscustomobject]@{
    Title='Import Athletes in Minutes: CSV Playbook for Clean Rosters'
    Slug='import-athletes-csv-playbook-clean-rosters'
    Section='Getting Started'
    Tags='athletes,rosters,import,csv,data-quality,organization-admins'
    Excerpt='Move from spreadsheet to roster with less cleanup and fewer duplicates.'
    Intro='Great seasons start with clean data. This playbook helps you import athletes quickly, catch errors early, and keep one reliable profile per athlete.'
    Achieve=@('Import large athlete lists without duplicate profiles.','Map required fields correctly on first pass.','Reduce manual cleanup after import.')
    Before=@('Use one athlete per CSV row.','Normalize names, dates, and emails before upload.','Confirm target teams and seasons already exist.')
    Steps=@('Open Import Athletes and upload your CSV.','Map columns to athlete fields and verify required indicators.','Run preview and resolve failed rows before import.','Complete import and compare total imported vs source total.','Spot-check athlete profiles and team assignment readiness.')
    Mistakes=@('Mixed date formats in one file.','Creating new athletes when profile already exists.','Skipping post-import quality check.')
    PowerMove='Keep one locked master CSV template with validated columns and a change log.'
    DoneRight=@('Athletes appear once with complete data.','Roster assignment can start immediately.','Support requests drop after launch.')
  },
  [pscustomobject]@{
    Title='Audit Your Organization Structure Before Registration Opens'
    Slug='audit-organization-structure-before-registration'
    Section='Getting Started'
    Tags='organization,setup,sports,programs,levels,teams,seasons'
    Excerpt='Validate your structure before launch to avoid downstream setup failures.'
    Intro='Most registration issues start with structure mistakes. A short hierarchy audit keeps teams, seasons, and downstream workflows aligned before families enter the system.'
    Achieve=@('Catch structure issues before they reach families.','Align sports, programs, levels, teams, and seasons.','Prevent payment and roster assignment errors.')
    Before=@('Finalize naming conventions.','Archive old test structure.','Assign one owner for final sign-off.')
    Steps=@('Review active sports and remove placeholders.','Verify program and level naming consistency.','Confirm every team is attached to the right level and season.','Validate season date ranges and active state.','Run one parent-path test before registration opens.')
    Mistakes=@('Leaving old test teams active.','Using duplicate or unclear level names.','Launching before team-season verification.')
    PowerMove='Use a two-admin pre-launch checklist with explicit sign-off fields.'
    DoneRight=@('Families see the correct options immediately.','Athletes flow to correct teams.','Admin cleanup after launch is minimal.')
  },
  [pscustomobject]@{
    Title='Attach Existing Athletes to Teams Without Duplicates'
    Slug='attach-existing-athletes-to-teams-without-duplicates'
    Section='Getting Started'
    Tags='athletes,teams,rosters,assignment,organization-admins'
    Excerpt='Assign athletes to teams while preserving one source of truth.'
    Intro='Team moves should be operationally simple. This workflow keeps athlete records clean while assigning athletes to the right teams fast.'
    Achieve=@('Assign athletes to teams using existing profiles.','Protect athlete history and reporting consistency.','Avoid duplicate records during bulk roster work.')
    Before=@('Confirm destination teams are active.','Filter out archived athletes.','Decide single-team vs multi-team assignment rules.')
    Steps=@('Open roster management and filter to target group.','Search for existing athlete records and verify identity.','Attach athlete to correct team using existing record.','Use bulk actions for volume changes in controlled batches.','Reconcile final team counts vs planning sheet.')
    Mistakes=@('Creating new athlete profiles for existing athletes.','Bulk actions without identity checks.','Ignoring roster count mismatches.')
    PowerMove='Run assignment in level-based batches and reconcile after each batch.'
    DoneRight=@('One athlete profile per athlete.','Team rosters match approved plans.','Attendance and communications stay accurate.')
  },
  [pscustomobject]@{
    Title='Link Guardians and Keep Family Records Accurate'
    Slug='link-guardians-and-keep-family-records-accurate'
    Section='Getting Started'
    Tags='guardians,families,athletes,contacts,data-quality'
    Excerpt='Build reliable guardian links so updates and approvals reach the right adults.'
    Intro='Family records power communication and approvals. Clean guardian linking ensures alerts, payment reminders, and updates go to the right contacts every time.'
    Achieve=@('Attach guardians to athletes correctly.','Reduce duplicate guardian records.','Improve communication delivery rates.')
    Before=@('Verify guardian emails before linking.','Confirm athlete profiles are complete.','Define dispute and correction policy.')
    Steps=@('Search for existing guardian before creating a new one.','Link existing guardian records to athlete profiles.','Create new guardian record only when no match exists.','Validate primary contact and relationship fields.','Send a test communication to verify visibility and delivery.')
    Mistakes=@('Duplicate guardian profiles for one email.','Linking without athlete identity verification.','Skipping communication test.')
    PowerMove='Use one canonical guardian email per household and enforce it in staff process.'
    DoneRight=@('Guardian relationships are accurate.','Messages reach intended recipients.','Family support friction drops.')
  },
  [pscustomobject]@{
    Title='Invite Staff and Assign the Right Admin Permissions'
    Slug='invite-staff-and-assign-admin-permissions'
    Section='Getting Started'
    Tags='users,roles,permissions,staff,security'
    Excerpt='Onboard staff quickly with role-based access that stays secure.'
    Intro='Access should be fast and safe. Role-based onboarding gives each staff member what they need without exposing settings they should not control.'
    Achieve=@('Invite staff with correct role scope.','Reduce access errors across admin workflows.','Improve accountability and auditability.')
    Before=@('Define role capabilities by responsibility.','Prepare invite list with official emails.','Set permission grant and revoke owners.')
    Steps=@('Open Organization Users and start invites.','Assign minimum required role for each invite.','Verify access after invite acceptance.','Test role boundaries with non-admin account.','Review and remove stale access regularly.')
    Mistakes=@('Giving full admin rights by default.','Leaving old permissions active after role change.','Shared logins between staff members.')
    PowerMove='Run a monthly permission audit with one owner and one reviewer.'
    DoneRight=@('Staff can do work without blockers.','Sensitive areas remain controlled.','Role changes happen cleanly and quickly.')
  },
  [pscustomobject]@{
    Title='Configure Fees for Teams vs Individual Athletes'
    Slug='configure-fees-for-teams-vs-individual-athletes'
    Section='Getting Started'
    Tags='payments,fees,billing,teams,athletes'
    Excerpt='Choose the right fee scope and prevent billing confusion before invoices go out.'
    Intro='Billing clarity starts at setup. Choosing team scope vs athlete scope the right way prevents charge confusion and support churn.'
    Achieve=@('Match fee scope to program structure.','Prevent incorrect charge assignments.','Launch billing with predictable outcomes.')
    Before=@('Confirm billing target model.','Set due dates and installment policy.','Verify payment configuration is active.')
    Steps=@('Create a fee in Payments.','Set amount, due date, and installment behavior.','Choose assignment scope: team or individual athlete.','Review assignment preview count before publish.','Publish and monitor first-day payment activity.')
    Mistakes=@('Combining multiple scopes in one unclear fee.','Publishing without count validation.','Changing core fee rules after payments start.')
    PowerMove='Use fee names that include season, scope, and due month.'
    DoneRight=@('Correct people see correct charges.','Collection timelines stay clear.','Finance reconciliation is faster.')
  },
  [pscustomobject]@{
    Title='Track Partial Payments and Close Outstanding Balances'
    Slug='track-partial-payments-and-close-outstanding-balances'
    Section='Getting Started'
    Tags='payments,partial-payments,balances,collections'
    Excerpt='Use a repeatable follow-up rhythm to convert partials into paid balances.'
    Intro='Partial payments are normal. Confusion is optional. This workflow keeps balances visible and follow-up targeted so open amounts close faster.'
    Achieve=@('Monitor partial and overdue balances clearly.','Target follow-up where it matters most.','Reduce aging balances over time.')
    Before=@('Confirm fee due dates are accurate.','Set weekly review cadence.','Prepare standard follow-up language.')
    Steps=@('Filter Payments by partial and overdue states.','Review balance details by athlete or team.','Confirm recent transactions are posted.','Send targeted reminders with exact amount due.','Track outcomes and escalate unresolved cases.')
    Mistakes=@('Treating partial as fully resolved.','Sending generic reminders without amounts.','Failing to reconcile after manual adjustments.')
    PowerMove='Hold a weekly 15-minute balance huddle with one accountable owner.'
    DoneRight=@('Balance visibility is real-time.','Collections improve without chaos.','Families get clear and respectful communication.')
  },
  [pscustomobject]@{
    Title='Configure Uniform Catalogs, Sizes, and Deadlines'
    Slug='configure-uniform-catalogs-sizes-and-deadlines'
    Section='Getting Started'
    Tags='uniforms,sizes,deadlines,operations,orders'
    Excerpt='Set uniform options clearly so ordering is simple for families and staff.'
    Intro='Uniform ordering should feel smooth. Clean catalog setup with clear sizing and deadlines removes confusion and speeds completion rates.'
    Achieve=@('Publish complete uniform options by team.','Collect clean sizing data.','Reduce incomplete submissions before lock date.')
    Before=@('Confirm product and size matrix with vendor.','Set final submission deadline.','Decide required fields for each item.')
    Steps=@('Create or edit uniforms in admin tools.','Define available sizes and guidance notes.','Set clear deadlines with timezone context.','Assign uniforms to appropriate teams or groups.','Preview user flow and publish.')
    Mistakes=@('Missing size options on live items.','Unclear deadline messaging.','Changing required fields after launch.')
    PowerMove='Send launch and midpoint reminders with direct action links.'
    DoneRight=@('Families complete selections faster.','Staff sees fewer exceptions.','Vendor handoff is cleaner.')
  },
  [pscustomobject]@{
    Title='Fix Uniform Order Exceptions Before Order Lock'
    Slug='fix-uniform-order-exceptions-before-order-lock'
    Section='Getting Started'
    Tags='uniforms,exceptions,orders,deadlines,operations'
    Excerpt='Catch missing sizes and invalid entries early so final orders ship on time.'
    Intro='Deadline day should be execution, not repair. Proactive exception management keeps final uniform submission clean and on schedule.'
    Achieve=@('Identify exceptions early.','Resolve missing fields before lock.','Submit complete and accurate final orders.')
    Before=@('Know vendor cutoffs.','Define exception categories.','Prepare correction templates.')
    Steps=@('Filter Uniform Orders for incomplete or invalid records.','Prioritize exceptions by urgency and team.','Contact families with exact corrections required.','Track corrections daily until closure.','Re-run exception filter 24 hours before lock.')
    Mistakes=@('Waiting until final day to review exceptions.','Sending vague requests without specifics.','Submitting final order before zero-check.')
    PowerMove='Assign one uniform operations owner for the season.'
    DoneRight=@('Exception queue reaches zero or documented approval.','Final export is vendor-ready.','Teams receive uniforms on time.')
  },
  [pscustomobject]@{
    Title='Send Organization-Wide vs Team-Targeted Announcements'
    Slug='send-organization-wide-vs-team-targeted-announcements'
    Section='Getting Started'
    Tags='announcements,communication,teams,notifications'
    Excerpt='Use audience targeting to improve message clarity and response.'
    Intro='When every message goes to everyone, engagement drops. Audience targeting keeps communication relevant and improves response speed on important updates.'
    Achieve=@('Choose the right audience each time.','Increase response on critical updates.','Reduce notification fatigue.')
    Before=@('Define target audience clearly.','Set urgency level and send timing.','Draft one clear call to action.')
    Steps=@('Create announcement with concise headline.','Choose organization-wide or team-targeted audience.','Add what changed, who is affected, and what to do next.','Preview mobile readability.','Publish and monitor replies for follow-up needs.')
    Mistakes=@('Global posts for team-specific updates.','Long copy without clear action.','Overusing urgent labels.')
    PowerMove='Use a four-part message pattern: change, impact, action, deadline.'
    DoneRight=@('Members get relevant updates.','Critical actions happen faster.','Admin clarifications decrease.')
  },
  [pscustomobject]@{
    Title='Create, Publish, and Update Events Without Confusing Families'
    Slug='create-publish-update-events-without-confusing-families'
    Section='Events'
    Tags='events,scheduling,communication,calendar'
    Excerpt='Publish clear event details and manage changes with confidence.'
    Intro='Families can adapt to schedule changes when details are clear. This event workflow helps you publish confidently and update quickly without trust erosion.'
    Achieve=@('Create events with complete actionable details.','Publish updates with clear impact statements.','Keep calendars accurate across teams.')
    Before=@('Collect confirmed time and location details.','Define event audience and RSVP expectations.','Set day-of change communication owner.')
    Steps=@('Create event with clear title, date, and location.','Configure audience and RSVP options.','Review details before publish.','When details change, edit immediately and summarize change.','Notify affected members and verify calendar sync.')
    Mistakes=@('Publishing placeholders as final details.','Editing time without communication.','Overlong event descriptions with no key action.')
    PowerMove='Use event record as single source of truth, never side-channel threads.'
    DoneRight=@('Families trust event details.','Staff spends less time clarifying.','Attendance planning is more accurate.')
  },
  [pscustomobject]@{
    Title='Choose the Right RSVP Mode for Each Event'
    Slug='choose-the-right-rsvp-mode-for-each-event'
    Section='Events'
    Tags='events,rsvp,athletes,attendance,planning'
    Excerpt='Use general vs athlete-specific RSVP intentionally for better planning data.'
    Intro='RSVP settings define the quality of your attendance data. Choosing the right mode gives coaches cleaner counts and families clear expectations.'
    Achieve=@('Pick RSVP mode that matches event purpose.','Improve response quality before event day.','Reduce late attendance uncertainty.')
    Before=@('Know if response should be family-level or athlete-level.','Set response deadline with planning buffer.','Align RSVP policy with coaching operations.')
    Steps=@('Open event RSVP settings.','Select general RSVP for simple confirmation flows.','Select athlete-specific RSVP when each athlete needs status.','Set deadline and optional notes.','Monitor response rates and follow up with non-responders.')
    Mistakes=@('General RSVP for athlete-specific decisions.','Late deadlines that block planning.','No follow-up on missing responses.')
    PowerMove='Default to athlete-specific RSVP for travel and capacity-sensitive events.'
    DoneRight=@('Coaches receive actionable response data.','Families understand response expectations.','Event readiness improves.')
  },
  [pscustomobject]@{
    Title='Run Attendance Workflow from Check-In to Follow-Up'
    Slug='run-attendance-workflow-from-check-in-to-follow-up'
    Section='Events'
    Tags='attendance,events,reports,operations'
    Excerpt='Capture attendance consistently and turn records into useful follow-up.'
    Intro='Attendance is an operational signal, not just a checkbox. This workflow gives your team reliable records and better follow-up decisions.'
    Achieve=@('Record attendance quickly and accurately.','Submit complete status logs every event.','Use attendance data for proactive follow-up.')
    Before=@('Confirm roster is up to date.','Assign primary and backup attendance owner.','Define follow-up threshold for repeated absences.')
    Steps=@('Open event attendance view before start.','Record present, absent, and late statuses in real time.','Resolve missing roster entries before final submit.','Submit attendance and confirm save state.','Review attendance reports and trigger follow-up where needed.')
    Mistakes=@('Backfilling attendance from memory.','Leaving blank statuses.','Skipping repeated absence follow-up.')
    PowerMove='Always assign a backup attendance owner for every event.'
    DoneRight=@('Attendance logs are complete.','Reports reflect real participation trends.','Interventions happen earlier.')
  },
  [pscustomobject]@{
    Title='Edit Recurring Events Without Breaking the Series'
    Slug='edit-recurring-events-without-breaking-the-series'
    Section='Events'
    Tags='events,recurring-events,calendar,scheduling'
    Excerpt='Update one occurrence or all occurrences intentionally to avoid calendar drift.'
    Intro='Recurring events save time until one wrong edit rewrites your season. This guide helps you make targeted changes with confidence.'
    Achieve=@('Apply changes at the right scope.','Avoid accidental series-wide edits.','Keep future schedule integrity.')
    Before=@('Determine one-time vs permanent change.','Check downstream impact on travel and attendance.','Set approver for recurring pattern edits.')
    Steps=@('Open recurring event and choose scope.','Apply only required changes.','Review impacted dates before save.','Publish update and communicate scope clearly.','Verify future event list for unintended changes.')
    Mistakes=@('Series-wide edit for one-time change.','No review of future dates.','No communication of change scope.')
    PowerMove='Name recurring patterns clearly so staff can identify them instantly.'
    DoneRight=@('Only intended events change.','Families see accurate updates.','Long-range schedule stays stable.')
  },
  [pscustomobject]@{
    Title='Turn Events into Travel Plans with Less Manual Work'
    Slug='turn-events-into-travel-plans-with-less-manual-work'
    Section='Events'
    Tags='travel,events,logistics,planning'
    Excerpt='Use event details to accelerate travel setup and reduce re-entry errors.'
    Intro='Travel planning scales when it starts from clean event data. This process helps you move from event schedule to travel plans with less manual work and fewer mistakes.'
    Achieve=@('Create travel plans aligned with event details.','Reduce logistics re-entry.','Publish clearer travel communication.')
    Before=@('Confirm event timing and location are final.','Identify travel-required teams and athletes.','Collect lodging and transportation decisions.')
    Steps=@('Review upcoming events requiring travel support.','Create travel plan using event context.','Add itinerary checkpoints and responsibilities.','Assign participants and validate eligibility.','Publish and monitor for updates.')
    Mistakes=@('Building travel before event details are final.','Publishing without participant verification.','Forgetting to update travel after event changes.')
    PowerMove='Batch-create travel plans weekly to stay ahead of schedule pressure.'
    DoneRight=@('Travel plans mirror event reality.','Families get one clear source of trip info.','Staff reconciliation work decreases.')
  },
  [pscustomobject]@{
    Title='Resolve Overlapping Travel Plans Across Teams'
    Slug='resolve-overlapping-travel-plans-across-teams'
    Section='Events'
    Tags='travel,conflicts,teams,eligibility,operations'
    Excerpt='Detect and resolve travel conflicts before they become day-of problems.'
    Intro='Overlapping travel creates confusion fast. A proactive conflict workflow keeps athlete assignment, family communication, and team expectations aligned.'
    Achieve=@('Find overlap risks early.','Coordinate final athlete assignment across teams.','Reduce day-of travel confusion.')
    Before=@('Define conflict priority policy.','Verify eligibility rules for affected athletes.','Set escalation owner for unresolved cases.')
    Steps=@('Filter travel plans by date range to find overlaps.','Identify affected athletes and conflict details.','Coordinate final decisions with coaches.','Update plans and event notes with approved outcomes.','Communicate final assignments to families.')
    Mistakes=@('Resolving conflicts too late.','Changing assignments without communication.','Leaving stale overlapping plans active.')
    PowerMove='Run overlap review twice weekly during peak competition windows.'
    DoneRight=@('Athletes have clear assignments.','Families know exactly where to be.','Travel operations run smoothly.')
  },
  [pscustomobject]@{
    Title='Launch a Ticketed Event End-to-End'
    Slug='launch-a-ticketed-event-end-to-end'
    Section='Events'
    Tags='ticketing,events,sales,revenue,operations'
    Excerpt='Go from setup to live sales with a repeatable ticketing launch workflow.'
    Intro='Ticketed events are high-visibility moments. A structured launch process protects fan experience and revenue operations from preventable mistakes.'
    Achieve=@('Configure ticketed events correctly before launch.','Reduce support issues after go-live.','Improve confidence during launch windows.')
    Before=@('Confirm event details and capacity assumptions.','Set sales timeline and release strategy.','Assign launch support owners.')
    Steps=@('Create ticketed event with complete public details.','Add ticket types and sales windows.','Validate capacity rules and order limits.','Run internal checkout test before publish.','Launch and monitor first-hour performance.')
    Mistakes=@('Launching without checkout QA.','Unclear buyer-facing event details.','Capacity settings that do not match venue reality.')
    PowerMove='Use a launch checklist with owner initials for every critical step.'
    DoneRight=@('Fans purchase without confusion.','Sales data starts clean.','Staff focuses on execution, not rework.')
  },
  [pscustomobject]@{
    Title='Configure Ticket Types, Limits, and Sales Windows'
    Slug='configure-ticket-types-limits-and-sales-windows'
    Section='Events'
    Tags='ticketing,ticket-types,capacity,sales-windows,pricing'
    Excerpt='Design ticket options and constraints that protect both access and revenue.'
    Intro='Ticket configuration is product design. Smart ticket types and sales windows improve conversion while protecting operations under demand spikes.'
    Achieve=@('Create clear ticket options for buyers.','Apply inventory and order limits safely.','Control sales timing with fewer surprises.')
    Before=@('Define buyer segments and price strategy.','Set per-order limits as needed.','Confirm sales start and end windows.')
    Steps=@('Create ticket types with clear naming.','Set price and active sales windows per type.','Configure quantity limits where needed.','Validate combined inventory vs venue capacity.','Test each ticket type in preview checkout.')
    Mistakes=@('Overlapping windows with unclear logic.','Inventory totals beyond real capacity.','Internal jargon in ticket names.')
    PowerMove='Name ticket types by audience and value, not internal shorthand.'
    DoneRight=@('Buyers choose quickly.','Capacity controls hold in peak demand.','Revenue and attendance stay aligned.')
  },
  [pscustomobject]@{
    Title='Apply Seat Maps to Reserved-Seating Events'
    Slug='apply-seat-maps-to-reserved-seating-events'
    Section='Events'
    Tags='ticketing,seat-maps,reserved-seating,venue'
    Excerpt='Use seat maps correctly so fans can select seats without friction.'
    Intro='Reserved seating can elevate fan experience when setup is precise. This guide helps you map inventory, pricing zones, and event assignment correctly.'
    Achieve=@('Attach the right map to the right event.','Keep seat inventory and pricing synchronized.','Reduce checkout and gate issues.')
    Before=@('Confirm final venue layout.','Verify sections, rows, and seat metadata.','Set reserved inventory go-live timing.')
    Steps=@('Open seat map tools and select target map.','Validate zone and price mapping.','Attach map to ticketed event.','Run seat selection preview test.','Publish and monitor early transactions.')
    Mistakes=@('Wrong map assigned to event.','Map structure changes after sales start.','Skipping preview test.')
    PowerMove='Run two-device launch rehearsal before opening public sales.'
    DoneRight=@('Fans choose seats smoothly.','Inventory remains accurate.','Entry flow matches purchased seats.')
  },
  [pscustomobject]@{
    Title='Handle Orders, Comp Tickets, and Scanner Validation'
    Slug='handle-orders-comp-tickets-and-scanner-validation'
    Section='Events'
    Tags='ticketing,orders,comp-tickets,scanner,event-ops'
    Excerpt='Manage order support, comp access, and gate validation with confidence.'
    Intro='Ticket operations are where fan experience meets control. This workflow gives your team a clean path from order review to fast, reliable gate validation.'
    Achieve=@('Process ticket orders with clear status awareness.','Issue comp tickets with audit discipline.','Run scanner operations with minimal entry delays.')
    Before=@('Confirm staff access for order and scanner tools.','Define comp approval policy.','Test scanner hardware and connectivity.')
    Steps=@('Review orders and verify completion states.','Issue comp tickets based on approved policy.','Resend ticket access when requested.','Start scanner with a known-valid test ticket.','Monitor duplicate scan alerts and resolve quickly.')
    Mistakes=@('Comp issuance without approval trail.','No pre-open scanner test.','Ignoring duplicate scan alerts.')
    PowerMove='Use a gate-day command structure with separate owners for scanner, order support, and comp approvals.'
    DoneRight=@('Entry lines move faster.','Comp inventory is controlled.','Post-event reconciliation is clean.')
  },
  [pscustomobject]@{
    Title='Create Tryouts and Manage Registrations with Less Friction'
    Slug='create-tryouts-and-manage-registrations-with-less-friction'
    Section='Events'
    Tags='tryouts,registration,events,athletes'
    Excerpt='Publish tryouts and manage signups with a clean, parent-friendly workflow.'
    Intro='Tryouts are a high-stakes first impression. A clear registration workflow improves completion rates and gives coaches cleaner data for evaluations.'
    Achieve=@('Launch tryout events with clear requirements.','Improve registration completion quality.','Reduce day-of check-in issues.')
    Before=@('Finalize tryout dates and eligibility.','Define required registration details.','Assign registration support owner.')
    Steps=@('Create tryout with complete details and criteria.','Publish registration instructions with one clear next action.','Monitor incomplete registrations and send reminders.','Prepare event-day check-in list from final registration data.','Review attendance outcomes for post-tryout communication.')
    Mistakes=@('Unclear eligibility in event details.','Waiting until deadline to review incomplete records.','No final check-in list validation.')
    PowerMove='Send a 72-hour readiness message with what to bring and where to report.'
    DoneRight=@('Families register with fewer questions.','Check-in runs faster.','Post-tryout decisions start with clean data.')
  }
)

$maxRows = [Math]::Min(20, $articles.Count)

$rows = for ($i = 0; $i -lt $maxRows; $i++) {
  $a = $articles[$i]
  [pscustomobject]@{
    ID = ''
    Title = $a.Title
    Content = (Build-Content -Article $a)
    Excerpt = $a.Excerpt
    Slug = $a.Slug
    Status = 'publish'
    Parent = ''
    Order = $i + 1
    Author = 'admin'
    Date = $date
    'Allow Comments' = 'closed'
    'Allow Pingbacks' = 'closed'
    Categories = "Help, Organization Admins, $($a.Section)"
    Tags = $a.Tags
    Section = $a.Section
    'Role Category' = 'Organization Admins'
  }
}

$outPath = Join-Path (Get-Location) 'help-center-org-admin-import-20-posts.csv'
$rows | Export-Csv -Path $outPath -NoTypeInformation -Encoding UTF8

Write-Output "Wrote: $outPath"
Write-Output "Rows: $($rows.Count)"
