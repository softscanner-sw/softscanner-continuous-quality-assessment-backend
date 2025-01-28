# Continuous Quality Assessment for Web Applications
## Overview
This is the **SoftScanner** TypeScript platform, a comprehensive tool for the **automatic continuous quality assessment of web applications**. It enables users to evaluate selected quality goals and sub-goals for their web applications, leveraging a fully automated pipeline for data collection, metric computation, and quality assessment.

The platform uses the **SoftScanner Quality Mapping Model (SSQMM)**, which is based on the ISO/IEC 25010 (2023) quality standards, to map high-level quality goals to observable metrics.
Instrumentation bundles are dynamically generated and deployed into the target application.
SoftScanner's instrumentation logic is **modular and extensible**, with a clear separation between **abstract core components** and **specific concrete implementations**. For instance:

- **OpenTelemetry** is used to collect trace telemetry data efficiently when required.
- The design is flexible enough to support custom implementations or other tools (e.g., **Prometheus** for system metrics).

---

## Key Workflow
1. **Select Quality Goals:** Users specify the quality goals and sub-goals to assess.
2. **Automated Instrumentation:** SoftScanner dynamically generates and injects instrumentation agents into the application without manual intervention.
3. **Run and Interact:** The instrumented application collects the required observable data during runtime as users interact with it.
4. **Continuous Quality Assessment:** SoftScanner processes the collected data and computes quality metrics dynamically, providing assessment scores for the selected quality goals.

---

## Features
- **Dynamic Goal-Driven Assessment:** Leverages `AssessmentEngine` and `QualityAssessmentService` to dynamically compute metrics and assess goals.
- **Extensible Architecture:** Easily add new metrics, goals, or telemetry types by extending the core components.
- **Flexible Instrumentation Core**: Modular support for different instrumentation strategies, such as OpenTelemetry.
- **Automated Instrumentation:** Dynamically generates and integrates goal-specific instrumentation agents.
- **Comprehensive Metrics API:** Tracks metric history and dynamically normalizes metric values using historical data.
- **Goal-Based Assessment Strategies:** Includes interpreters for metrics like **NUU** (Number of Unique Users) and **UIF** (User Interaction Frequency) (*for the time being*).
- **Enhanced REST API:** Supports endpoints for application metadata, goals, metrics, and assessments, with progress streamed via Server-Sent Events (SSE).
- **Scalable Telemetry Storage:** Supports file-based and database storage strategies.
- **Non-Invasive Deployment:** Minimal codebase modification ensures smooth integration with existing projects.

---

## Getting Started
### Prerequisites
1. Install [Node.js](https://nodejs.org/) (v16+ recommended).
2. Install `npm` (comes bundled with Node.js).
3. Install the TypeScript compiler globally:

   ```bash
   npm install -g typescript
   ```

### Installation
Clone the repository to your local machine:

```bash
git clone https://github.com/softscanner-sw/continuous-quality-assessment-web.git
cd continuous-quality-assessment-web/
```

Install the dependencies:

```bash
npm install
```

---

## Usage
### Running the Tool
Start the platform by running:

```bash
npm start
```

This will:
1. Compile the TypeScript code.
2. Launch the backend server, which listens on `http://localhost:3000` and exposes a REST API.
3. Allow interaction with the frontend project. You can find the frontend project here: [SoftScanner UI Repository](https://github.com/softscanner-sw/continuous-quality-assessment-web-ui). Alternatively, you can use Postman by creating the right requests (see Endpoints below).
4. Collect telemetry data, compute metrics, and continuously assess the selected quality goals.

### Cleaning the `dist/` Directory
To clean the `dist/` directory before a fresh build, use:

```bash
npm run clean
```

---

## REST API Description
The backend server exposes a REST API for managing and interacting with the SoftScanner platform. Below is an overview of the updated endpoints:

### Base URL
The API is hosted at:
```
http://localhost:3000/api
```

### Endpoints
#### **1. Retrieve Quality Model**
- **`GET /quality-model`**  
  **Description:** Retrieves the quality model used by SSQMM and its associated goals and sub-goals.  
  **Response Example:**  
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

#### **2. Start Quality Assessment**
- **`POST /assessment`**  
  **Description:** Initiates a quality assessment for the provided application metadata and selected goals.  
  **Request Body:**  
  ```json
  {
    "metadata": {
        "name": "ng-posts-users",
        "type": "Web (Frontend)",
        "technology": "Angular",
        "path": "/absolute/path/to/ng-posts-users",
        "url": "http://localhost:4200" // local development
    },
    "selectedGoals": ["User Engagement", "Performance"]
  }
  ```
  **Response Example:**  
  ```json
  {
    "message":"Assessment started successfully!",
    "assessmentId":"1674928912333",
    "progressEndpoint":"/api/progress?assessmentId=1674928912333",
    "assessmentEndpoint":"/api/assessments?assessmentId=1674928912333"
  }
  ```

#### **3. Stream Progress Updates**
- **`GET /progress?assessmentId=<assessment_id>`**  
  **Description:** Streams real-time progress updates via SSE for the assessment process identified by `assessment_id`.  
  **Response Example:**
  ```json
  { "type": "progress", "message": "Instrumentation completed" }
  ```

#### **4. Stream Assessment Results**
- **`GET /assessments?assessmentId=<assessment_id>`**  
  **Description:** Streams assessment results, including metadata, selected goals, metrics, and assessments, via SSE for the assessment process identified by `assessment_id`.   
  **Response Example:**  
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

## Project Structure
The platform follows a modular architecture for scalability and maintainability. Below is a high-level overview of the project structure:

```plaintext
src/
├── api/
│   └── server.ts                 # Entry point for the server
├── core/
│   ├── application/              # Application metadata
│   ├── assessment/               # Core assessment logic and strategies
│   ├── computation/              # Metrics computation logic
│   ├── goals/                    # Goal definitions and goal-mapping logic
│   ├── instrumentation/          # Instrumentation management and injection
│   ├── metrics/                  # Core metrics definitions and mappers
│   ├── models/                   # Quality model and SSQMM
│   ├── telemetry/                # Telemetry configuration and types
│   └── util/                     # Utility functions and dependency management
├── modules/
│   ├── instrumentation/          # Instrumentation implementations and deployment
│   ├── metrics/                  # Metrics implementations and mappings
│   └── telemetry/                # Telemetry collection and storage strategies
├── services/                     # Core services (e.g., metrics, telemetry, progress tracking)
```

---

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.