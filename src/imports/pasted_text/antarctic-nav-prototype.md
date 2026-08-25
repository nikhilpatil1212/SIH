Build a high-fidelity web application prototype for:

"AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory, and Navigation Decision Support System"

This is a Smart India Hackathon (SIH) project for the Ministry of Earth Sciences / National Centre for Polar and Ocean Research.

IMPORTANT:
This is PHASE 1 ONLY.

For this phase, focus on:
1. High-quality frontend UI
2. Interactive Antarctic map interface
3. Navigation dashboard
4. Route comparison UI
5. Iceberg visualization
6. Sea-ice visualization
7. Hazard visualization
8. Vessel information
9. Prediction visualization
10. Dynamic rerouting UI simulation using mock data

DO NOT implement actual ML models, backend APIs, real-time satellite APIs, database logic, or real route optimization yet.

Use realistic MOCK DATA and create clean interfaces/API placeholders so these can be connected later.

==================================================
1. VISUAL REFERENCE
==================================================

Use the attached reference image as the primary visual/layout inspiration.

The reference represents the general visual language we want:

- Dark operational navigation dashboard
- Large map as the hero component
- Left navigation sidebar
- Top system/status bar
- Right-side route comparison and risk information
- Bottom environmental/prediction cards
- Multiple route visualization
- Iceberg and hazard visualization
- Scientific/operational appearance
- Dense but organized information
- Professional research-vessel navigation system

DO NOT make an exact copy of the reference image.

Instead, create our own original UI inspired by its information hierarchy and operational dashboard structure.

The result should look like a REAL Antarctic navigation decision-support product, not a generic AI dashboard.

The design should communicate:

Observe → Analyze → Predict → Assess Risk → Navigate → Re-route

==================================================
2. DESIGN PHILOSOPHY
==================================================

The website should feel like:

"Scientific Arctic Navigation / Research Vessel Decision Support"

NOT:

- generic SaaS dashboard
- gaming interface
- crypto dashboard
- military weapons interface
- futuristic sci-fi interface
- generic AI website

Prioritize:

- precision
- readability
- scientific instrumentation
- operational decision making
- geospatial information
- calm visual hierarchy
- professional maritime interface

The user should immediately understand:

"This system helps a research vessel decide where and when to travel safely through Antarctic waters."

==================================================
3. CORE COLOR PALETTE
==================================================

Use EXACTLY this palette as the primary design system.

Main background:
#071521
Deep Navy

Secondary background:
#0D2433
Arctic Navy

Cards / panels:
#132F40
Slate Blue

Primary accent:
#55D6E8
Ice Cyan

Secondary accent:
#8CCFE0
Glacier Blue

Normal data / route:
#3B82F6
Electric Blue

Safe:
#46D7A1
Ice Green

Warning:
#F5B942
Amber

Danger / iceberg risk:
#FF5C5C
Coral Red

Primary text:
#EAF6F8
Arctic White

Muted text:
#91AEB9
Blue Grey

IMPORTANT COLOR RULE:

Do NOT make everything cyan.

Cyan should primarily communicate:
- interactive elements
- important information
- selected states
- system highlights

Use:
Blue = normal navigation/data
Green = safe
Amber = warning
Red = danger
Cyan = interaction/important information

Keep the majority of the UI dark navy.

==================================================
4. MAP COLOR SYSTEM
==================================================

The Antarctic map is the HERO component.

Use this visual language:

Ocean:
#071A26

Antarctic land:
#DCECEF

Sea ice:
#B8E8F0

Vessel:
Bright Ice Cyan #55D6E8

Planned/current route:
Electric Blue #3B82F6

Predicted vessel route:
Dashed Ice Cyan #55D6E8

Safe route:
Ice Green #46D7A1

Warning zone:
Amber #F5B942

Danger zone:
Transparent Coral Red #FF5C5C

Iceberg:
- Amber for moderate concern
- Red for high risk
- subdued/light blue for low-risk iceberg observations

Hazard zones should use transparent overlays rather than solid blocks.

The map should remain readable underneath the overlays.

The vessel should be one of the brightest elements on the map.

==================================================
5. APPLICATION STRUCTURE
==================================================

Create a desktop-first responsive application.

Main layout:

------------------------------------------------
LEFT SIDEBAR | MAIN CONTENT | RIGHT INFORMATION
------------------------------------------------

LEFT:
Navigation

CENTER:
Map / primary workspace

RIGHT:
Risk + route + mission information

BOTTOM:
Prediction / environmental / alert information

==================================================
6. LEFT SIDEBAR
==================================================

Create a dark vertical sidebar.

Brand:

POLAR
NAVIGATOR

Use a simple minimal polar/mountain/navigation icon.

Navigation items:

Dashboard
Map View
Hazards
Routes
Re-routing
What-If Analysis
Reports
Settings

Each item should have:
- icon
- label
- hover state
- active state

Active navigation item:
use subtle Ice Cyan highlight.

Do not overuse glowing effects.

At bottom:

SYSTEM STATUS

● Live Data

Last Updated:
24 Aug 2026
10:30 UTC

Use mock data.

==================================================
7. TOP HEADER
==================================================

Create a compact operational header.

Show:

System:
POLAR NAVIGATOR

Status:
● SYSTEM NOMINAL

Data status:
LIVE DATA

Current UTC:
10:30 UTC

Mission:
Research Expedition

Vessel:
RV Polar Star

Ice Class:
PC6

Speed:
14 kn

Keep this header compact.

Do not make it visually overwhelming.

==================================================
8. MAIN DASHBOARD
==================================================

Create the main Dashboard page.

The center should contain a large Antarctic map.

Map should occupy approximately 60–65% of the visual workspace.

Map controls:

+ Zoom
- Zoom

Layers:

Icebergs
Sea-Ice
Currents
Weather

Each layer should have an enabled/disabled state.

Also include:

Legend

Iceberg
Sea Ice
Vessel
Current Route
Predicted Route
Hazard Zone

==================================================
9. MAP MOCK DATA
==================================================

Create realistic mock Antarctic geographic data.

Display:

- Antarctic coastline
- ocean
- several iceberg markers
- several iceberg clusters
- vessel
- destination
- sea-ice regions
- ocean-current arrows
- weather/wind indicators

DO NOT use random worldwide geography.

The visual context should clearly resemble Antarctic waters.

Use mock coordinates around Antarctica.

The map should visually communicate spatial relationships rather than merely being a decorative background.

==================================================
10. VESSEL
==================================================

Represent the research vessel using a small ship icon.

Example:

RV POLAR STAR

Display:

Speed:
14 kn

Heading:
247°

Course:
247°

Position:
mock latitude / longitude

Status:
Underway

The vessel should have a subtle cyan halo so it is easily identifiable.

==================================================
11. ROUTES
==================================================

Display THREE route alternatives from origin to destination.

Route A:
FASTEST

Color:
Electric Blue #3B82F6

Route B:
SAFEST

Color:
Ice Green #46D7A1

Route C:
FUEL EFFICIENT

Color:
Amber #F5B942

Routes should have visibly different paths.

Do not make them straight lines.

They should curve around hazards.

Each route should have waypoint markers.

==================================================
12. ROUTE COMPARISON
==================================================

Create a right-side Route Comparison panel.

Route A — Fastest

Distance:
1,240 nm

ETA:
4d 6h

Fuel:
110 t

Risk:
78 / 100

Status:
HIGH RISK

Route B — Safest

Distance:
1,540 nm

ETA:
5d 12h

Fuel:
120 t

Risk:
32 / 100

Status:
LOW RISK

Route C — Fuel Efficient

Distance:
1,680 nm

ETA:
5d 18h

Fuel:
95 t

Risk:
54 / 100

Status:
MEDIUM RISK

These are MOCK values for visualization only.

Use clear visual hierarchy.

Make the safest route visually prominent without hiding the alternatives.

==================================================
13. RISK BREAKDOWN
==================================================

Create a "Risk Factors" card.

For the selected route show:

Iceberg Exposure
Sea-Ice Concentration
Weather Conditions
Visibility
Vessel Constraints

Example:

Iceberg Exposure     HIGH
Sea-Ice Concentration MEDIUM
Weather Conditions   MEDIUM
Visibility            LOW
Vessel Constraints   OK

Use:
Red = High
Amber = Medium
Green = Low/OK

==================================================
14. ICEBERG PREDICTION CARD
==================================================

Create a card:

ICEBERG PREDICTION

Example:

ID:
IBG-1247

Observed:
24 Aug 2026 10:00 UTC

Current Speed:
0.42 m/s

Heading:
215°

Predicted Horizon:
Next 72 hours

Show:

Current iceberg position
Predicted trajectory
Uncertainty corridor

The prediction trajectory should be represented visually.

Use:
- dashed cyan/red line for predicted path
- translucent corridor around prediction
- iceberg marker

Add:

Prediction Confidence:
87%

IMPORTANT:

Clearly label this as mock/example data.

==================================================
15. UNCERTAINTY CORRIDOR
==================================================

This is an important feature of the project.

Do not represent iceberg prediction as a single perfect point.

Visualize:

Current iceberg
↓
Predicted trajectory
↓
Uncertainty corridor

Use a translucent corridor around the predicted path.

Example label:

95% Prediction Corridor

The corridor should widen farther into the future.

This is important because future iceberg position is uncertain.

==================================================
16. ENVIRONMENTAL OVERVIEW
==================================================

Create an Environmental Overview card.

Show:

Sea-Ice Concentration:
35%

Wind Speed:
18 kn NE

Visibility:
2.1 km

Water Current:
0.6 kn SW

Also show small visual indicators/icons.

Use clean scientific data presentation.

==================================================
17. ALERTS
==================================================

Create an Alerts panel.

Example:

HIGH ICEBERG RISK
High iceberg risk detected on Route A.
Re-routing recommended.

NEW ICEBERG DETECTED
New iceberg detected 18 nm ahead of current route.

SEA-ICE CHANGE
Sea-ice concentration increasing along Route A.

Use:
Red = critical
Amber = warning
Cyan/blue = information

==================================================
18. DYNAMIC REROUTING
==================================================

Create an interactive mock Dynamic Re-routing experience.

This does NOT need a real backend.

When the user clicks:

"Simulate New Observation"

simulate:

1. New iceberg observation received
2. Existing route risk changes
3. Alert appears
4. Current route becomes higher risk
5. Alternative route becomes recommended
6. Map updates
7. Route comparison updates

Show an animation/state transition.

Example:

BEFORE:

Route B:
Risk 32 / 100

AFTER:

Route B:
Risk 67 / 100

System recommendation:

"Route C recommended"

Add explanation:

"New iceberg trajectory intersects the predicted Route B corridor in approximately 8 hours."

This should visually demonstrate the core concept of the project.

==================================================
19. WHAT-IF ANALYSIS
==================================================

Create a page or modal for:

"What-If Analysis"

Allow the user to change mock parameters:

Departure time
Vessel speed
Risk tolerance
Sea-ice conditions
Weather severity

Then show:

Expected ETA
Fuel estimate
Risk score
Recommended route

Example scenarios:

Normal conditions
Heavy sea ice
High iceberg activity
Poor visibility
High winds

This is a UI simulation only in Phase 1.

==================================================
20. ROUTE DETAIL PAGE
==================================================

Create a detailed route page.

Show:

Route name
Distance
ETA
Fuel
Risk score

Then timeline:

Departure
+12 hours
+24 hours
+48 hours
+72 hours

At each stage show:

Iceberg risk
Sea-ice risk
Weather risk

This prepares the UI for the future time-dependent hazard system.

==================================================
21. HAZARDS PAGE
==================================================

Create a dedicated Hazards page.

Show:

Active iceberg hazards
Predicted iceberg hazards
Sea-ice hazards
Weather hazards

Each hazard should contain:

Type
Location
Severity
Predicted time
Confidence
Affected route

Example:

IBG-1247
Iceberg
HIGH
Predicted intersection:
+18h
Confidence:
87%

==================================================
22. REPORTS PAGE
==================================================

Create a basic report interface.

Show:

Mission Summary
Route selected
Distance
ETA
Fuel estimate
Risk score
Major hazards
Rerouting events

Include an "Export Report" button.

The button can be non-functional in Phase 1.

==================================================
23. SETTINGS PAGE
==================================================

Create basic settings UI:

Distance unit:
nautical miles

Speed:
knots

Temperature:
°C

Risk preference:

Safety First
Balanced
Time Efficient

Data refresh interval:

5 min
15 min
30 min
1 hour

These can be mock settings.

==================================================
24. TYPOGRAPHY
==================================================

Use:

Primary font:
Inter

Data / numerical values:
JetBrains Mono

Use Inter for:
- headings
- labels
- navigation
- descriptions

Use JetBrains Mono for:
- coordinates
- timestamps
- speed
- distance
- ETA
- risk values
- technical values

Make numbers easy to scan.

==================================================
25. COMPONENT DESIGN
==================================================

Create reusable components.

Examples:

Sidebar
TopBar
MapView
MapLayerControl
VesselMarker
IcebergMarker
RouteLine
HazardZone
RouteCard
RiskScore
EnvironmentalCard
PredictionCard
AlertCard
Timeline
StatusIndicator
MetricCard
Modal
Tooltip

Do not duplicate styles unnecessarily.

==================================================
26. INTERACTIONS
==================================================

Implement frontend interactions using mock data.

Required:

- Sidebar navigation
- Map layer toggles
- Route selection
- Route highlighting
- Hover tooltips
- Iceberg selection
- Hazard selection
- Risk card updates
- Dynamic rerouting simulation
- What-if scenario selection
- Date/time controls
- Responsive sidebar
- Alerts
- Modal windows

When a route is selected:

- highlight route
- dim other routes
- update risk factors
- update environmental information
- update route details

==================================================
27. RESPONSIVENESS
==================================================

Primary target:

Desktop / laptop

Minimum useful width:
1280px

Also support:
1440px
1920px

Create a reasonable tablet layout.

Do not prioritize mobile over desktop because this is an operational navigation system intended for large screens.

==================================================
28. UI QUALITY RULES
==================================================

IMPORTANT:

Do NOT use:

- excessive gradients
- excessive glassmorphism
- purple AI colors
- giant glowing buttons
- unnecessary animations
- excessive rounded cards
- excessive shadows
- decorative elements that don't communicate information
- generic AI robot graphics

Avoid visual clutter.

The system should feel like professional scientific software.

Use subtle borders and restrained shadows.

Cards should have:
- dark background
- subtle border
- clear hierarchy

Use small corner radii rather than extremely rounded cards.

==================================================
29. MAP IS THE HERO
==================================================

The map must receive the most visual attention.

The UI should communicate:

MAP = primary workspace

Everything else supports the map.

The user should be able to quickly answer:

1. Where is my vessel?
2. Where are the icebergs?
3. Where is sea ice?
4. Where are the hazards?
5. What route is currently recommended?
6. Why is that route recommended?
7. What could happen in the next 24–72 hours?

==================================================
30. DATA ARCHITECTURE PLACEHOLDERS
==================================================

Although this is Phase 1, structure the frontend so that mock data can later be replaced by APIs.

Create clearly separated data structures for:

icebergs
vessel
routes
hazards
weather
ocean conditions
sea ice
predictions
alerts

Do not hard-code these values directly inside UI components.

Use mock JSON/TypeScript objects.

Example conceptual structure:

iceberg:
{
 id,
 latitude,
 longitude,
 timestamp,
 speed,
 heading,
 riskLevel,
 predictedPath,
 uncertainty
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
 riskScore,
 riskLevel
}

This will make Phase 2 backend integration much easier.

==================================================
31. TECHNICAL STACK
==================================================

Use:

Frontend:
React
TypeScript
Vite
Tailwind CSS

Visualization:
Mapbox GL JS or a clean map abstraction that can later be connected to Mapbox
deck.gl where useful for geospatial visualization

Charts:
Recharts

Icons:
Lucide React

State:
React state / Zustand if needed

Data fetching architecture:
TanStack Query can be prepared for later API integration

IMPORTANT:

Do not build the backend yet.

Do not build ML yet.

Keep the architecture ready for:

Node.js + Express backend
Python + FastAPI ML service
PostgreSQL + PostGIS
Redis
real environmental APIs
real iceberg data

==================================================
32. CODE QUALITY
==================================================

Use:

- TypeScript
- reusable components
- clear folder structure
- meaningful variable names
- no unnecessary duplication
- clean responsive CSS
- accessible buttons and controls
- semantic HTML
- proper loading states
- empty states
- error states

Do not generate one enormous component.

Break the application into logical components.

==================================================
33. IMPORTANT SCIENTIFIC UI PRINCIPLE
==================================================

Do not imply that the system has perfect predictions.

Whenever displaying predicted iceberg locations, use terminology such as:

Predicted Position
Prediction Confidence
Uncertainty Corridor
Forecast Horizon

Avoid:

"Exact Future Position"

The UI should communicate uncertainty because this is a decision-support system.

==================================================
34. FINAL RESULT
==================================================

The finished Phase 1 prototype should feel like a real product called:

POLAR NAVIGATOR

Subtitle:

AI-Enabled Antarctic Navigation Decision Support System

Core workflow:

OBSERVE
↓
ANALYZE
↓
PREDICT
↓
ASSESS RISK
↓
PLAN ROUTE
↓
MONITOR
↓
RE-ROUTE

The first screen should immediately show:

- Antarctic map
- research vessel
- iceberg locations
- predicted iceberg paths
- uncertainty corridors
- sea-ice regions
- 3 route alternatives
- risk scores
- environmental conditions
- alerts
- system status

Make it polished enough to present as an SIH prototype.

Again:

PHASE 1 = FRONTEND + INTERACTION + MOCK DATA.

Do NOT attempt to implement the actual ML or real-time data pipeline yet.