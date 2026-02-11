# Seattle Vehicle Collision Dashboard

A smart, interactive dashboard visualizing vehicle collision data in Seattle, Washington. This project analyzes traffic safety patterns including collision severity, temporal trends, and collision types to support Vision Zero safety initiatives.

## Live Demo

🔗 **Dashboard URL**: `https://tinnam11.github.io/collisions_seattle_smartdashboard/index.html`


## Project Overview

This dashboard provides a comprehensive view of vehicle collisions in Seattle using:
- **Interactive map** with proportional symbols showing collision locations and severity
- **Dynamic statistics** displaying real-time collision metrics
- **Temporal analysis** showing hourly collision patterns
- **Type distribution** analyzing different collision categories

## Why Proportional Symbols?

### Map Type Choice: Proportional Symbol Map

I chose a **proportional symbol map** over a choropleth map for the following reasons:

1. **Point-Level Precision**: Vehicle collisions occur at specific locations (intersections, street segments). Proportional symbols accurately represent the exact geographic coordinates of each incident, while choropleth maps would aggregate data into arbitrary administrative boundaries, losing this critical spatial precision.

2. **Severity Visualization**: The color-coding of symbols allows immediate visual distinction between severity levels (property damage, injury, serious injury, fatality). Each collision point tells its own story without the distortion that would come from aggregating diverse incidents into area-based statistics.

3. **Clustering for Density**: The map uses clustering at higher zoom levels to show collision hotspots without overwhelming the viewer. When zoomed in, individual collision points become visible with their specific attributes. This multi-scale visualization wouldn't be possible with choropleth mapping.

4. **Avoiding Misleading Area Effects**: Choropleth maps can create visual bias where larger geographic areas appear more prominent regardless of actual collision density. Since Seattle neighborhoods vary dramatically in size, proportional symbols provide a more honest representation of where collisions actually concentrate.

## Features

### 1. Interactive Map Component
- **Mapbox GL JS** dark theme optimized for visibility
- Color-coded collision severity:
  - 🔵 Blue: Property Damage Only
  - 🟡 Yellow: Injury
  - 🟠 Orange: Serious Injury
  - 🔴 Red: Fatality
- Clustering algorithm for dense areas
- Click-to-zoom on clusters
- Detailed popup information for each collision

### 2. Real-Time Statistics
Four dynamic stat cards showing:
- Total collision count
- Total injuries
- Total fatalities
- Pedestrian-involved collisions

### 3. Data Visualizations

#### Hourly Pattern Chart (Bar Chart)
- Shows collision frequency by hour of day
- Identifies rush hour patterns and high-risk times
- Built with C3.js for smooth interactivity

#### Collision Type Distribution (Donut Chart)
- Visualizes proportion of different collision types
- Categories include:
  - Rear End
  - Side Swipe
  - Head On
  - Pedestrian
  - Bicycle
  - Parked Car
  - Fixed Object

### 4. Additional Components
- Interactive legend with severity categories
- Reset button to return to default view
- Responsive design for different screen sizes
- Smooth animations and transitions

## Data Source

**Primary Dataset**: Seattle Department of Transportation (SDOT) Collision Data
- **Source**: [Seattle GeoData Portal](https://data-seattlecitygis.opendata.arcgis.com/datasets/SeattleCityGIS::sdot-collisions-all-years)
- **Coverage**: All collision types recorded by Seattle Police Department
```

## Technologies used

- **Mapbox GL JS** (v2.15.0) - Interactive mapping
- **C3.js** - Chart generation
- **D3.js** - Data visualization (C3 dependency)
- **Font Awesome** - Icons
- **Vanilla JavaScript** - Core functionality
- **HTML5/CSS3** - Structure and styling

## Credits

**Developer**: Tinna Mokaramanee
**Course**: GEOG 458 - Lab 6  
**Instructor**: Bo Zhao  
**Data Source**: Seattle Department of Transportation (SDOT)  
**Mapping Platform**: Mapbox  
**Charting Library**: C3.js  
