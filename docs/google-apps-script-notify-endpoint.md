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

Then run `sendNextEventAnnouncement()` from the Apps Script editor.

The script sends the email once per `AIFB_EVENT_KEY` and records:

- `last_notified_event_key`
- `last_notified_at`

## Notes

- Until `notifyEndpoint` is set, the site falls back to the existing Google Form with the email pre-filled.
- The landing page expects the Apps Script response to send a `postMessage` back from the hidden iframe. That is already handled in `apps-script/notify-signup.gs`.
