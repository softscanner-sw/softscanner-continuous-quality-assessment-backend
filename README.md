# Continuous Quality Assessment for Web Applications
## Overview
This is the **SoftScanner** TypeScript platform, a comprehensive tool for the **automatic continuous quality assessment of web applications**. It enables users to evaluate selected quality goals and sub-goals for their web applications, leveraging a fully automated pipeline for data collection and quality metric computation.

The platform uses the **SoftScanner Quality Mapping Model (SSQMM)**, which is based on the ISO/IEC 25010 (2023) quality standards, to map high-level quality goals to observable metrics. It employs **OpenTelemetry** for efficient instrumentation and observability, ensuring the collection of only the necessary data for the selected goals.

### Key Workflow
1. **Select Quality Goals:** The user specifies the quality goals and sub-goals to assess.
2. **Automated Instrumentation:** SoftScanner generates instrumentation agents based on the selected goals and deploys them into the application without manual intervention.
3. **Run and Interact:** The instrumented application collects the required observable data during runtime as users interact with it.
4. **Continuous Quality Assessment:** SoftScanner processes the collected data and computes quality metrics in real-time, providing scores for the selected quality goals.

---

## Features
- **Goal-Driven Assessment:** Maps high-level quality goals to metrics using the SSQMM, enabling targeted assessments.
- **Automated Instrumentation:** Seamlessly generates and injects instrumentation agents (e.g., OpenTelemetry-based agents).
- **Continuous Assessment:** Provides real-time quality scores based on dynamic interactions with the application.
- **Support for Multiple Quality Metrics:** Includes user engagement metrics (e.g., NUU and UIF), tracing, and logging.
- **Extensible Architecture:** Easily add new metrics, goals, or telemetry types by extending the platform.
- **Non-Invasive Deployment:** Minimal codebase modification ensures smooth integration with existing projects.
- **Scalable Telemetry Storage:** Supports multiple storage strategies, including file-based and database storage.

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
3. Allow interaction with the frontend project. You can find the frontend project here: [SoftScanner UI Repository](https://github.com/softscanner-sw/continuous-quality-assessment-web-ui).
4. Collect telemetry data, compute metrics, and continuously assess the selected quality goals.

### Cleaning the `dist/` Directory
To clean the `dist/` directory before a fresh build, use:

```bash
npm run clean
```

---

## REST API Description
The backend server exposes a REST API for managing and interacting with the SoftScanner platform. Below is an overview of the available endpoints:

### Base URL
The API is hosted at:
```
http://localhost:3000/api
```

### Endpoints
#### **1. Retrieve Quality Model**
- **`GET /quality-model`**  
  **Description:** Retrieves the current quality model and its associated goals.  
  **Response:**  
  ```json
  {
    "name": "ISO/IEC 25010",
    "description": "Quality model for continuous assessment",
    "goals": [
      {
        "name": "User Engagement",
        "description": "Evaluates user interaction patterns and engagement levels.",
        "subGoals": [
          {
            "name": "User Interaction Frequency",
            "description": "Measures the frequency of user interactions."
          }
        ]
      },
      {
        "name": "Performance",
        "description": "Evaluates application response time and resource utilization."
      }
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
      "name": "test-app",
      "type": "web",
      "technology": "Angular",
      "path": "/absolute/path/to/application",
      "url": "http://localhost:4200"
    },
    "selectedGoals": ["User Engagement", "Performance"]
  }
  ```
  **Response (on success):**  
  ```json
  {
    "message": "Assessment started successfully!",
    "progressEndpoint": "/api/progress"
  }
  ```  
  **Response (on error):**  
  ```json
  {
    "error": "Assessment process failed"
  }
  ```

#### **3. Stream Progress Updates**
- **`GET /progress`**  
  **Description:** Streams real-time progress updates and computed metrics via **Server-Sent Events (SSE)**.  
  **Response Format (streamed data):**
  ```json
  {
    "type": "progress",
    "message": "Instrumentation completed"
  }
  ```
  or
  ```json
  {
    "type": "metrics",
    "metrics": [
      {
        "name": "User Interaction Frequency",
        "value": 3.4
      },
      {
        "name": "Number of Unique Users",
        "value": 15
      }
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
├── assessment/                   # Core logic for quality assessment (*Not Ready*)
│   ├── Assessment.ts             # Core assessment logic
│   └── AssessmentEngine.ts       # Assessment engine implementation
├── core/
│   ├── application/              # Application metadata
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
└── services/                     # Core services (e.g., metrics, telemetry)
```

---

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.