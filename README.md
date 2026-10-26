# StudentAI — Performance Prediction & Resume Analyzer

A beginner-friendly static frontend starter using **HTML, CSS, vanilla JavaScript, and Supabase** (Auth + PostgreSQL). It is designed to be easy to open and understand without React or a Python server.

## What is implemented in this starter

- Responsive dashboard navigation, summary cards, chart, prediction form, history table, resume analysis page, job recommendation cards, profile/settings, and about page.
- A transparent baseline score estimate with rule-based suggestions. It is **not a trained or validated ML model**.
- PDF selectable-text extraction in the browser through PDF.js. The PDF is not uploaded to a server or permanently saved by this starter. Scanned PDFs need OCR and are reported as unsupported.
- Keyword-based skill extraction, target-role skill coverage, and example job recommendations.
- Supabase client configuration and prediction history CRUD for authenticated users.
- SQL schema, constraints, row-level security policies, and six educational sample job roles.

## Important limitations

- Authentication is wired to Supabase session restoration/sign-out, but this starter does not yet include register/login forms. Create a user in Supabase Authentication for a demo, then sign in can be added as the next step. Until signed in, private prediction history cannot be saved.
- The score is a weighted baseline, not scikit-learn. No claims of ML validation are made.
- Resume analysis currently stays in the browser and is not persisted to `resume_analysis_results`.
- Job recommendations are generated from the local sample role catalogue, not live vacancies. SQL seeds the same roles for future database-backed integration.
- This is a college-project starter. Review security, accessibility, and deployment settings before public deployment.

## Project structure

```text
smart_student_supabase_starter/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   └── config.js
├── supabase_schema.sql
└── README.md
```

## Architecture

```text
Browser
  ├── index.html + styles.css (interface)
  ├── app.js (navigation, form validation, baseline estimate, PDF text parsing)
  ├── PDF.js CDN (local PDF text extraction)
  └── Supabase JS SDK
        ├── Supabase Auth (identity/session)
        └── PostgreSQL
              ├── student_profiles
              ├── performance_predictions
              ├── jobs
              └── resume_analysis_results
        Row Level Security keeps user-specific rows private
```

## Setup on Windows

### 1. Create a Supabase project

1. Open https://supabase.com and create a project.
2. Open **Project Settings → API** (or API Keys, depending on dashboard version).
3. Copy the Project URL and the public **publishable key** (or legacy `anon` key). Never use a `service_role` or secret key in browser code.
4. In **SQL Editor**, paste all of `supabase_schema.sql` and run it.
5. In **Authentication → Users**, create a test user for the demo. Configure email confirmation as appropriate for your development project.

### 2. Open the frontend

The simplest option is VS Code:
1. Extract the ZIP.
2. Open the folder in VS Code.
3. Install the **Live Server** extension if needed.
4. Right-click `index.html` → **Open with Live Server**.

Alternative with Python already installed:

```powershell
cd path\to\smart_student_supabase_starter
py -m http.server 5500
```

Then open http://localhost:5500.

### 3. Connect Supabase

1. In the app, open **Profile & Settings**.
2. Enter your Supabase project URL and public publishable/anon key.
3. Click **Save connection on this device**.

The settings are stored in this browser's local storage. For a personal local demo, you can instead place them in `js/config.js`, but do not commit private credentials. The public key is designed for browser use only when RLS is configured correctly.

### 4. Authentication note

The SQL policies require a signed-in Supabase Auth user for private rows. This starter restores an existing session and supports sign-out, but it does not yet implement the registration/login UI or a sign-in form. Until that UI is added, create a user in the Supabase dashboard and use a small follow-up implementation for sign-in. Do not disable RLS to bypass authentication.

## Prediction formula

The demo computes:

```text
study_score      = min(100, weekly_study_hours × 4)
completion_score = min(100, completed_assignments × 10)

estimated_score = clamp(
  0.25 × attendance
+ 0.25 × previous_marks
+ 0.15 × assignment_average
+ 0.20 × internal_marks
+ 0.075 × study_score
+ 0.075 × completion_score,
  0, 100
)
```

This is only an explainable demonstration baseline. The weights are illustrative, not statistically learned or validated.

## Job match formula

For each example job:

```text
skill_match_percent = 100 × (number of required skills detected
                              / number of required skills)
```

Preferred skills are displayed as role context but are not included in the match percentage. Skill extraction is keyword-based, so it can miss synonyms and may identify a keyword without understanding the depth of experience.

## Example prediction input

- Attendance: 85
- Previous exam marks: 72
- Assignment average: 80
- Internal exam marks: 75
- Weekly study hours: 12
- Completed assignments: 8

Expected demo baseline estimate: **77.0%** (category: Good). This is a deterministic formula output, not an ML accuracy claim.

## Troubleshooting

- **Supabase does not connect:** check URL, public key, network access, and browser console.
- **History insert is denied:** confirm the user is signed in and the SQL schema/policies were run. Never remove RLS as a workaround.
- **PDF cannot be read:** PDF.js is loaded from a CDN, so internet access is required. The PDF must contain selectable text; scanned PDFs need OCR.
- **Blank layout:** serve the folder through Live Server or `py -m http.server`, rather than opening the file with a `file://` URL.

## Suggested next stage

Add dedicated Register/Login pages using `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()`, persist safe resume summaries in `resume_analysis_results`, and add a FastAPI + scikit-learn service for trained predictions and server-side PDF parsing if your project rubric requires Python ML.
