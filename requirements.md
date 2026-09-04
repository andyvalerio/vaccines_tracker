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

## Gym Tracker

### [US-GYM-01] View Gym Dashboard
**As a** user
**I want to** open a Gym tab with a dashboard listing my routines
**So that** I have a single home for starting and managing my training.

**Acceptance criteria**
- The Gym tab shows a "Gym Tracker" heading and a "Start a Workout" section.
- Each routine is listed with its name and a Start button.

### [US-GYM-02] Manage Routines and Exercise Library
**As a** user
**I want to** navigate from the dashboard to a routines editor and an exercise library
**So that** I can create routines and maintain the exercises they draw from.

**Acceptance criteria**
- A "Routines" action opens the routines editor ("My Routines").
- From there an "Exercises" action opens the "Exercise Library".
- With no routines yet, the editor shows an empty state.

### [US-GYM-03] Single Routine Builder Flow
**As a** user
**I want to** build a routine in one builder screen that searches my exercise library
**So that** I can assemble and trim a routine without a multi-step wizard.

**Acceptance criteria**
- Editing a routine opens a "Routine Builder".
- The builder offers a search over the exercise library.
- Exercises already in the routine can be removed inline.

### [US-GYM-04] Rest Between Sets and Explicit Session Completion
**As a** user
**I want to** complete a set, take a tracked rest with the next set shown, and finish the session deliberately
**So that** I pace my sets and never end a workout by accident.

**Acceptance criteria**
- Completing a set starts a rest view that keeps context ("Up Next") and offers "Skip Rest".
- Completing every set reaches an explicit "Session Complete" state with a "Save Workout" action.

### [US-GYM-05] History Defaults to Monthly Calendar
**As a** user
**I want to** see my workout history as a monthly calendar by default
**So that** I can see at a glance which days I trained.

**Acceptance criteria**
- History opens on a "Monthly Calendar" view.
- Month navigation ("Prev Month", "This Month") is available.

### [US-GYM-06] Resilient to Legacy or Malformed Data
**As a** user
**I want to** start a workout even if some stored gym data is old or malformed
**So that** a bad record never breaks my ability to train.

**Acceptance criteria**
- Starting a workout with malformed exercise/day data does not throw an uncaught error.
- Missing or invalid fields are defaulted rather than crashing the session.

### [US-GYM-07] Out-of-Order Training Finishes the Current Exercise First
**As a** user
**I want to** jump to any exercise and have all of its sets completed before the app moves me on
**So that** training out of the listed order still respects each exercise's set count.

**Acceptance criteria**
- Selecting an exercise makes it current regardless of list order.
- Each completed set advances within that same exercise until its sets are done.
- Only when the current exercise is fully complete does the app move to another.

### [US-GYM-08] Up Next Shows the Weight for the Next Set
**As a** user
**I want to** see the upcoming set's weight on the rest screen
**So that** I can set up the next set during my rest.

**Acceptance criteria**
- The rest screen's "Up Next" shows the correct set number and the weight for that set.

### [US-GYM-09] Per-Exercise Weight Labels in the Nav Strip
**As a** user
**I want to** see each exercise's working weight on its pill in the nav strip
**So that** I can glance at the loads across the whole session.

**Acceptance criteria**
- On workout start, each exercise pill shows its weight (or time target) label.

### [US-GYM-10] Abandon Session Discards Progress
**As a** user
**I want to** abandon a session and have its progress discarded
**So that** a scrapped workout leaves no lingering active session.

**Acceptance criteria**
- Abandoning navigates to history and clears the session.
- The dashboard shows no "Active Session" banner afterwards.

### [US-GYM-11] Back Button Preserves the Session
**As a** user
**I want to** leave a workout with the browser/phone back button without losing it
**So that** an accidental back press doesn't discard my progress.

**Acceptance criteria**
- Pressing back from a workout lands on the dashboard with an "Active Session" resume banner.

### [US-GYM-12] Resume Restores Workout State
**As a** user
**I want to** resume an active session from the dashboard
**So that** I continue exactly where I left off.

**Acceptance criteria**
- "Resume" reopens the workout at the same point (same current set actionable).

### [US-GYM-13] Completing One Exercise Out of Order Does Not End the Session
**As a** user
**I want to** finish a single exercise early without the app declaring the whole session done
**So that** remaining exercises are still expected.

**Acceptance criteria**
- Completing all sets of one exercise while others remain does not show "Session Complete".
- The app continues to the next uncompleted exercise ("Up Next").

### [US-GYM-14] Save & Complete With Partial Completion
**As a** user
**I want to** save and finish a session even if not every set was done
**So that** I can log a shortened workout and leave cleanly.

**Acceptance criteria**
- "Save & Complete" from a partially finished session navigates to history.
- No active session remains afterwards.

### [US-GYM-15] Correct Set Number When Partially Complete
**As a** user
**I want to** the rest screen to show the truly next set of a partially completed exercise
**So that** the count never resets to set 1.

**Acceptance criteria**
- After completing sets 1 and 2 of a three-set exercise, "Up Next" shows Set 3/3.

### [US-GYM-16] Full Out-of-Order Workout Reaches Session Complete
**As a** user
**I want to** complete every exercise in any order and still reach the end state
**So that** order never prevents finishing.

**Acceptance criteria**
- Completing all sets of all exercises, in any order, reaches "Session Complete" with "Save Workout".

### [US-GYM-17] History Row Progress Label
**As a** user
**I want to** open an exercise's progress from a history entry via a clear "Progress" label
**So that** the affordance is concise and consistent.

**Acceptance criteria**
- An exercise row in a history day shows a "Progress" label (not "Open Progress").

### [US-GYM-18] Time-Based Sets Saved in Seconds
**As a** user
**I want to** time-based exercises recorded and shown in seconds
**So that** durations are accurate and correctly labelled.

**Acceptance criteria**
- A time-based set targeting one minute is stored and displayed in seconds (e.g. two sets = "120 s").
- Such totals are never mislabelled as "mins".

### [US-GYM-19] Edit Exercise Notes During a Workout
**As a** user
**I want to** add, change, or clear an exercise's notes while I am training
**So that** I can capture a cue at the moment I notice it and have it waiting for me next time.

**Acceptance criteria**
- The note can be edited from the set screen and from the rest screen.
- The note always belongs to the exercise currently on screen — during rest, the one shown under "Up Next".
- An exercise with no note yet still offers a way to add one.
- The editor is touch-first: saving happens on Done or when the field loses focus, so tapping away to dismiss the keyboard never discards what was typed. There is no keyboard-shortcut way to cancel.
- Saving updates the exercise in the library, so the change is visible in the routine editor and in later sessions.
- Clearing the text removes the note.
- Editing never pauses, restarts, or skips the rest countdown.

### [US-GYM-20] Edit and Recall Reps Per Set
**As a** user
**I want to** record the actual number of reps I complete on each individual set, and have each set
pre-filled with what I actually did on that same set last time
**So that** the app reflects real performance rather than an assumed flat target, and I don't have to
remember or re-enter my own progress from the previous session.

**Acceptance criteria**
- The Reps tile on the active-set screen is a +/- stepper, not a static display, with no keyboard entry.
- Completing a set permanently records the reps shown at that moment as that set's actual performance,
  saved to the exercise in the database immediately — not just locally, and not only at the end of the
  exercise or session.
- The next time this exercise is started, each set's reps default to the actual reps performed on that
  same set index last time — set 1 recalls set 1, set 2 recalls set 2, etc.
- This recalled value takes priority over the exercise's configured target reps, even if the configured
  target has changed since.
- A set index with no prior recorded performance (new exercise, or reconfigured with more sets than were
  previously recorded) falls back to the exercise's configured target reps.
- If a session is abandoned partway through an exercise, the sets that were actually completed keep their
  recorded reps for next time; only the unfinished sets have no new data.
- Saved workout history (History and Progress views) reflects actual reps performed, not the configured
  target, for total reps and total volume going forward. Sessions saved before this feature keep their
  previously saved numbers unchanged.

### [US-GYM-21] Training Cycle Awareness (Periodization)

**As a** user
**I want to** define a repeating training cycle of several building weeks followed by an optional
lighter "deload" week, and see at a glance which week of the cycle I am currently in
**So that** I can apply progressive overload deliberately across weeks instead of guessing, and know
when it is time to back off and recover.

**Acceptance criteria**
- A single training cycle applies to all training (it is global, not per-routine).
- The cycle is optional: until the user sets one up, no cycle indicator is shown, only an
  affordance to set one up.
- Setting up a cycle defaults to 4 building weeks plus a deload week, and a rep range of 8–12, and
  defaults the start date to today.
- The start date is explicitly selectable and may be in the past, so a cycle already underway can be
  anchored retroactively to the day week 1 actually began.
- The cycle is configurable: number of building weeks, whether there is a deload week, and the rep
  range used for progression suggestions.
- The current week is derived from the cycle's start date and today's date, so a week is never
  manually advanced and missed calendar weeks do not desynchronise it.
- The Gym dashboard shows the cycle visually as a row of week markers with the current week
  highlighted and the deload week visually distinct, plus a plain-language label such as
  "Week 3 of 4 · deload next week" or, during the deload week, "Deload week — go light".
- During a deload week, the active workout shows a passive "go light" reminder. It never changes,
  reduces, or otherwise prescribes any set's target — it is informational only.
