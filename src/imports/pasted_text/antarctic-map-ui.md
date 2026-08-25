PHASE — INTERACTIVE ANTARCTIC MAP + PUBLIC LANDING & AUTHENTICATION

Continue working on the existing "ANTARCTIC NAVIGATION AI" project.

IMPORTANT:
DO NOT redesign or replace the existing application unnecessarily.

Preserve the existing:
- dashboard
- navigation structure
- prediction pages
- route planning
- iceberg prediction
- sea-ice prediction
- environmental data
- hazards
- support functionality
- color system
- typography
- component style

This task adds two major areas:

1. A REAL INTERACTIVE ANTARCTIC MAP inside the operational application.
2. A polished public-facing LANDING PAGE + USER/ADMIN AUTHENTICATION FLOW.

========================================================
PART 1 — INTERACTIVE ANTARCTIC MAP
========================================================

Create an interactive Antarctic map as the primary map component of the application.

Use:

MAP LIBRARY:
MapLibre GL JS

BASEMAP:
Use an OpenStreetMap-compatible basemap/tiles for the prototype.

IMPORTANT:
Structure the map component so that the basemap provider/tiles can later be replaced with a dedicated Antarctic/polar basemap.

DO NOT use a static image pretending to be an interactive map.

The map must support:

- zoom
- pan
- geographic navigation
- markers
- lines
- polygons
- overlays
- tooltips
- clickable objects
- layer visibility controls

========================================================
ANTARCTIC MAP VISUAL STYLE
========================================================

The map should visually focus on Antarctica and the surrounding Southern Ocean.

Do not show a generic world map as the primary view.

Initial camera should be centered around Antarctica.

The map should have a clean scientific visualization style.

Avoid excessive dark styling.

The map should be readable and feel like a scientific navigation system rather than a military command interface.

Use a lighter polar/ocean visual treatment where possible.

Suggested map appearance:

Ocean:
Deep blue / muted blue

Antarctic land:
Light glacier white / pale blue

Sea ice:
Light cyan / translucent blue

Vessel:
Bright cyan

Normal route:
Electric blue

Predicted route:
Dashed cyan

Safe:
Green

Warning:
Amber

Danger:
Coral red

========================================================
MAP LAYERS
========================================================

Create a map layer control.

Layers:

1. Vessel
2. Icebergs
3. Iceberg Predicted Trajectories
4. Sea-Ice Concentration
5. Ship Route
6. Alternative Routes
7. Hazard Zones
8. Ocean Currents
9. Weather
10. Waypoints

Each layer should be individually toggleable.

Example:

MAP LAYERS

☑ Vessel
☑ Icebergs
☑ Iceberg Prediction
☑ Sea Ice
☑ Ship Route
☑ Hazards
☐ Ocean Currents
☐ Weather

========================================================
VESSEL VISUALIZATION
========================================================

Display the research vessel on the map.

Use a clear ship/vessel icon.

Example:

RV POLAR STAR

Show a subtle cyan directional indicator representing heading.

When the vessel is clicked, display:

VESSEL INFORMATION

Vessel:
RV Polar Star

Latitude:
78.42° S

Longitude:
21.34° W

Speed:
14 kn

Heading:
247°

Status:
UNDERWAY

Destination:
Research Station

ETA:
Demo value

Use mock data.

Clearly structure the data so real vessel telemetry can later replace it.

========================================================
ICEBERG VISUALIZATION
========================================================

Display multiple iceberg markers.

Icebergs should NOT all look identical.

Use different visual states:

LOW RISK
Small cyan/light-blue marker

MEDIUM RISK
Amber marker

HIGH RISK
Red marker

Each iceberg should have:

ID
Position
Speed
Heading
Risk
Prediction confidence

Example:

IBG-1247

Position:
78.42° S
21.34° W

Speed:
0.42 m/s

Heading:
215°

Risk:
HIGH

Confidence:
87%

========================================================
ICEBERG TRAJECTORY
========================================================

When an iceberg is selected:

Show its historical/current position and predicted trajectory.

Visual representation:

CURRENT POSITION
       ●
       │
       ├──────── predicted +6h
       │
       ├──────────── predicted +12h
       │
       ├──────────────── predicted +24h
       │
       └──────────────────── predicted +48h

Use:

Current trajectory:
solid line

Predicted trajectory:
dashed line

Future uncertainty:
translucent corridor

IMPORTANT:

Do not represent future iceberg position as an exact point.

The prediction corridor should visually become wider farther into the future.

Label:

PREDICTION

and

UNCERTAINTY CORRIDOR

========================================================
ICEBERG POPUP
========================================================

Clicking an iceberg should open a clean information popup or side panel.

Show:

ICEBERG ID

IBG-1247

CURRENT POSITION

78.42° S
21.34° W

SPEED

0.42 m/s

HEADING

215°

PREDICTION HORIZON

72 HOURS

CONFIDENCE

87%

RISK TO SELECTED ROUTE

HIGH

PREDICTED CLOSEST APPROACH

+14 HOURS

Buttons:

VIEW PREDICTION
VIEW ROUTE IMPACT

========================================================
SHIP TRAJECTORY
========================================================

Display the vessel's current/planned trajectory.

Current/planned route:
solid electric blue line

Predicted vessel route:
dashed cyan line

Alternative routes:

FASTEST
SAFEST
FUEL EFFICIENT

Use different visual treatment for each route.

The selected route should be visually emphasized.

Non-selected routes should be slightly muted.

========================================================
ROUTE WAYPOINTS
========================================================

Display route waypoints.

Clicking a waypoint should show:

Waypoint
Latitude
Longitude
ETA
Distance from previous waypoint
Environmental conditions
Risk level

Use mock values.

========================================================
ROUTE RISK VISUALIZATION
========================================================

Display transparent hazard zones over the map.

Examples:

Iceberg risk zone
Sea-ice risk zone
Weather risk zone

Do not cover the entire map with red.

Risk should be localized.

Example:

LOW RISK:
transparent green

MEDIUM:
transparent amber

HIGH:
transparent coral red

========================================================
SEA-ICE VISUALIZATION
========================================================

Add a sea-ice concentration overlay.

Use a scientific blue/cyan scale rather than red/green.

Example:

0–10%
very low concentration

10–30%
low

30–50%
moderate

50–70%
high

70–100%
very high

Add a map legend:

SEA-ICE CONCENTRATION

0%
────────
100%

Use translucent overlays so that routes and markers remain visible.

========================================================
OCEAN CURRENT VISUALIZATION
========================================================

Add an optional Ocean Currents layer.

Represent currents using:

- directional arrows
- flow lines
- subtle animation if practical

Do not make this visually overpowering.

Clicking a current should show:

Current speed
Current direction
Location

Use mock data.

========================================================
WEATHER VISUALIZATION
========================================================

Add an optional weather layer.

Display:

Wind speed
Wind direction
Temperature
Visibility
Wave height

Use simple directional indicators and small data overlays.

Do not clutter the map.

========================================================
MAP LEGEND
========================================================

Create a compact legend:

VESSEL
ICEBERG
PREDICTED ICEBERG
CURRENT ROUTE
PREDICTED ROUTE
SAFE ROUTE
WARNING
DANGER
SEA ICE

The legend should be collapsible.

========================================================
MAP TIME CONTROL
========================================================

Add a temporal prediction control at the bottom of the map.

Example:

NOW | +6H | +12H | +24H | +48H | +72H

When the user selects a future time:

Update mock:

- iceberg positions
- predicted trajectories
- sea-ice overlay
- hazard zones
- route risk

This is a FRONTEND SIMULATION for now.

Prepare the component so that real ML/API data can replace the mock values later.

========================================================
MAP SEARCH
========================================================

Add a map search field.

Allow mock searching by:

- iceberg ID
- vessel
- waypoint
- coordinates

Example:

Search:
IBG-1247

The map should center on the selected iceberg.

========================================================
MAP FULLSCREEN
========================================================

Add:

FULLSCREEN

button.

The map should expand to occupy the available screen.

========================================================
PART 2 — PUBLIC LANDING PAGE
========================================================

Create a dedicated public landing page for:

ANTARCTIC NAVIGATION AI

Subtitle:

AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory,
and Navigation Decision Support System

The landing page should communicate the purpose of the system immediately.

========================================================
LANDING PAGE DESIGN
========================================================

IMPORTANT:

DO NOT make the landing page extremely dark.

The operational dashboard can retain its dark scientific appearance.

The public landing page should be:

- clean
- modern
- polar
- scientific
- professional
- visually engaging
- approachable

Use a lighter Antarctic visual atmosphere.

Suggested direction:

Glacier white
Pale blue
Arctic cyan
Ocean blue
Deep navy used selectively

Do NOT make the entire landing page #071521.

The landing page should feel like:

"Antarctic research + advanced navigation technology"

rather than:

"dark military command center."

========================================================
HERO SECTION
========================================================

Create a large hero section.

Headline:

NAVIGATE THE ANTARCTIC
WITH INTELLIGENT RISK AWARENESS

Alternative supporting text:

AI-powered decision support for iceberg trajectory,
sea-ice concentration, environmental conditions,
and safer research-vessel navigation.

Primary CTA:

START NAVIGATING

Secondary CTA:

EXPLORE THE SYSTEM

Additional small status:

ANTARCTIC NAVIGATION DECISION SUPPORT

========================================================
HERO VISUAL
========================================================

The hero should contain an interactive or animated Antarctic visualization.

Use a simplified Antarctic map/globe visualization.

Show:

Research vessel
Icebergs
Route
Predicted trajectories
Sea ice

Do not use a generic AI brain graphic.

The visual must communicate the actual purpose of the project.

========================================================
SYSTEM WORKFLOW
========================================================

Create a section:

HOW THE SYSTEM WORKS

Show:

01
OBSERVE

Satellite / environmental / vessel data

↓

02
ANALYZE

Environmental and geospatial analysis

↓

03
PREDICT

Iceberg trajectory
Sea-ice concentration

↓

04
ASSESS RISK

Evaluate route hazards

↓

05
NAVIGATE

Generate route alternatives

↓

06
RE-ROUTE

Adapt when conditions change

Use a visual horizontal or vertical flow.

========================================================
CORE FEATURES
========================================================

Create a feature section.

Feature 1:

ICEBERG TRAJECTORY PREDICTION

Predict future iceberg movement and visualize uncertainty.

Feature 2:

SEA-ICE CONCENTRATION

Monitor and forecast sea-ice conditions.

Feature 3:

INTELLIGENT ROUTE PLANNING

Compare routes based on safety, fuel and travel time.

Feature 4:

DYNAMIC RE-ROUTING

Adapt route recommendations when hazards change.

Feature 5:

ENVIRONMENTAL INTELLIGENCE

Combine weather, ocean and ice conditions.

Feature 6:

RISK ASSESSMENT

Provide route-specific risk scores.

========================================================
ABOUT THE SYSTEM
========================================================

Create an:

ABOUT THE SYSTEM

section.

Explain the system in simple language.

Example concept:

"Antarctic Navigation AI is a decision-support platform designed to help research vessels understand changing Antarctic environmental conditions and make informed navigation decisions."

Explain that the platform combines:

Iceberg observations
Sea-ice information
Meteorological conditions
Oceanographic conditions
Vessel information
Predictive analytics

Do not make unsupported claims.

========================================================
WHY IT MATTERS
========================================================

Create a section:

WHY ANTARCTIC NAVIGATION IS CHALLENGING

Cards:

MOVING ICEBERGS

Icebergs can change position over time.

DYNAMIC SEA ICE

Sea-ice conditions vary spatially and temporally.

CHANGING WEATHER

Wind, visibility and waves influence navigation.

UNCERTAINTY

Future environmental conditions cannot be known with perfect certainty.

ROUTE TRADE-OFFS

The shortest route may not be the safest or most fuel efficient.

========================================================
SYSTEM PREVIEW
========================================================

Create a visual section showing previews of:

Dashboard
Iceberg Prediction
Sea-Ice Prediction
Route Planning
Dynamic Re-routing

Use the actual application UI/components rather than generic stock images.

========================================================
LOGIN SYSTEM
========================================================

Create TWO separate login entry points.

USER LOGIN

and

ADMIN LOGIN

They should lead to distinct login pages or a clearly separated authentication flow.

========================================================
USER AUTHENTICATION
========================================================

USER LOGIN PAGE

Title:

WELCOME BACK

ANTARCTIC NAVIGATION AI

Fields:

Email
Password

Options:

Remember me
Forgot password?

Button:

LOGIN

Secondary:

Don't have an account?
SIGN UP

========================================================
USER SIGN UP
========================================================

Create a registration page.

Fields:

Full Name
Email
Organization
Password
Confirm Password

Role:

Researcher
Vessel Operator

Button:

CREATE ACCOUNT

After registration:

ACCOUNT CREATED SUCCESSFULLY

Then provide:

GO TO LOGIN

This is FRONTEND MOCK AUTHENTICATION for now.

Do not implement real authentication or password storage.

========================================================
ADMIN LOGIN
========================================================

Create:

ADMIN LOGIN

Use a visually distinct but consistent interface.

Fields:

Admin ID / Email
Password

Button:

ADMIN LOGIN

Do not allow normal user registration from the admin login.

Provide:

Forgot password?

The admin interface will be developed separately later.

For this phase, the login can lead to a placeholder:

ADMIN DASHBOARD

========================================================
FORGOT PASSWORD
========================================================

Create a forgot password flow.

User enters email.

Show:

RESET PASSWORD

"Enter your registered email address and we will send password reset instructions."

Button:

SEND RESET LINK

For the prototype, simulate successful submission.

========================================================
HELP & SUPPORT
========================================================

Add Help & Support prominently to the landing page.

It should be accessible through:

Header navigation
Footer
Login pages where appropriate

Create:

HELP & SUPPORT

Features:

Search Help
FAQs
User Guide
Report an Issue
Email Support
Contact Us

========================================================
CONTACT US
========================================================

Create a dedicated Contact Us section/page.

Include:

GENERAL INQUIRIES
TECHNICAL SUPPORT
DATA / RESEARCH
PARTNERSHIPS

Contact form:

Name
Email
Organization
Subject
Message

Button:

SEND MESSAGE

For prototype use placeholder contact information.

DO NOT invent official government contact details.

========================================================
EMAIL SUPPORT
========================================================

Create an:

EMAIL SUPPORT

interface.

Fields:

Name
Email
Issue Category
Subject
Message

Categories:

Technical Issue
Iceberg Prediction
Sea-Ice Prediction
Route Planning
Map
Data
Account
Other

Priority:

Low
Medium
High
Critical

Button:

SEND SUPPORT REQUEST

For this phase simulate successful submission.

Do not implement a real email server.

========================================================
LANDING PAGE HEADER
========================================================

Header navigation:

ANTARCTIC NAVIGATION AI

About
How It Works
Features
Help & Support
Contact

Right side:

LOGIN
SIGN UP

Dropdown:

LOGIN
→ User Login
→ Admin Login

Keep the header clean.

========================================================
LANDING PAGE FOOTER
========================================================

Footer should contain:

ANTARCTIC NAVIGATION AI

AI-Enabled Antarctic Navigation Decision Support

Navigation:

About
Features
Help & Support
Contact
User Login
Admin Login

Support:

Email Support
Report an Issue

Add:

Privacy
Terms

These can be placeholder pages for now.

========================================================
RESPONSIVE DESIGN
========================================================

Primary:

Desktop / Laptop

Support:

1280px
1366px
1440px
1920px

Also create a reasonable tablet/mobile adaptation.

The operational map should remain usable on desktop.

========================================================
TECH STACK
========================================================

Use:

React
TypeScript
Vite
Tailwind CSS

MAP:

MapLibre GL JS

BASEMAP:

OpenStreetMap-compatible tiles

ICONS:

Lucide React

CHARTS:

Recharts if required

STATE:

React state or Zustand

Prepare data-fetching architecture for:

TanStack Query

Do not build the backend yet.

========================================================
DATA ARCHITECTURE
========================================================

Separate mock data from UI components.

Create mock structures for:

vessel
icebergs
iceberg trajectories
seaIce
routes
waypoints
weather
ocean currents
hazards
support tickets
users

Example:

iceberg:

{
  id,
  latitude,
  longitude,
  speed,
  heading,
  risk,
  confidence,
  predictedTrajectory,
  uncertainty
}

vessel:

{
  id,
  name,
  latitude,
  longitude,
  speed,
  heading,
  destination
}

route:

{
  id,
  name,
  type,
  coordinates,
  distance,
  eta,
  fuel,
  riskScore
}

========================================================
IMPORTANT ARCHITECTURE RULE
========================================================

Keep these components modular.

Example:

components/
    map/
        AntarcticMap
        VesselMarker
        IcebergMarker
        RouteLayer
        SeaIceLayer
        HazardLayer
        CurrentLayer
        WeatherLayer
        MapControls
        MapLegend
        TimeControl

    auth/
        UserLogin
        AdminLogin
        SignUp
        ForgotPassword

    support/
        HelpCenter
        FAQ
        ContactForm
        SupportForm
        IssueReport

    dashboard/
        RiskCard
        PredictionCard
        EnvironmentalCard
        RouteCard

Do not create one giant React component.

========================================================
SCIENTIFIC HONESTY
========================================================

The map and prediction information in this prototype is MOCK DATA.

Do not claim that the application is already performing real ML predictions.

Use labels such as:

DEMO DATA
SIMULATED PREDICTION
MOCK ENVIRONMENTAL DATA

until actual data and models are connected.

Do not display fake accuracy claims.

Do not claim that a route is genuinely safe.

Use:

LOW RISK
MEDIUM RISK
HIGH RISK

rather than:

SAFE
100% SAFE

========================================================
FINAL USER EXPERIENCE
========================================================

PUBLIC USER:

Landing Page
      ↓
About / Features
      ↓
Sign Up
      ↓
User Login
      ↓
Operational Dashboard
      ↓
Interactive Antarctic Map
      ↓
Iceberg Prediction
      ↓
Sea-Ice Prediction
      ↓
Route Planning
      ↓
Risk Assessment
      ↓
Dynamic Re-routing
      ↓
Reports

SUPPORT:

Landing Page
      ↓
Help & Support
      ├── FAQ
      ├── User Guide
      ├── Email Support
      ├── Contact Us
      └── Report Issue

ADMIN:

Landing Page
      ↓
Admin Login
      ↓
Admin Dashboard
      ↓
(Placeholder for future implementation)

========================================================
FINAL DESIGN GOAL
========================================================

The final result should look like a serious scientific navigation platform.

The visual story should be:

ANTARCTIC ENVIRONMENT
        ↓
OBSERVATION
        ↓
PREDICTION
        ↓
RISK
        ↓
ROUTE
        ↓
DYNAMIC DECISION SUPPORT

The landing page should be visually inviting and lighter.

The operational dashboard should be more information-dense and professional.

The map should be the central visual element of the actual application.

Do NOT overuse dark colors.

Do NOT make the entire product look like a military command center.

The design should communicate:

POLAR SCIENCE
+
MARITIME NAVIGATION
+
AI / PREDICTIVE ANALYTICS
+
DECISION SUPPORT

Use subtle animation and interaction where it improves understanding, but prioritize clarity and performance.