
# ERMOL — Learn • Practice • Grow

A static frontend (HTML/CSS/vanilla JS) that runs on GitHub Pages, with Supabase as the online database and admin login. No Node.js or localhost is needed.

## 1. Create a Supabase project
1. Sign in at https://supabase.com and click **New project**.
2. Choose a name, database password and region, then wait for it to finish setting up.

## 2. Run `schema.sql`
Open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and click **Run**. This creates `quizzes`, `questions` and `attempts` with Row Level Security enabled.

## 3. Create the admin user
1. **Authentication → Users → Add user → Create new user**. Enter your admin email and password and tick **Auto Confirm User**.
2. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up". Any signed-in account can create quizzes, so only accounts you create by hand should exist.

## 4 & 5. Add your Supabase URL and anon key
Open **Project Settings → API**. In `js/config.js`, replace only these two values:

```js
SUPABASE_URL: "YOUR_SUPABASE_URL",        // Project URL
SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY" // "anon public" key
```
Never paste the `service_role` key anywhere in this project.

## 6. Upload to GitHub
Create a new public repository named `ERMOL`, then upload all files, keeping the folder structure (`index.html` must be in the repository root).

## 7. Enable GitHub Pages
**Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, folder = `/ (root)`, then **Save**. After a minute your site is live at `https://USERNAME.github.io/ERMOL/`.

## 8. How students join quizzes
- **Quiz code:** enter the code (e.g. `ERMOL-7K29P`) on the home page, click **Continue**, enter a name and start.
- **Practice:** pick subject → topic → difficulty, click **Start Practice →**, enter a name. Practice draws up to 20 unique questions from published quizzes that match. Practice results are shown but not saved.

## 9. How the admin creates quizzes
1. **Admin Login** → sign in → dashboard opens.
2. **+ Create Quiz**: title, subject, topic, difficulty, time, then **+ Add Question** for each question.
3. **Save Quiz**. It starts as a **Draft**.
4. Click **Publish** and share the code. **Unpublish**, **Edit** and **Delete** are in the table.

## 10. How quiz codes work
Codes look like `ERMOL-XXXXX` and are generated automatically on save. The database has a unique constraint on `code`, and the app retries with a new code on a collision. Only published quizzes can be opened by code.

## 11. Security notes
- Only the public anon key is in the frontend; access is enforced by Row Level Security in the database.
- The public can read only published quizzes and their questions, and can insert attempts only for published quizzes. Only a quiz's owner can edit it or read its attempts.
- **Known limit:** because grading runs in the browser, correct answers are readable by anyone who inspects a published quiz's data. This suits practice and classroom use, not high-stakes exams.
- Student names are entered freely and are not verified.
