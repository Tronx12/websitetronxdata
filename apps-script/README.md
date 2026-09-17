# Apps Script backend bridge

1. Keep this `Code.gs` in the existing Apps Script project.
2. In **Project Settings → Script properties**, add `GROQ_KEY` with your Groq API key.
3. Deploy as a **Web app** (execute as you, access for the users who should use the portal).
4. Put the deployment `/exec` URL in the Next.js `.env.local` as `APPS_SCRIPT_URL`.
5. Do not commit `.env.local` or API keys.

The Next.js app calls the Apps Script backend through `/api/apps-script`, so the browser does not need to call `google.script.run`.
