Continue building the existing "ANTARCTIC NAVIGATION AI" project from Phase 1.

IMPORTANT:
DO NOT REBUILD THE WEBSITE FROM SCRATCH.

Use the existing Phase 1 design, components, navigation structure, color palette, typography, and overall visual identity as the foundation.

The attached/current Phase 1 prototype is the starting point.

PHASE 2 OBJECTIVE:

Expand the prototype from a basic route-planning interface into a professional Antarctic Navigation Intelligence and Decision Support dashboard.

Phase 2 should introduce:

1. Iceberg Prediction Dashboard
2. Sea-Ice Concentration Prediction Dashboard
3. Environmental Intelligence
4. Prediction visualization
5. Prediction confidence and uncertainty
6. Prediction timeline
7. Help & Support center
8. Contact Us
9. Email support
10. User support request interface
11. Documentation / FAQ interface
12. Better system navigation

IMPORTANT:

This phase is primarily a FRONTEND/UI prototype.

Use realistic MOCK DATA.

DO NOT pretend that the ML models are already connected.

The prediction dashboards should be designed so that actual ML predictions can be connected later.

Do not invent scientific claims.

Clearly label mock/example predictions where appropriate.

==================================================
1. PRESERVE THE EXISTING DESIGN
==================================================

Keep the existing visual identity from Phase 1.

The system should continue to feel like:

Scientific Antarctic Navigation
+
Research Vessel Decision Support
+
Environmental Intelligence

Avoid turning it into a generic SaaS dashboard.

Do NOT use:

- purple AI gradients
- excessive glassmorphism
- excessive glowing effects
- unnecessary animations
- generic chatbot graphics
- gaming UI
- futuristic sci-fi styling

Maintain a professional operational/scientific appearance.

==================================================
2. COLOR PALETTE
==================================================

Continue using the existing palette:

Main background:
#071521

Secondary background:
#0D2433

Cards/panels:
#132F40

Primary accent:
#55D6E8

Secondary accent:
#8CCFE0

Normal data / routes:
#3B82F6

Safe:
#46D7A1

Warning:
#F5B942

Danger:
#FF5C5C

Primary text:
#EAF6F8

Muted text:
#91AEB9

Do not make the entire interface cyan.

Cyan = interaction / important information
Blue = normal data
Green = safe
Amber = warning
Red = danger

==================================================
3. UPDATE THE MAIN NAVIGATION
==================================================

Expand the existing navigation.

Navigation should include:

Dashboard
Route Planning
Iceberg Prediction
Sea-Ice Prediction
Environmental Data
Hazards
Re-Routing
What-If Analysis
Reports

----------------

SUPPORT

Help & Support
Contact Us

----------------

Settings

Use appropriate Lucide icons.

The active page should have a subtle Ice Cyan highlight.

==================================================
4. MAIN DASHBOARD
==================================================

Upgrade the existing dashboard.

The dashboard should provide a quick operational overview.

Header:

ANTARCTIC NAVIGATION AI

Status:

● SYSTEM NOMINAL

Data:

● DATA AVAILABLE

Show:

Current Date
Current UTC Time
Last Data Update

==================================================
5. DASHBOARD KPI CARDS
==================================================

At the top of the dashboard create compact KPI cards.

Example:

ACTIVE ICEBERGS

247

PREDICTED HAZARDS

18

SEA-ICE COVERAGE

35%

CURRENT ROUTE RISK

32 / 100

PREDICTION CONFIDENCE

87%

These are MOCK values.

Do not imply these are real-time values.

Label them appropriately as:

SIMULATION DATA

or

DEMO DATA

where appropriate.

==================================================
6. ICEBERG PREDICTION DASHBOARD
==================================================

Create a dedicated page:

ICEBERG PREDICTION

This should be one of the most important pages in the application.

Purpose:

Allow the user to understand:

- current iceberg positions
- predicted iceberg movement
- prediction horizon
- trajectory
- uncertainty
- risk to vessel routes

==================================================
7. ICEBERG MAP
==================================================

Create a large Antarctic map.

Display:

Current iceberg positions
Vessel position
Predicted iceberg trajectories
Prediction corridors
Route
Hazard zones

Use:

Iceberg:
Amber / Red depending on risk

Vessel:
Ice Cyan

Route:
Electric Blue

Predicted trajectory:
Dashed Cyan

High-risk area:
Transparent Red

Uncertainty:
Transparent blue/cyan corridor

Do not represent predictions as exact future points.

==================================================
8. ICEBERG PREDICTION TIMELINE
==================================================

Add a prediction horizon selector:

6 HOURS
12 HOURS
24 HOURS
48 HOURS
72 HOURS

When selected, update the visualization.

Example:

Current:
24 Aug 2026 10:00 UTC

+6h
24 Aug 16:00

+12h
24 Aug 22:00

+24h
25 Aug 10:00

+48h
26 Aug 10:00

+72h
27 Aug 10:00

Use mock prediction data.

==================================================
9. ICEBERG DETAILS PANEL
==================================================

When the user clicks an iceberg, open a details panel.

Example:

ICEBERG ID
IBG-1247

CURRENT POSITION
78.42° S
21.34° W

OBSERVED
25 Aug 2026
10:00 UTC

CURRENT SPEED
0.42 m/s

HEADING
215°

PREDICTION HORIZON
72 HOURS

CONFIDENCE
87%

RISK LEVEL
MEDIUM

Also show:

Predicted Position

+24h
Latitude / Longitude

+48h
Latitude / Longitude

+72h
Latitude / Longitude

Use mock values.

==================================================
10. UNCERTAINTY VISUALIZATION
==================================================

This is a critical scientific UI element.

Show:

Predicted trajectory
+
Uncertainty corridor

The uncertainty corridor should visually become wider farther into the future.

Example:

Current position
     |
     | narrow
     |
     |------ prediction
     |     corridor
     |
     |--------- wider
     |
     |--------------- wider
     +---------------------->

Label:

95% Prediction Uncertainty Corridor

Do NOT claim that this represents actual model output.

Use:

DEMO PREDICTION

until the real model is connected.

==================================================
11. ICEBERG RISK PANEL
==================================================

Create:

ICEBERG RISK ASSESSMENT

Show:

Distance from vessel
Predicted closest approach
Trajectory intersection
Prediction confidence
Risk level

Example:

Distance:
18 nm

Closest approach:
+14h

Trajectory intersection:
POSSIBLE

Confidence:
87%

Risk:
HIGH

Use appropriate warning colors.

==================================================
12. SEA-ICE PREDICTION DASHBOARD
==================================================

Create a separate dedicated page:

SEA-ICE PREDICTION

This page should visually communicate predicted sea-ice concentration.

The page should include:

Large Antarctic map
Sea-ice concentration overlay
Prediction timeline
Current concentration
Predicted concentration
Change in concentration
Affected routes

==================================================
13. SEA-ICE MAP
==================================================

Create a heatmap-style Antarctic sea-ice visualization.

Use a scientifically understandable concentration scale.

Example:

0–10%
Very Low

10–30%
Low

30–50%
Moderate

50–70%
High

70–100%
Very High

Do not use the normal risk colors for the entire sea-ice map.

Use a cold scientific scale based around:

#8CCFE0
#55D6E8
#3B82F6

with stronger visual intensity representing greater concentration.

The map should remain readable.

==================================================
14. SEA-ICE PREDICTION TIMELINE
==================================================

Provide:

CURRENT
+24 HOURS
+48 HOURS
+72 HOURS

Allow the user to switch between them.

For each time:

Show:

Average concentration
Minimum concentration
Maximum concentration
Change from current

Example:

CURRENT

35%

+24 HOURS

38%

+48 HOURS

42%

+72 HOURS

46%

Clearly mark these as:

DEMO / MOCK DATA

==================================================
15. SEA-ICE REGION DETAILS
==================================================

When clicking a sea-ice region, display:

Region
Current concentration
Predicted concentration
Change
Prediction confidence
Affected route

Example:

REGION:
Weddell Sea

CURRENT:
42%

+24H:
45%

CHANGE:
+3%

CONFIDENCE:
82%

ROUTE IMPACT:
MEDIUM

==================================================
16. ENVIRONMENTAL INTELLIGENCE
==================================================

Create:

ENVIRONMENTAL DATA

Show:

Air Temperature
Sea Surface Temperature
Wind Speed
Wind Direction
Wave Height
Visibility
Ocean Current Speed
Ocean Current Direction
Sea-Ice Concentration

Use compact scientific cards.

Example:

WIND

18 kn
NE

CURRENT

0.6 kn
SW

VISIBILITY

2.1 km

WAVE HEIGHT

2.4 m

These are demo values.

==================================================
17. ENVIRONMENTAL TIMELINE
==================================================

Add a timeline:

NOW
+6H
+12H
+24H
+48H
+72H

Allow the user to see how environmental conditions change over time.

This is a frontend simulation.

The architecture should later allow real forecast data to replace the mock values.

==================================================
18. HAZARDS PAGE
==================================================

Upgrade the existing Hazards page.

Show categories:

ICEBERG
SEA ICE
WEATHER
VISIBILITY
OCEAN CONDITIONS

Each hazard card should contain:

Hazard
Location
Severity
Detection time
Predicted impact time
Confidence
Affected route

Example:

HIGH ICEBERG RISK

Location:
78.42°S / 21.34°W

Predicted impact:
+14h

Confidence:
87%

Affected:
Route A

==================================================
19. HELP & SUPPORT CENTER
==================================================

Create a dedicated:

HELP & SUPPORT

page.

This should look like a real support center designed specifically for the Antarctic Navigation AI system.

Do NOT make it a generic FAQ page.

The page should contain:

Search Help

[ Search for a question or feature... ]

Categories:

Getting Started
Navigation
Iceberg Predictions
Sea-Ice Predictions
Route Planning
Risk Assessment
Re-Routing
Data & Forecasts
Reports
Account / Settings

==================================================
20. FAQ SECTION
==================================================

Include useful mock FAQ entries.

Examples:

"What does the iceberg prediction mean?"

"How is the prediction confidence displayed?"

"What is the uncertainty corridor?"

"How does sea-ice concentration affect route planning?"

"What does the route risk score represent?"

"How does dynamic re-routing work?"

"How often is environmental data updated?"

"Can I change the vessel speed?"

"How do I generate a navigation report?"

Clicking a question should expand the answer.

Keep answers concise and clearly mark scientific/model-specific details as subject to the eventual implementation.

==================================================
21. SUPPORT CONTACT OPTIONS
==================================================

The Help & Support page must prominently provide:

EMAIL SUPPORT

CONTACT US

REPORT AN ISSUE

REQUEST TECHNICAL SUPPORT

These should be separate cards/buttons.

==================================================
22. EMAIL SUPPORT
==================================================

Create an email support interface.

When clicked:

Open a support form.

Fields:

Name
Email
Organization
Subject
Issue Category
Priority
Message
Attachment

Issue Category:

Technical Issue
Prediction Issue
Map Issue
Data Issue
Route Issue
Account Issue
Other

Priority:

Low
Medium
High
Critical

Button:

SEND SUPPORT REQUEST

Since this is a prototype, the form does not need to send an actual email.

Show a successful submission state:

"Support request submitted successfully."

Ticket ID:

SUP-2026-00124

Clearly indicate that this is demo functionality.

==================================================
23. CONTACT US PAGE
==================================================

Create a professional:

CONTACT US

page.

Sections:

GENERAL INQUIRIES

TECHNICAL SUPPORT

DATA / RESEARCH

PARTNERSHIPS

Provide:

Email
Phone
Support hours
Organization information

Use placeholder/demo contact details.

IMPORTANT:

Do NOT invent real government contact information.

Use clearly marked placeholders such as:

support@example.org

+91 XXX XXX XXXX

Replace these later with actual project contact details.

==================================================
24. CONTACT FORM
==================================================

Create:

CONTACT US

form:

Full Name
Email
Organization
Subject
Message

Button:

SEND MESSAGE

After submission:

"Message submitted successfully."

Show:

We will respond to your registered email address.

This is a frontend simulation.

==================================================
25. REPORT AN ISSUE
==================================================

Create a dedicated issue-report modal.

Fields:

Issue Type

Prediction
Map
Route
Sea-Ice
Iceberg
Weather
Other

Severity:

Low
Medium
High
Critical

Description

Attach Screenshot

Submit Issue

After submission show:

Issue Reported

Reference:
ISSUE-XXXX

==================================================
26. SUPPORT STATUS
==================================================

Add a small support status component.

Example:

SUPPORT STATUS

● Operational

Average response:
< 24 hours

Open tickets:
2

This is mock data.

==================================================
27. USER EXPERIENCE
==================================================

The application should have clear flows.

Example:

User opens Dashboard
↓
Selects Iceberg Prediction
↓
Selects iceberg
↓
Views prediction
↓
Checks uncertainty
↓
Checks route impact
↓
Moves to Sea-Ice Prediction
↓
Checks future concentration
↓
Returns to Route Planning
↓
Chooses route
↓
If confused:
Help & Support
↓
Contact support / report issue

==================================================
28. LOADING / ERROR / EMPTY STATES
==================================================

Add realistic states.

Loading:

"Loading prediction data..."

"No prediction data available."

"Environmental data unavailable."

"Unable to load iceberg observations."

"Prediction service temporarily unavailable."

Do not simply leave blank spaces.

Use appropriate icons.

==================================================
29. DATA ARCHITECTURE
==================================================

Continue using separated mock data structures.

Example:

icebergPrediction

{
  id,
  currentPosition,
  currentSpeed,
  heading,
  predictedPositions,
  uncertainty,
  confidence,
  risk
}

seaIcePrediction

{
  region,
  currentConcentration,
  predictions,
  confidence,
  change
}

environment

{
  temperature,
  windSpeed,
  windDirection,
  waveHeight,
  visibility,
  currentSpeed,
  currentDirection
}

supportTicket

{
  id,
  category,
  priority,
  subject,
  status,
  createdAt
}

Keep mock data separate from UI components.

This is important because later we will replace these objects with real backend/API responses.

==================================================
30. COMPONENT REUSE
==================================================

Reuse the existing Phase 1 components wherever possible.

Create reusable components such as:

PredictionCard
ConfidenceBadge
TimelineSelector
EnvironmentalMetric
HazardCard
IcebergDetailPanel
SeaIceLegend
PredictionLegend
SupportCard
FAQItem
SupportForm
ContactForm
IssueReportModal
StatusIndicator

Do not duplicate code.

==================================================
31. RESPONSIVENESS
==================================================

Primary target:

Desktop / laptop

Minimum:
1280px

Optimize for:

1366px
1440px
1920px

The prediction map should remain the dominant visual element on prediction pages.

==================================================
32. VISUAL HIERARCHY
==================================================

The application hierarchy should be:

MAP
↓
PREDICTION
↓
RISK
↓
ENVIRONMENT
↓
ROUTE IMPACT
↓
SUPPORT

Do not make support features visually dominate the navigation system.

Help & Support should be easily accessible but remain secondary to navigation operations.

==================================================
33. SCIENTIFIC HONESTY
==================================================

VERY IMPORTANT:

This project will eventually use real ML models.

Phase 2 is still a prototype.

Therefore:

Do not label mock data as:

"REAL-TIME AI PREDICTION"

Do not claim:

"100% accurate"

Do not create fake scientific equations or unsupported claims.

Use:

DEMO DATA
MOCK PREDICTION
SIMULATED FORECAST

where appropriate.

The UI should be ready for real model output later.

==================================================
34. FINAL PHASE 2 EXPERIENCE
==================================================

After completing Phase 2, the application should feel like a complete Antarctic Environmental Intelligence interface.

The user should be able to navigate between:

DASHBOARD

ROUTE PLANNING

ICEBERG PREDICTION

SEA-ICE PREDICTION

ENVIRONMENTAL DATA

HAZARDS

RE-ROUTING

WHAT-IF ANALYSIS

REPORTS

HELP & SUPPORT

CONTACT US

SETTINGS

The two major new capabilities are:

1. ICEBERG TRAJECTORY INTELLIGENCE

2. SEA-ICE CONCENTRATION INTELLIGENCE

And the application must include a complete support experience:

HELP
→ FAQ
→ SEARCH
→ EMAIL SUPPORT
→ CONTACT US
→ REPORT ISSUE

==================================================
35. PHASE 2 BOUNDARY
==================================================

DO NOT implement:

- actual ML model
- actual iceberg prediction algorithm
- actual sea-ice prediction algorithm
- actual weather API
- actual ocean-current API
- actual satellite data
- actual backend
- actual database
- actual email server
- actual support ticket backend
- actual route optimization

Everything should use well-structured mock data and frontend simulations.

Prepare the UI and data structures so that these can be connected in later phases.

The result should be a polished, professional Phase 2 prototype that can be demonstrated to SIH judges.