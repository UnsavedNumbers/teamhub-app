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

  $reasons = To-Li (Split-List $a.Reasons)
  $benefits = To-Li (Split-List $a.Benefits)
  $eval = To-Li (Split-List $a.EvalSteps)

  return @"
<h1>$($a.Title)</h1>
<p>$($a.QuickAnswer)</p>
<p>$($a.Context)</p>

<h2>Why this matters</h2>
<ul>
$reasons
</ul>

<h2>What you unlock with YouthSports</h2>
<ul>
$benefits
</ul>

<h2>How to evaluate fit</h2>
<ol>
$eval
</ol>

<p>Want to see this in your own workflow? Request a YouthSports demo and we will map it to your season operations.</p>
"@
}

$date = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

$articles = @(
  [pscustomobject]@{
    Title='What is YouthSports?'
    Slug='what-is-youthsports'
    Excerpt='A modern platform for youth sports operations.'
    Tags='faq,overview,operations,platform'
    QuickAnswer='YouthSports is an operations platform for clubs, schools, and organizations that run youth teams.'
    Context='It brings rosters, scheduling, communication, payments, travel, uniforms, and ticketing into one connected system.'
    Reasons='Too many disconnected tools create missed updates and duplicated work.|A single system keeps staff, coaches, and families on the same page.|Connected workflows reduce manual follow-up across the season.'
    Benefits='One source of truth for athletes, guardians, and teams.|Faster updates when plans change.|Clear accountability across staff and coaches.'
    EvalSteps='List your current tools and pain points.|Map your top three weekly workflows in YouthSports.|Confirm decision owners can act without extra admin overhead.'
  }
  [pscustomobject]@{
    Title='Who is YouthSports built for?'
    Slug='who-is-youthsports-built-for'
    Excerpt='Built for clubs, schools, and sports organizations.'
    Tags='faq,buyers,clubs,schools'
    QuickAnswer='YouthSports is built for administrators, directors, coaches, and families who need execution, not just information.'
    Context='It works best for organizations that run recurring events, manage athlete data, and coordinate family communication at scale.'
    Reasons='Decision makers need visibility into day to day execution.|Coaches need fast tools that fit real practice and game workflows.|Families need clear updates and fewer channels to monitor.'
    Benefits='Stronger consistency across teams.|Lower operational friction for staff.|Better family experience from registration to game day.'
    EvalSteps='Identify your primary buyer and operator roles.|Confirm each role has a clear workflow inside YouthSports.|Review where fewer handoffs will create immediate value.'
  }
  [pscustomobject]@{
    Title='Can one platform handle daily operations and family communication?'
    Slug='one-platform-for-operations-and-family-communication'
    Excerpt='Yes, operations and communication are connected.'
    Tags='faq,communication,operations,huddles'
    QuickAnswer='Yes. YouthSports connects operational actions to communication surfaces so updates stay aligned.'
    Context='When events, rosters, and travel details change, families can see the same source data coaches and admins are using.'
    Reasons='Most confusion comes from data changing in one place and messaging in another.|Operational context should travel with each update.|Families should not have to reconcile conflicting sources.'
    Benefits='More accurate announcements and chat updates.|Fewer clarification messages from families.|Higher trust in official team communications.'
    EvalSteps='Review how event updates are shared today.|Test announcements and chat against real event changes.|Confirm families can find updates without staff follow-up.'
  }
  [pscustomobject]@{
    Title='How fast can we launch?'
    Slug='how-fast-can-we-launch'
    Excerpt='Launch quickly with a practical rollout plan.'
    Tags='faq,launch,onboarding,implementation'
    QuickAnswer='Most organizations can launch core workflows quickly when they start with one clear phase.'
    Context='A focused rollout, team setup, roster validation, and event publishing usually gives early wins without long implementation cycles.'
    Reasons='Fast wins build trust internally.|A phased launch reduces risk and rework.|Early adoption improves data quality for later phases.'
    Benefits='Teams can start using schedule, roster, and communication flows early.|Staff can add payments, travel, and ticketing in planned steps.|Leadership gets measurable adoption quickly.'
    EvalSteps='Choose one pilot group and one season context.|Launch core team workflows first.|Expand features after first live cycle feedback.'
  }
  [pscustomobject]@{
    Title='Does YouthSports support multiple teams and seasons?'
    Slug='supports-multiple-teams-and-seasons'
    Excerpt='Yes, teams and seasons are supported at scale.'
    Tags='faq,teams,seasons,scaling'
    QuickAnswer='Yes. YouthSports is designed for organizations managing multiple teams and season contexts.'
    Context='Data relationships between athletes, teams, and seasons help prevent confusion when programs run in parallel.'
    Reasons='Staff need a clean structure as organizations grow.|Coaches should operate in the right context by default.|Families should not lose clarity when schedules overlap.'
    Benefits='Cleaner roster assignments by season.|Better reporting and accountability by team.|Less cross team data confusion.'
    EvalSteps='List your active and upcoming seasons.|Verify team and roster context behavior in a pilot.|Confirm admin workflows across multiple teams.'
  }
  [pscustomobject]@{
    Title='How do guardians connect to athlete profiles?'
    Slug='how-guardians-connect-to-athlete-profiles'
    Excerpt='Guardians are linked to athletes through structured flows.'
    Tags='faq,guardians,athletes,rosters'
    QuickAnswer='Guardians connect to athlete profiles through invite and relationship flows that keep records clean.'
    Context='This protects athlete data while giving families the access they need for schedules, communication, and payments.'
    Reasons='Bad profile links create payment and communication errors.|Relationship clarity is critical in youth sports logistics.|Accurate links reduce support load for admins.'
    Benefits='Faster guardian onboarding.|Cleaner family level communication.|More reliable roster and payment context.'
    EvalSteps='Test guardian join and link flow with sample data.|Validate visibility from guardian view.|Review how staff resolves edge cases.'
  }
  [pscustomobject]@{
    Title='Can families view schedules and RSVP in one place?'
    Slug='families-view-schedules-and-rsvp-in-one-place'
    Excerpt='Yes, schedule visibility and RSVP are connected.'
    Tags='faq,schedule,rsvp,families'
    QuickAnswer='Yes. Families can view events and submit RSVP responses from the same platform.'
    Context='This gives coaches better attendance signals and helps families respond without jumping across tools.'
    Reasons='RSVP data drives staffing and travel decisions.|Families need one clear schedule source.|Late response follow-up should be easier to manage.'
    Benefits='Improved planning confidence for coaches.|Less uncertainty before events.|Cleaner event readiness each week.'
    EvalSteps='Publish a sample week of events.|Test RSVP behavior from family view.|Confirm coach workflows for non responders.'
  }
  [pscustomobject]@{
    Title='Can we collect team fees online?'
    Slug='collect-team-fees-online'
    Excerpt='Yes, online fee collection is supported.'
    Tags='faq,payments,fees,collections'
    QuickAnswer='Yes. YouthSports supports digital fee collection to reduce manual payment tracking.'
    Context='Families get a clearer payment path while admins and coaches reduce reconciliation effort.'
    Reasons='Manual collections slow operations and create reporting gaps.|Families expect digital payment options.|Payment clarity reduces season friction.'
    Benefits='More consistent collections.|Less manual follow-up from staff.|Better visibility into payment status.'
    EvalSteps='Define one pilot fee flow.|Test payer experience and confirmation behavior.|Review reporting for outstanding balances.'
  }
  [pscustomobject]@{
    Title='How does ticketing work in YouthSports?'
    Slug='how-ticketing-works-in-youthsports'
    Excerpt='Ticketed events, checkouts, and scanner workflows are supported.'
    Tags='faq,ticketing,events,game-day'
    QuickAnswer='YouthSports supports ticketed events with purchase and game day scan workflows.'
    Context='Organizations can publish events, configure ticket options, and run entry operations with fewer moving parts.'
    Reasons='Game day operations need speed and accuracy.|Ticket setup should connect to event context.|Entry exceptions need a clear handling path.'
    Benefits='Smoother public event operations.|Better control over event access.|Reduced gate confusion on busy days.'
    EvalSteps='Run a pilot event with internal testing.|Validate checkout and scanner flow end to end.|Measure line speed and support issues on game day.'
  }
  [pscustomobject]@{
    Title='Can we manage travel plans and contacts?'
    Slug='manage-travel-plans-and-contacts'
    Excerpt='Yes, travel details and contacts are manageable in platform.'
    Tags='faq,travel,logistics,contacts'
    QuickAnswer='Yes. YouthSports supports travel planning workflows and key contact visibility.'
    Context='This helps families and staff align on itinerary details, meeting points, and support contacts.'
    Reasons='Travel confusion has high operational impact.|Families need immediate access to reliable details.|Contacts must stay current during active trips.'
    Benefits='Better trip readiness.|Fewer day of travel messages.|Faster issue resolution when plans shift.'
    EvalSteps='Model one upcoming trip in platform.|Review family travel detail visibility.|Confirm contact update process for staff.'
  }
  [pscustomobject]@{
    Title='Can we run uniform workflows in YouthSports?'
    Slug='run-uniform-workflows-in-youthsports'
    Excerpt='Yes, uniform setup and submission tracking are supported.'
    Tags='faq,uniforms,orders,operations'
    QuickAnswer='Yes. YouthSports supports uniform setup, size capture, and submission tracking workflows.'
    Context='Organizations can reduce deadline chaos by collecting complete uniform data in one process.'
    Reasons='Uniform errors are costly late in the cycle.|Families need clear requirements and deadlines.|Staff need fast exception review before lock dates.'
    Benefits='Cleaner order data.|Lower rush corrections near deadlines.|More reliable handoff to fulfillment.'
    EvalSteps='Set up one uniform kit in a pilot.|Track completion status by team.|Review exception handling before final cutoff.'
  }
  [pscustomobject]@{
    Title='Does YouthSports support tryout registration and decisions?'
    Slug='supports-tryout-registration-and-decisions'
    Excerpt='Yes, tryout registration and status updates are supported.'
    Tags='faq,tryouts,registration,status'
    QuickAnswer='Yes. YouthSports supports tryout registration flows and status progression workflows.'
    Context='This helps programs move from interest to final outcomes with clearer process visibility.'
    Reasons='Tryouts involve high volume and high urgency updates.|Status transitions should be consistent.|Families need clear next step communication.'
    Benefits='Stronger tryout process control.|Fewer status errors.|Better communication confidence after evaluations.'
    EvalSteps='Run a sample tryout registration cycle.|Test status updates and review views.|Confirm communication workflow for outcomes.'
  }
  [pscustomobject]@{
    Title='Can coaches track attendance quickly?'
    Slug='coaches-track-attendance-quickly'
    Excerpt='Yes, attendance workflows are built for speed.'
    Tags='faq,attendance,coaches,events'
    QuickAnswer='Yes. YouthSports includes attendance workflows designed for fast event level tracking.'
    Context='Reliable attendance signals support planning, follow-up, and accountability across the season.'
    Reasons='Attendance is often captured under time pressure.|Data quality matters for follow-up decisions.|Coaches need low friction input flow.'
    Benefits='Faster post event review.|Cleaner participation records.|Better visibility for staff and families.'
    EvalSteps='Pilot attendance on active events.|Measure completion time for coaches.|Review downstream reporting value.'
  }
  [pscustomobject]@{
    Title='How does team communication work?'
    Slug='how-team-communication-works'
    Excerpt='Announcements and chat keep teams aligned.'
    Tags='faq,communication,announcements,chat'
    QuickAnswer='YouthSports supports team communication through structured announcements and chat channels.'
    Context='This separates official updates from conversational coordination while keeping both in one ecosystem.'
    Reasons='Mixed communication channels cause missed context.|Teams need both broadcast and discussion patterns.|Audience targeting is essential for clarity.'
    Benefits='Higher signal to noise in team updates.|Better response speed to operational changes.|Less duplicate messaging across apps.'
    EvalSteps='Publish a test announcement to one team.|Run a live chat coordination scenario.|Review message clarity with coaches and families.'
  }
  [pscustomobject]@{
    Title='Can we manage photos and video feedback?'
    Slug='manage-photos-and-video-feedback'
    Excerpt='Yes, media workflows support galleries and coaching feedback.'
    Tags='faq,media,photos,video,feedback'
    QuickAnswer='Yes. YouthSports supports photo and video workflows that keep media connected to team and athlete context.'
    Context='Organizations can share highlights while coaches can organize feedback in a more structured way.'
    Reasons='Media often lives in disconnected folders and chats.|Context matters for athlete specific feedback.|Families want easier access to approved team media.'
    Benefits='Better media organization.|More useful coaching feedback loops.|Cleaner sharing experience for families.'
    EvalSteps='Test gallery and video workflows with one team.|Validate permission behavior by role.|Review coach and family experience.'
  }
  [pscustomobject]@{
    Title='How are permissions controlled?'
    Slug='how-permissions-are-controlled'
    Excerpt='Role based access helps each user see the right workflows.'
    Tags='faq,permissions,roles,security'
    QuickAnswer='YouthSports uses role aware access patterns so users see workflows appropriate to their responsibilities.'
    Context='This helps protect sensitive actions while keeping day to day tasks efficient for each role.'
    Reasons='Permission mistakes create risk and confusion.|Admins need control without slowing coaches.|Families need clear access to their own context.'
    Benefits='Safer operations across teams.|Clearer user experience by role.|Reduced accidental changes in sensitive areas.'
    EvalSteps='Review role matrix for your organization.|Test sensitive workflows by role.|Confirm escalation path for permission changes.'
  }
  [pscustomobject]@{
    Title='Is YouthSports mobile friendly?'
    Slug='is-youthsports-mobile-friendly'
    Excerpt='Yes, key workflows are designed for on the go use.'
    Tags='faq,mobile,usability,families'
    QuickAnswer='Yes. Core workflows are designed to work across desktop and mobile experiences.'
    Context='This helps coaches and families execute updates quickly from the field, gym, or travel context.'
    Reasons='Sports operations happen away from desks.|Families rely on phone first workflows.|Time critical updates need reliable mobile access.'
    Benefits='Faster response to schedule changes.|Better real world adoption.|Less delay in execution tasks.'
    EvalSteps='Test your top workflows on mobile and desktop.|Validate loading and completion speed.|Gather feedback from coaches and guardians.'
  }
  [pscustomobject]@{
    Title='Can we start with one workflow and expand later?'
    Slug='start-with-one-workflow-and-expand'
    Excerpt='Yes, phased rollout is a common adoption path.'
    Tags='faq,rollout,adoption,scaling'
    QuickAnswer='Yes. Many organizations begin with one high impact workflow and expand in phases.'
    Context='This keeps change management practical while still creating measurable progress early.'
    Reasons='Big bang rollouts increase risk.|Teams adopt faster when value is immediate.|Phased expansion improves long term data quality.'
    Benefits='Lower launch pressure.|Faster internal buy in.|Cleaner long term adoption across features.'
    EvalSteps='Choose your first high impact use case.|Define a 30 day success target.|Expand only after pilot metrics are stable.'
  }
  [pscustomobject]@{
    Title='What support does YouthSports provide during onboarding?'
    Slug='support-during-onboarding'
    Excerpt='Support focuses on practical rollout and adoption.'
    Tags='faq,support,onboarding,customer-success'
    QuickAnswer='YouthSports onboarding support is focused on practical execution, role alignment, and early adoption outcomes.'
    Context='The goal is not just setup completion, it is confident daily use by your core operators.'
    Reasons='Configuration without adoption does not create value.|Teams need clear rollout ownership.|Early support reduces avoidable rework.'
    Benefits='Faster confidence for admins and coaches.|More predictable launch outcomes.|Stronger long term platform usage.'
    EvalSteps='Align on launch owners and timeline.|Define your first live workflows.|Review adoption checkpoints with your implementation team.'
  }
  [pscustomobject]@{
    Title='How do we get pricing and a live demo?'
    Slug='get-pricing-and-live-demo'
    Excerpt='Book a demo and get pricing aligned to your needs.'
    Tags='faq,pricing,demo,buying'
    QuickAnswer='Request a live demo to review workflows, rollout approach, and pricing for your organization.'
    Context='The best demo path is built around your current process, team structure, and season priorities.'
    Reasons='Decision makers need proof in their own context.|Pricing should match operational scope.|Stakeholders need clarity before committing to change.'
    Benefits='Faster buying confidence.|Clear implementation expectations.|Stronger alignment across leadership and operators.'
    EvalSteps='Share your current stack and pain points.|Bring admin and coaching stakeholders to the demo.|Review proposed rollout and pricing options.'
  }
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
    Categories = 'FAQ'
    Tags = $a.Tags
    Section = 'FAQ'
    'Role Category' = 'Public'
  }
}

$outPath = Join-Path (Get-Location) 'marketing-faq-import-20-posts.csv'
$csvLines = $rows | ConvertTo-Csv -NoTypeInformation
[System.IO.File]::WriteAllLines($outPath, $csvLines, [System.Text.UTF8Encoding]::new($false))

Write-Output "Wrote: $outPath"
Write-Output "Rows: $($rows.Count)"
