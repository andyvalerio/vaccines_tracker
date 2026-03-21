# Project Requirements

## Common & Vaccines

### [US-COMMON-01] Secure Authentication
**As a** user
**I want to** securely log in to the application
**So that** I can access and protect my private health data.

### [US-COMMON-02] Tab Navigation
**As a** user
**I want to** switch between the "Vaccines" and "Diet" tabs
**So that** I can manage different aspects of my health in a unified interface.

### [US-VACCINE-01] Add Vaccine Record
**As a** user
**I want to** add a vaccine record with details like name, date taken, and next due date
**So that** I can keep a digital log of my immunizations.

### [US-VACCINE-02] View Upcoming Vaccinations
**As a** user
**I want to** see a list of vaccines that are due soon
**So that** I can plan for my next doses and not miss them.

### [US-VACCINE-03] AI Vaccine Suggestions
**As a** user
**I want to** receive AI-powered suggestions for vaccines I might be missing
**So that** I can ensure comprehensive immunization coverage.

## Diet Tracker

### [US-DIET-01] Log Food Entry
**As a** user
**I want to** log a food entry with a specific name and optional notes
**So that** I can keep track of what I eat throughout the day.

### [US-DIET-02] Log Medicine Entry
**As a** user
**I want to** log a medicine entry with the medication name and notes
**So that** I can record my medication intake history.

### [US-DIET-03] Log Symptom Entry
**As a** user
**I want to** log a symptom with an intensity level (e.g., 1-5)
**So that** I can monitor the severity of my health conditions over time.

### [US-DIET-04] View Daily Logs
**As a** user
**I want to** view my diet, medicine, and symptom logs grouped by date
**So that** I can see a clear timeline of my health-related activities.

### [US-DIET-05] Delete Log Entry
**As a** user
**I want to** delete an incorrect log entry (food, medicine, or symptom)
**So that** my health records remain accurate.

### [US-DIET-06] Symptom Context (After Food)
**As a** user
**I want to** specify if a symptom occurred after eating and the estimated delay
**So that** I can identify potential food triggers for my symptoms.

### [US-DIET-07] Visual Entry Distinction
**As a** user
**I want to** see different icons and colors for food, medicine, and symptoms
**So that** I can quickly scan my logs and distinguish between entry types.

### [US-DIET-08] Entry Timestamps
**As a** user
**I want to** see the time of day for each entry
**So that** I can understand the chronological sequence of my daily events.

### [US-DIET-09] Diet Analytics
**As a** user
**I want to** view analytics derived from my logs
**So that** I can spot trends and patterns in my diet and health.

### [US-DIET-10] Quick Add Actions
**As a** user
**I want to** have quick access buttons to log food, medicine, or symptoms
**So that** I can add entries efficiently without navigating through complex menus.

### [US-DIET-11] Multi-Tab Entry Drafting
**As a** user
**I want to** switch between Food, Medicine, and Symptom tabs in the add entry modal without losing my input
**So that** I can draft multiple related entries (e.g., food and medicine) before saving them all at once.

### [US-DIET-12] Batch Save Entries
**As a** user
**I want to** save all my drafted entries (food, medicine, and/or symptoms) with a single click
**So that** I can quickly log a complex health event without opening the modal multiple times.

### [US-DIET-13] Draft Status Indicators
**As a** user
**I want to** see visual indicators on the tabs that have unsaved draft content
**So that** I am aware of what will be saved when I confirm the action.

## Blood Markers Tracker

### [US-MARKER-01] Manage Markers
**As a** user
**I want to** add, edit, and delete custom blood markers and define their normal ranges
**So that** I can track any type of health metric that is relevant to me.

### [US-MARKER-02] Log Marker Records
**As a** user
**I want to** log a new value for a specific marker at a specific date, and be able to edit or delete it
**So that** my health records remain accurate over time.

### [US-MARKER-03] Visualize Timeline Graph
**As a** user
**I want to** view my marker records plotted on a timeline graph
**So that** I can easily observe trends in my blood marker values.

### [US-MARKER-04] Compare Markers and Select Reference
**As a** user
**I want to** plot multiple markers on the same graph and choose which marker's normal range is highlighted in the background
**So that** I can visually compare different values against a specific baseline.

### [US-MARKER-05] Import from Unstructured Sources
**As a** user
**I want to** upload unstructured documents (like PDFs) containing my blood test results
**So that** the system can automatically extract the relevant markers, values, and dates using AI.

### [US-MARKER-06] Selectively Confirm Import
**As a** user
**I want to** review a table of the extracted data and select/unselect specific records before confirming the import
**So that** I have full control over what is added to my health tracker.
