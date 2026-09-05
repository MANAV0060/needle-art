# 🪡 Needle Art & Perforation Template Generator

An advanced, high-precision web application that transforms any portrait, photo, or vector artwork into printable **Needle Art & Paper Perforation Templates**. Designed specifically for paper prick artists, pin-prick embroidery, light-box perforation craft, and tactile paper art.

![Needle Art Generator](https://img.shields.io/badge/Status-Active-brightgreen) ![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite) ![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript) ![License](https://img.shields.io/badge/License-MIT-blue)

---

## ✨ Features

- **🎨 Multi-Mode Generation**:
  - **Outline Mode**: Traces smooth connected contours for structural line art.
  - **Shading Mode**: Variable-density blue noise / Poisson disk stippling for realistic gradients & shadow tones.
  - **Hybrid Mode**: Merges sharp outline contours with adaptive shading stippling.

- **🛡️ Guaranteed Paper Bridge Safety Margin (Zero Overlaps)**:
  - Enforces physical edge-to-edge clearance: $\text{dist}(p_1, p_2) \ge r_1 + r_2 + \text{paperBridge}$
  - Prevents needle holes from overlapping or breaching physical paper integrity, eliminating paper tearing during manual punching.
  - Adjustable safety margin slider ($0.1\text{mm} - 1.5\text{mm}$).

- **🎯 Targeted Area Adjustments (Local Region Tuning / ROI)**:
  - Draw custom selection bounding boxes over any area of the image (e.g. eyes, lips, hair).
  - Fine-tune **7 local controls** independently for selected regions:
    1. Local Feature Sharpness
    2. Local Contrast Boost
    3. Local Tonal Gamma
    4. Local Edge Sensitivity
    5. Local Noise Smoothing
    6. Local Hole Spacing (Min)
    7. Local Punch Size Scale

- **📐 Precise Millimeter Paper Setup**:
  - Supports standard paper sizes (**A4, A3, US Letter, US Legal, Square 200mm**) in Portrait & Landscape.
  - Custom margins and printed hole diameter controls.
  - Variable needle hole size (3D depth simulation).

- **🖨️ Export & Print Ready**:
  - High-resolution PDF export with registration crop marks.
  - Clean vector SVG & transparent PNG export options.
  - Interactive **Needle Punch Simulation Mode** to preview light passing through perforated holes.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- `npm` or `yarn`

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/MANAV0060/needle-art.git
   cd needle-art
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5174` (or the URL displayed in your terminal).

---

## 🛠️ Project Structure

```
needle-art/
├── index.html              # Main HTML entry point
├── package.json            # Dependencies & build scripts
├── vite.config.js          # Vite configuration
└── src/
    ├── app/                # App state management & orchestration
    ├── engine/             # Image processing & point generation algorithms
    │   ├── contourSampler.js   # 8-neighbor edge contour tracing
    │   ├── edgeDetector.js     # Sobel operator edge detection
    │   ├── importanceMap.js    # Adaptive density mapping
    │   ├── pointGenerator.js   # Master point generator & zero-overlap safety filter
    │   ├── spatialHash.js     # Fast O(1) spatial hashing collision grid
    │   ├── stippling.js       # Poisson disk blue noise stippler
    │   └── worker.js          # Off-main-thread Web Worker engine
    ├── presets/            # Sample image presets
    ├── styles/             # Modular CSS stylesheet design system
    ├── ui/                 # Interactive UI components & sidebar controls
    └── canvas/             # Pan/zoom canvas renderer & 3D needle punch simulation
```

---

## 🖨️ How to Use for Needle Art

1. **Upload your image** or click one of the built-in sample presets.
2. Select your **Paper Size** and **Hole Spacing** preferences.
3. If paper tearing is a concern, adjust the **Paper Bridge Safety Margin** slider.
4. To enhance specific features (e.g. eyes or subtle shading in portraits), click **"+ Select / Draw Area"** and drag a region box on the canvas to adjust local contrast/gamma.
5. Click **Download Print Template (PDF/PNG/SVG)** to print at 100% true scale on your paper.
6. Use a needle or prick tool to punch holes over the printed template marks!

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
