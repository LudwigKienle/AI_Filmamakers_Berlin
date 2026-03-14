# Google Apps Script Notify Endpoint

## Goal

This setup gives the landing page a real one-step signup endpoint:

- the website stores email addresses directly
- duplicate signups are merged instead of appended
- the saved list lives in a Google Sheet
- a helper function can email everyone when the next event is ready

## Files

- `site-config.js`
- `apps-script/notify-signup.gs`

## Setup

1. Create a Google Sheet for signups.
2. Open `Extensions -> Apps Script`.
3. Replace the default script with the contents of `apps-script/notify-signup.gs`.
4. In `Project Settings -> Script properties`, add:

   - `AIFB_SHEET_ID`: the spreadsheet ID

5. Deploy the script as a web app:

   - `Deploy -> New deployment`
   - Type: `Web app`
   - Execute as: `Me`
   - Who has access: `Anyone`

6. Copy the deployed `/exec` URL into `site-config.js` as `notifyEndpoint`.
7. Publish the updated website.

## Test

1. Open the landing page.
2. Enter a test email.
3. Submit the form.
4. Confirm a new row appears in the `notify_signups` sheet.

## Sending The Next Event Email

Add these script properties before running the mailout:

- `AIFB_EVENT_KEY`
- `AIFB_EVENT_SUBJECT`
- `AIFB_EVENT_TITLE`
- `AIFB_EVENT_DATE`
- `AIFB_EVENT_LOCATION`
- `AIFB_EVENT_URL`
- `AIFB_EVENT_DETAILS`

Recommended order:

1. Run `countActiveNotifySignups()` to see how many active recipients are currently stored.
2. Run `sendTestNextEventAnnouncement('your@email.com')` to preview the exact email in your inbox.
3. If the test looks correct, run `sendNextEventAnnouncement()` from the Apps Script editor.

The script sends the email once per `AIFB_EVENT_KEY` and records:

- `last_notified_event_key`
- `last_notified_at`

Example values:

- `AIFB_EVENT_KEY`: `2026-04-meetup`
- `AIFB_EVENT_SUBJECT`: `AI Filmmakers Berlin: next meetup is live`
- `AIFB_EVENT_TITLE`: `AI Filmmakers Berlin Meetup`
- `AIFB_EVENT_DATE`: `April 18, 2026, 7:00 PM`
- `AIFB_EVENT_LOCATION`: `Berlin`
- `AIFB_EVENT_URL`: `https://your-event-page.example`
- `AIFB_EVENT_DETAILS`: `Screenings, conversation, and networking around AI-native filmmaking.`

## Notes

- Until `notifyEndpoint` is set, the site falls back to the existing Google Form with the email pre-filled.
- The landing page expects the Apps Script response to send a `postMessage` back from the hidden iframe. That is already handled in `apps-script/notify-signup.gs`.
