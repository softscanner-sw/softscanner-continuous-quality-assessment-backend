# SoftScanner Backend – Continuous Quality Assessment Platform
SoftScanner is an **automated continuous quality assessment (CQA) platform** designed for **web applications**. This backend service provides **instrumentation, telemetry collection, metric computation, and real-time goal assessments** using the **SoftScanner Quality Mapping Model (SSQMM)**, aligned with **ISO/IEC 25010 (2023) standards**.
The platform uses **SSQMM** to map high-level quality goals to observable metrics.
This version introduces **timestamped assessments**, enabling **historical tracking of quality goals and their contributing metrics**.

Instrumentation bundles are dynamically generated and deployed into the target application.
SoftScanner's instrumentation logic is **modular and extensible**, with a clear separation between **abstract core components** and **specific concrete implementations**. For instance:

- **OpenTelemetry** is used to collect trace telemetry data efficiently when required.
- The design is flexible enough to support custom implementations or other tools (e.g., **Prometheus** for system metrics).

---

## 🌟 Key Features
- **📊 Continuous Quality Assessment** → Automates quality monitoring using real-time telemetry data.
- **🕒 Timestamped Goal Assessments** → Tracks assessments over time for historical analysis.
- **📈 Dynamic Metric Evaluations** → Computes and stores timestamped metric values.
- **📡 API-Driven Architecture** → Provides structured endpoints for **metadata, goals, metrics, and assessments**.
- **🛠️ Automated Instrumentation** → Injects telemetry agents dynamically into the application.
- **⚡ Real-Time SSE Updates** → Streams progress and assessment results live.
- **📏 Quality Mapping Model (SSQMM)** → Maps **abstract stakeholder goals** to **observable quality metrics**.
- **🗂️ Modular and Extensible** → Easily integrates new goals, metrics, and telemetry providers.

---

## 📁 Project Structure
```plaintext
src/
├── api/
│   └── server.ts                 # Express API server entry point
├── core/
│   ├── application/              # Application metadata
│   ├── assessment/               # Core assessment logic and strategies
│   ├── computation/              # Metrics computation logic
│   ├── goals/                    # Goal definitions and goal-mapping logic
│   ├── instrumentation/          # Instrumentation management and injection
│   ├── metrics/                  # Core metrics definitions and mappers
│   ├── models/                   # Quality model and SSQMM
│   ├── telemetry/                # Telemetry configuration and data collection
│   └── util/                     # Utility functions and dependency management
├── modules/
│   ├── instrumentation/          # Instrumentation implementations and deployment
│   ├── metrics/                  # Metrics implementations and mappings
│   └── telemetry/                # Telemetry collection and storage strategies
├── services/                     # Core services (e.g., quality assessment, progress tracking)
```

---

## 🔧 Setup & Installation
### 1️⃣ Prerequisites
Ensure you have the following installed:
- **Node.js** (>= 16.x recommended)
- **TypeScript Compiler**
- **npm** (comes bundled with Node.js)

### 2️⃣ Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/softscanner-sw/softscanner-backend.git
cd softscanner-backend
npm install
```

### 3️⃣ Running the Backend
Start the platform:
```bash
npm start
```
This will:
1. **Compile TypeScript files**.
2. **Launch the backend server** (`http://localhost:3000`).
3. **Expose REST API endpoints** for quality assessment.
4. **Enable telemetry collection** and **live goal assessment**.

---

## 📡 API Overview
SoftScanner Backend provides structured **RESTful APIs** to interact with **quality models, goals, metrics, and assessments**.

### 🔗 Key Endpoints
| Method   | Endpoint                            | Description                                       |
| -------- | ----------------------------------- | ------------------------------------------------- |
| **GET**  | `/api/quality-model`                | Retrieves the quality model and associated goals. |
| **POST** | `/api/assessment`                   | Initiates a new quality assessment.               |
| **GET**  | `/api/progress?assessmentId=XYZ`    | Streams live progress updates via SSE.            |
| **GET**  | `/api/assessments?assessmentId=XYZ` | Streams real-time assessment results.             |

---

## 📜 Quality Assessment Workflow
### 1️⃣ Define Quality Goals and Provide Metadata
Users select **quality goals** relevant to their application while providing metadata about it.

### 2️⃣ Automatic Instrumentation
SoftScanner **injects telemetry agents** dynamically, enabling **runtime data collection**.

### 3️⃣ Data Collection & Metric Computation
The instrumented application collects **real-time data**, and **SoftScanner computes quality metrics**.

### 4️⃣ Timestamped Goal Assessments
- Every goal **stores multiple timestamped assessments**.
- Assessments contain a **computed global score** and **metric contributions**.
- **Historical metric tracking** enables **trend analysis**.

### 5️⃣ Real-Time API Updates
Users can:
- **Monitor progress** (`/api/progress`).
- **Retrieve assessment history** (`/api/assessments`).

---

## 📡 API Usage Examples
### 1️⃣ Retrieve Quality Model
#### Request
```http
GET /api/quality-model
```
#### Response
```json
{
    "name":"ISO/IEC 25010 - Product Quality Model",
    "purpose":"The ISO/IEC 25010 (2023) identifies eight main quality characteristics of software systems...",
    "assessmentMethodology":"https://www.iso.org/obp/ui/#iso:std:iso-iec:25010:ed-2:v1:en",
    "goals":[
        {
            "name":"Interaction Capability",
            "description":"The ability of a product to be interacted with by specified users ...",
            "weight":1,
            "metrics":["Number of Unique Users","User Interaction Frequency"],
            "subGoals":[
                {"name":"Appropriateness Recognizability"...},
                ...
                {
                    "name":"User Engagement",
                    "description":"The degree to which the software presents functions and information in an inviting and motivating manner encouraging continued interaction",
                    "weight":1,
                    "metrics":["Number of Unique Users","User Interaction Frequency"]
                },
                ...
            ]
        },
        ...
    ]
  }
```

### 2️⃣ Start an Assessment
#### Request
```http
POST /api/assessment
Content-Type: application/json
```
```json
{
  "metadata": {
    "name": "My Web App",
    "type": "Web (Frontend)",
    "technology": "Angular",
    "path": "/absolute/path/to/project",
    "url": "http://localhost:4200"
  },
  "selectedGoals": ["User Engagement"]
}
```
#### Response
```json
{
  "message": "Assessment started successfully!",
  "assessmentId": "1706308901234",
  "progressEndpoint": "/api/progress?assessmentId=1706308901234",
  "assessmentEndpoint": "/api/assessments?assessmentId=1706308901234"
}
```

### 3️⃣ Stream Progress Updates
#### Request
```http
GET /api/progress?assessmentId=1706308901234
```
#### Response (SSE)
```json
{ "type": "progress", "message": "Instrumentation completed" }
```

### 4️⃣ Stream Assessment Results
#### Request
```http
GET /api/assessments?assessmentId=1706308901234
```
#### Response (SSE)
```json
{
    "metadata": { /* same format as input metadata in /assessment endpoint */ },
    "selectedGoals": [
        {
            "name": "User Engagement",
            "description": "The degree to which the software presents functions...",
            "weight": 1,
            "metrics": [
                {
                    "name": "Number of Unique Users",
                    "acronym": "NUU",
                    "description": "Number of distinct users using an application",
                    "value": 2,
                    "unit": "users",
                    "history": [
                        {
                            "timestamp": "2025-01-27T23:35:11.879Z",
                            "value": 0
                        },
                        ...
                    ]
                },
                {
                    "name": "User Interaction Frequency",
                    "acronym": "UIF",
                    "description": "How frequently users interact with the software during a typical session",
                    "value": 9,
                    "unit": "interactions/session",
                    "history": [ ... ]
                }
            ],
            "assessment": {
                "globalScore": 0.014799999999999999,
                "details": [
                    { "metric": "NUU", "value": 0.01, "weight": 0.4 },
                    { "metric": "UIF", "value": 0.018, "weight": 0.6 }
                ]
            }
        },
        ...
    ]
}
```

---

## 🌍 Example Usage
### 1️⃣ Start SoftScanner Backend
```bash
npm start
```
### 2️⃣ Open SoftScanner Web UI
Allow interaction with the frontend project. You can find the frontend project here: [SoftScanner UI Repository](https://github.com/softscanner-sw/continuous-quality-assessment-web-ui).

```bash
npm start
```

Alternatively, you can use Postman by creating the right requests (*see API Usage Examples above*).

### 3️⃣ Perform a Quality Assessment
1. **Select quality goals** in the UI.
2. Click **Start Assessment**.
3. Open your **web application in a browser** → SoftScanner **automatically tracks interactions**.

### **4️⃣ View Results**
- Real-time **progress updates** (`/api/progress`).
- Timestamped **goal assessments** (`/api/assessments`).
- Metric **history and contributions** displayed via **interactive charts**.

---

## 📜 License
SoftScanner Backend is licensed under the **MIT License**.

---