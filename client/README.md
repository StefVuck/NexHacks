# ILP Visualizer 🚁

A modern, interactive frontend for the Drone Delivery System (ILP Coursework 3), built to visualize flight paths, manage dispatches, and validate drone operations in real-time.

## 🚀 Key Features

### 🗺️ Interactive Map Interface
- **Premium Vector Maps**: Powered by **Mapbox GL** for smooth, high-performance rendering.
- **Dark Mode**: Sleek, modern dark theme using Mapbox's "Dark" style.
- **Dynamic Layers**: Toggle visibility for **No-Fly Zones** (Red Polygons) and **Service Points** (Blue Markers).
- **Auto-Fit Bounds**: Automatically adjusts the view to fit all active flight paths.

### ✈️ Advanced Flight Visualization
- **Animated Drones**: Custom SVG drones that fly along the calculated path in real-time.
- **Smooth Animation**: High-frame-rate interpolation for fluid drone movement.
- **Multi-Drone Support**: Visualizes multiple drones simultaneously with unique colors for each flight path.
- **Status Indicators**: Visual feedback for hovering (delivery) and return-to-base legs (dashed lines).
- **Playback Controls**: Play, Pause, and Restart animations.

### 📦 Dispatch Management
- **Dual Input Modes**:
  - **Manual Entry**: User-friendly form with **Photon API** address search and auto-coordinate filling.
  - **JSON Input**: Bulk load dispatches using raw JSON for rapid testing and debugging.
- **"Fly Now"**: Instantly calculate and visualize a route directly from the form.
- **Smart Reordering**: Drag-and-drop pending orders to prioritize deliveries before calculation.
- **Payload Alignment**: Automatically formats requests to match the backend's `MedicalDispatchRequest` DTO structure.

### 📊 Real-Time Status Panel
- **Fleet Status**: Interactive dropdown showing live stats for all drones (Capacity, Cost/Move).
- **Delivery Progress**: Tracks the status of each delivery (Pending → In-Progress → Completed).
- **Live Telemetry**: Displays current latitude/longitude updates during the flight.
- **Cost Breakdown**: Detailed breakdown of initial costs, per-move costs, and total flight costs.
- **GeoJSON Export**: Download the complete flight path as a GeoJSON file for external analysis.

### 💾 Session-Based Route Storage & Comparison
- **Save Routes**: Persist calculated flight paths with custom names for the current session.
- **Advanced Comparison**: Compare **any two routes** side-by-side (Saved vs. Saved, or Saved vs. Current).
- **Visual Difference**: Overlays a "ghost path" (grey dashed line) of the comparison route on the map for easy visual analysis of path differences.
- **Detailed Metrics**: Instantly compare key statistics: **Total Cost**, **Number of Moves**, and **Drone Count**.
- **Smart Management**:
  - Expandable cards with full **Cost Breakdown** (Base + Distance).
  - "Current Route" is automatically deduplicated from the list when viewing a saved route.

### 🎨 UI & Customization
- **Theme Toggle**: Switch between **Light** and **Dark** modes for the entire UI and Map.
- **Animation Speed**: Control playback speed (0.5x, 1x, 2x, 4x).
- **Order Scheduling**: Set specific **Date & Time** for new orders directly in the dispatch form.
- **Enhanced Markers**: Pulsing service point markers with always-visible labels for better orientation.
- **Custom Icons**:
  - **Medical Pack**: Custom SVG icon at delivery destinations that automatically inverts color (White in Dark Mode) for visibility.
  - **Adaptive Drone**: Drone icon dynamically changes stroke color (White/Black) based on the active theme.

---

## 🛠️ Technology Stack

- **Frontend Framework**: [React](https://react.dev/) (v18)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn/UI](https://ui.shadcn.com/) (built on Radix UI)
- **Map Library**: [React Map GL](https://visgl.github.io/react-map-gl/) (Mapbox Wrapper)
- **Icons**: [Lucide React](https://lucide.dev/)
- **HTTP Client**: [Axios](https://axios-http.com/)

---

## 🏃‍♂️ Getting Started

### Prerequisites
- Node.js (v18+)
- Backend Spring Boot Application running on port `8080`

### Installation

```bash
cd ilp-visualizer
npm install
```

### Running the App

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## 🔧 Configuration

- **Proxy**: Configured in `vite.config.js` to forward API requests (`/ilp-api`) to the backend (`http://127.0.0.1:8080`).
- **API Service**: `src/services/ilpApi.js` handles all backend communication.

