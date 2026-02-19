$ErrorActionPreference = 'Stop'

function Split-List {
  param([string]$Text)
  if ([string]::IsNullOrWhiteSpace($Text)) { return @() }
  return $Text -split '\|' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
}

function To-Li {
  param([string[]]$Items)
  return ($Items | ForEach-Object { "<li>$_</li>" }) -join "`n"
}

function Build-Content {
  param([pscustomobject]$a)

  $before = To-Li (Split-List $a.Before)
  $steps = To-Li (Split-List $a.Steps)
  $fails = To-Li (Split-List $a.Failures)
  $done = To-Li (Split-List $a.DoneRight)

  return @"
<h1>$($a.Title)</h1>
<p>$($a.Intro)</p>
<p>YouthSports keeps the workflow fast, but the details matter. Use this guide to avoid rework.</p>

<h2>Before you start</h2>
<ul>
$before
</ul>

<h2>Step-by-step</h2>
<ol>
$steps
</ol>

<h2>Why this can fail</h2>
<ul>
$fails
</ul>

<h2>Done right looks like</h2>
<ul>
$done
</ul>

<p>When this flow is clean, families get clearer updates, and staff spend less time fixing avoidable issues.</p>
"@
}

$date = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

$articles = @(
  [pscustomobject]@{ Title='Set Up Your Team'; Slug='set-up-your-team'; Category='Getting Started'; Tags='coaches,teams,seasons,setup,roster'; Excerpt='Prepare your team context before real operations start.'; Intro='Strong team setup prevents downstream problems in events, attendance, travel, and communication.'; Before='Confirm you are in the right organization and season.|Verify your team assignment and active athletes.|Check required feature access for your workflow.'; Steps='Open your team in admin routes.|Review current season and active roster context.|Confirm event, attendance, and communication surfaces load correctly.|Run one test flow before publishing to families.'; Failures='Wrong team selected before edits.|Outdated season context.|Missing feature entitlement for key pages.'; DoneRight='Team context is correct and stable.|Core workflows open without blockers.|No unexpected role or access errors appear.' },
  [pscustomobject]@{ Title='Add Athletes to a Roster'; Slug='add-athletes-to-a-roster'; Category='Rosters'; Tags='coaches,roster,athletes,teams,memberships'; Excerpt='Add athletes fast without creating duplicate records.'; Intro='Roster quality starts with using existing athlete records and clean team membership updates.'; Before='Confirm target team and season are correct.|Search for existing athlete profile first.|Keep source roster list ready for reconciliation.'; Steps='Open team roster tools.|Search and select existing athletes.|Add athlete memberships for the right season.|Review final roster count and names.'; Failures='Creating duplicate athlete profiles.|Adding athletes to wrong season.|Skipping final roster count check.'; DoneRight='Roster has correct athletes once.|Memberships are tied to correct season.|Team count matches planning list.' },
  [pscustomobject]@{ Title='Review Guardian Requests'; Slug='review-guardian-requests'; Category='Rosters'; Tags='coaches,guardians,requests,approval,athletes'; Excerpt='Handle guardian attachment requests with confidence.'; Intro='Guardian request review protects athlete data while linking the right adults to the right profiles.'; Before='Open guardian requests queue.|Confirm athlete identity details.|Check request age and current status.'; Steps='Open /admin/guardian-requests.|Review each pending request and athlete match.|Approve valid requests and deny invalid ones with reason.|Recheck queue for remaining pending items.'; Failures='Approving request without identity check.|Leaving old requests unresolved.|No denial reason on rejected requests.'; DoneRight='Valid guardians are linked quickly.|Invalid requests are clearly denied.|Queue stays current and manageable.' },
  [pscustomobject]@{ Title='Create an Event'; Slug='create-an-event'; Category='Events'; Tags='coaches,events,schedule,calendar,publish'; Excerpt='Publish clear events that families can act on immediately.'; Intro='Event quality is operations quality. A clear event record reduces message noise and day-of confusion.'; Before='Confirm date, time, and location.|Decide audience and event type.|Prepare notes families need to execute.'; Steps='Open event create route.|Enter title, date, time, and location.|Set event type and audience fields.|Enable RSVP if needed and publish.|Verify event appears in calendar views.'; Failures='Publishing with placeholder details.|Wrong timezone or time fields.|Forgetting RSVP configuration.'; DoneRight='Event is complete and actionable.|Families see it in calendar quickly.|Follow-up questions drop.' },
  [pscustomobject]@{ Title='Edit Event Details'; Slug='edit-event-details'; Category='Events'; Tags='coaches,events,updates,schedule,changes'; Excerpt='Update event details without creating confusion.'; Intro='Schedule changes happen. Fast and precise updates keep families aligned and reduce missed arrivals.'; Before='Confirm what changed and who is affected.|Check if event is already close to start.|Prepare one clear update message.'; Steps='Open event detail and choose edit.|Update only fields that changed.|Save and verify event renders correctly.|Post announcement if change is high impact.'; Failures='Editing wrong event.|Changing too many fields without reason.|No communication for major schedule changes.'; DoneRight='Only intended details changed.|Calendar reflects final version.|Families know exactly what changed.' },
  [pscustomobject]@{ Title='Choose an RSVP Type'; Slug='choose-an-rsvp-type'; Category='Events'; Tags='coaches,rsvp,attendance,events,planning'; Excerpt='Pick general or athlete RSVP based on real planning needs.'; Intro='RSVP type controls attendance signal quality. Choose the mode that matches the operational decision you need.'; Before='Know whether response is family-level or athlete-level.|Set clear response deadline.|Confirm event audience.'; Steps='Open event configuration.|Set RSVP mode to general or athlete-specific.|Publish event and monitor incoming responses.|Follow up with non-responders before deadline.'; Failures='Using general RSVP for athlete-specific events.|No RSVP deadline buffer.|Ignoring missing responses.'; DoneRight='Response data matches planning needs.|Attendance prediction is more accurate.|Coaches can make faster decisions.' },
  [pscustomobject]@{ Title='Take Attendance Fast'; Slug='take-attendance-fast'; Category='Attendance'; Tags='coaches,attendance,events,status,tracking'; Excerpt='Capture attendance quickly with fewer errors.'; Intro='Attendance logs are more than compliance. They drive follow-up and reveal reliability trends over time.'; Before='Open the correct event roster.|Confirm athlete list is current.|Assign one person to record attendance.'; Steps='Open attendance for the event.|Mark each athlete present, absent, or late.|Resolve missing names before final save.|Submit attendance and confirm persistence.'; Failures='Recording from memory after event.|Leaving blank statuses.|Saving before roster is complete.'; DoneRight='Every athlete has a status.|Record is saved and reviewable.|Follow-up data is trustworthy.' },
  [pscustomobject]@{ Title='Post Team Announcements'; Slug='post-team-announcements'; Category='Communication'; Tags='coaches,announcements,messaging,teams,updates'; Excerpt='Send high-signal updates to the right audience.'; Intro='Announcements should be clear, scoped, and actionable. Good announcement hygiene reduces chat chaos.'; Before='Decide team-specific or org-wide scope.|Write one headline and one next action.|Set urgent flag only when truly needed.'; Steps='Open announcements in Huddles.|Select team and create announcement.|Add title and clear body copy.|Publish and verify it appears in list.'; Failures='Org-wide post for team-only issue.|Long post with no clear action.|Overuse of urgent priority.'; DoneRight='Right audience sees right message.|Action is obvious in one read.|Fewer clarifying replies are needed.' },
  [pscustomobject]@{ Title='Use Team Chat Channels'; Slug='use-team-chat-channels'; Category='Communication'; Tags='coaches,huddles,chat,channels,team-communication'; Excerpt='Use channels for fast discussion while keeping context organized.'; Intro='Chat should accelerate decisions, not scatter information. Channel discipline keeps teams responsive and clear.'; Before='Confirm team channels are available.|Choose proper channel before posting.|Keep announcements separate from chat when needed.'; Steps='Open /portal/huddles/chat.|Select team, org, or DM channel.|Post concise message with clear ask.|Use thread replies for follow-up context.'; Failures='Posting in wrong channel.|Mixing official announcements into chat stream.|No follow-up in thread for active topic.'; DoneRight='Messages stay in the right channel.|Replies stay contextual.|Team response time improves.' },
  [pscustomobject]@{ Title='Build a Travel Plan'; Slug='build-a-travel-plan'; Category='Travel'; Tags='coaches,travel,events,itinerary,logistics'; Excerpt='Create travel plans families can execute from one page.'; Intro='Travel planning works when schedule, meeting points, and contacts are accurate before publish.'; Before='Confirm event dates and locations.|Prepare itinerary checkpoints.|Identify support contacts.'; Steps='Open travel plan creation route.|Set dates, destination, and meeting location info.|Add key notes and itinerary context.|Publish and verify travel detail page quality.'; Failures='Publishing before event details are final.|Missing meeting location information.|No clear contact for issues.'; DoneRight='Travel page is actionable and complete.|Families can navigate without extra messages.|Staff corrections are minimal.' },
  [pscustomobject]@{ Title='Update Travel Contacts'; Slug='update-travel-contacts'; Category='Travel'; Tags='coaches,travel,contacts,support,communication'; Excerpt='Keep travel support contacts accurate across plans.'; Intro='Families move faster when travel contacts are obvious and current.'; Before='Review current contact assignments.|Know which categories need custom overrides.|Verify phone and email accuracy.'; Steps='Open travel detail or plan contact settings.|Update category contacts where needed.|Save and verify contact card output.|Test call and email links in UI.'; Failures='Old contact left active after staff change.|Missing contact category coverage.|Invalid phone or email values.'; DoneRight='Contact card shows correct people.|Families can reach support instantly.|Travel disruptions are resolved faster.' },
  [pscustomobject]@{ Title='Open Tryout Registration'; Slug='open-tryout-registration'; Category='Tryouts'; Tags='coaches,tryouts,registration,athletes,events'; Excerpt='Publish tryouts with clean registration flow.'; Intro='Tryout registration is a first impression. Clean setup improves completion and reduces check-in friction.'; Before='Finalize tryout date, age group, and location.|Confirm registration path is visible to families.|Set support contact for registration questions.'; Steps='Create or update tryout details.|Publish tryout and verify listing appears.|Test registration flow with one athlete profile.|Monitor early registrations for errors.'; Failures='Incomplete tryout details at publish.|Broken registration path not tested.|No support contact for families.'; DoneRight='Families can register without confusion.|Registrations appear correctly in progress state.|Check-in prep is easier.' },
  [pscustomobject]@{ Title='Update Tryout Results'; Slug='update-tryout-results'; Category='Tryouts'; Tags='coaches,tryouts,status,offers,decisions'; Excerpt='Move registrations through decision statuses cleanly.'; Intro='Clear status updates keep families informed and reduce repetitive outreach after evaluations.'; Before='Finalize evaluation decisions.|Prepare notes for offer or decline state.|Review current registration statuses.'; Steps='Open tryout registrations list.|Update registration to offered, accepted, or declined as needed.|Add notes when relevant.|Verify status changes in progress view.'; Failures='Incorrect status applied to athlete.|No note for sensitive decision states.|Leaving records in stale registered state.'; DoneRight='Statuses reflect final decisions.|Families see clear next state.|No unresolved records remain.' },
  [pscustomobject]@{ Title='Launch Uniform Orders'; Slug='launch-uniform-orders'; Category='Uniforms'; Tags='coaches,uniforms,kits,sizes,deadlines'; Excerpt='Set up uniform kits with clear size and deadline rules.'; Intro='Uniform operations run smoother when kit setup is complete before families start ordering.'; Before='Confirm required items and size options.|Set deadline and lock policy.|Assign support contact.'; Steps='Create or edit uniform kit.|Add items, required flags, and size options.|Set status and deadline.|Publish and verify portal kit visibility.'; Failures='Missing required item setup.|No deadline set.|Incomplete size options for key items.'; DoneRight='Kit is clear and complete.|Families can submit without guesswork.|Exceptions are reduced before deadline.' },
  [pscustomobject]@{ Title='Review Uniform Submissions'; Slug='review-uniform-submissions'; Category='Uniforms'; Tags='coaches,uniforms,orders,exceptions,deadlines'; Excerpt='Catch missing sizes early and clean up submissions fast.'; Intro='Exception review before lock date is the fastest way to avoid vendor delays.'; Before='Open current uniform submission list.|Sort by missing or incomplete records.|Set outreach owner for fixes.'; Steps='Filter for incomplete submissions.|Contact families with exact missing fields.|Track corrections daily.|Re-run filter before lock date.'; Failures='Waiting until deadline day to review.|Vague correction requests.|Submitting final batch with known gaps.'; DoneRight='Incomplete queue is near zero at lock.|Final order data is vendor-ready.|No rush-day correction scramble.' },
  [pscustomobject]@{ Title='Publish a Ticketed Event'; Slug='publish-a-ticketed-event'; Category='Ticketing'; Tags='coaches,ticketing,events,sales,publish'; Excerpt='Launch event ticket sales with fewer avoidable issues.'; Intro='Ticketed events need precise setup to protect fan experience and gate operations.'; Before='Confirm event details and capacity assumptions.|Set sales window timing.|Prepare first-hour monitoring owner.'; Steps='Create ticketed event record.|Set fan visibility and event assets.|Publish and verify public event listing.|Run one internal checkout smoke test.'; Failures='Publishing without checkout test.|Wrong sales window timing.|Event details not final at launch.'; DoneRight='Public listing is accurate.|Checkout is working from launch.|Support volume stays low.' },
  [pscustomobject]@{ Title='Set Ticket Types and Limits'; Slug='set-ticket-types-and-limits'; Category='Ticketing'; Tags='coaches,ticketing,pricing,capacity,limits'; Excerpt='Configure ticket options, inventory, and order limits clearly.'; Intro='Ticket type clarity drives conversion and protects inventory under demand.'; Before='Define ticket audiences and price points.|Set per-order limits where needed.|Verify total capacity model.'; Steps='Create ticket types with clear labels.|Set prices and sales windows per type.|Set quantity limits if needed.|Validate capacity and save.|Preview in event detail page.'; Failures='Confusing ticket names.|Inventory beyond venue capacity.|Overlapping windows with unclear behavior.'; DoneRight='Ticket choices are easy to understand.|Capacity control is stable.|Sales flow remains predictable.' },
  [pscustomobject]@{ Title='Build a Seat Map'; Slug='build-a-seat-map'; Category='Ticketing'; Tags='coaches,ticketing,seats,seat-map,reserved-seating'; Excerpt='Configure reserved seating maps that work on game day.'; Intro='Reserved seating only works when section, row, and seat data are accurate before sales start.'; Before='Confirm final venue layout.|Define section and row conventions.|Plan seat attributes and pricing zones.'; Steps='Open seat map builder.|Create sections and seat ranges.|Apply attributes and save map.|Attach map to ticketed event.|Test seat selection behavior in checkout.'; Failures='Wrong map attached to event.|Seat inventory errors in a section.|No seat selection test before launch.'; DoneRight='Seats are selectable and accurate.|Capacity matches real layout.|Gate team trusts ticket seat data.' },
  [pscustomobject]@{ Title='Run Ticket Scanner Day'; Slug='run-ticket-scanner-day'; Category='Ticketing'; Tags='coaches,ticketing,scanner,entry,game-day'; Excerpt='Operate scanner flow smoothly during live entry windows.'; Intro='Game-day scanning is where ticket operations succeed or fail in public view.'; Before='Test scanner setup before gates open.|Assign one owner for scanner alerts.|Prepare fallback manual entry code process.'; Steps='Open scanner route for target event.|Run test scan with known valid ticket.|Start live scanning and monitor duplicate alerts.|Resolve invalid scans using order lookup when needed.|Keep entry line moving with clear fallback path.'; Failures='No pre-open scanner test.|Unassigned ownership for scan issues.|Ignoring duplicate or invalid scan alerts.'; DoneRight='Entry lines move steadily.|Valid tickets scan quickly.|Exceptions are handled without escalation chaos.' },
  [pscustomobject]@{ Title='Share Team Videos and Notes'; Slug='share-team-videos-and-notes'; Category='Media'; Tags='coaches,videos,feedback,notes,athletes'; Excerpt='Upload, tag, and share video feedback with the right audience.'; Intro='Video feedback is high value when notes are clear, scoped, and easy for families to navigate.'; Before='Open /admin/videos library.|Confirm team and athlete links for target video.|Decide note visibility scope before posting.'; Steps='Upload or open a video record.|Link athletes and add tags as needed.|Add timestamped notes with clear titles.|Set note scope for coaches, all, or guardians where supported.|Publish and verify guardian view behavior.'; Failures='Notes posted with wrong scope.|Missing athlete links on targeted feedback.|No timestamps for key coaching moments.'; DoneRight='Families can find relevant feedback fast.|Coach notes are contextual and actionable.|Video review becomes a repeatable workflow.' }
)

$rows = for ($i = 0; $i -lt $articles.Count; $i++) {
  $a = $articles[$i]
  [pscustomobject]@{
    ID = ''
    Title = $a.Title
    Content = (Build-Content -a $a)
    Excerpt = $a.Excerpt
    Slug = $a.Slug
    Status = 'publish'
    Parent = ''
    Order = $i + 1
    Author = 'admin'
    Date = $date
    'Allow Comments' = 'closed'
    'Allow Pingbacks' = 'closed'
    Categories = $a.Category
    Tags = $a.Tags
    Section = $a.Category
    'Role Category' = 'Coaches'
  }
}

$outPath = Join-Path (Get-Location) 'help-center-coach-import-20-posts.csv'
$rows | Export-Csv -Path $outPath -NoTypeInformation -Encoding UTF8

Write-Output "Wrote: $outPath"
Write-Output "Rows: $($rows.Count)"
