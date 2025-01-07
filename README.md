# Continuous Quality Assessment for Web Applications
## Overview
This is the SoftScanner typescript platform dedicated for the automatic continuous quality assessment of web applications.
The user provides a test web application and selects his quality goals and sub-goals of interest.
These goals are provided by the *SoftScanner Quality Mapping Model (SSQMM)*, based on the ISO/IEC 25010 (2023) quality standards.
Following this selection, the user proceeds to launch the platform to assess these goals for his test application.
The platform automatically generates instrumentation agents developed using software observability tools (e.g., OpenTelemetry) to collect only the necessary data required for the selected quality goals, as indicated by the SSQMM.
These agents are automatically developed and deployed into the test application, without user intervention.
The user can then interact with their instrumented test application, thereby triggering the collection of the required observable data at runtime.
SoftScanner periodically and automatically collects this data, to continously provide assessment scores for the selected quality goals at runtime.
These scores are computed by evaluating the quality metrics associated with the selected quality goals, as indicated in the SSQMM.

## Features
@TODO

## Getting Started
### Prerequisites
Ensure you have [Node.js](https://nodejs.org/) and `npm` installed on your machine. This tool is built with TypeScript, so having the TypeScript compiler globally available is recommended.

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

### Configuration
@TODO

### Running the Tool
To run the tool, execute the following command:

```bash
npm start
```

This command compiles the TypeScript code and starts the instrumentation, telemetry collection, metrics computation, and quality assessment processes.

### Cleaning the `dist/` Directory
To clean the `dist/` directory before a fresh build, you can use:

```bash
npm run clean
```