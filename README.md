# Ledger

A private trading P&L journal.

Trades are saved in your browser, and can sync across phone and other browsers with a **sync code** (Settings → Cloud sync). Use the live Netlify URL for that — localhost cannot store the cloud copy.

## Local development

```bash
npm install
npm run dev
```

## Deploy on Netlify

1. Push this folder to GitHub.
2. In Netlify: **Add new site → Import an existing project**.
3. Build settings are already in `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Deploy.

Or drag the `dist` folder onto [Netlify Drop](https://app.netlify.com/drop) after running `npm run build`. Netlify Drop does **not** include cloud sync; connect the GitHub repo so functions can run.

