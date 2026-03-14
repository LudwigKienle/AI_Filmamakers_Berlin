const AIFB_SIGNUPS_SHEET = 'notify_signups';

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'aifb-notify-signup' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = getPayload_(e);
    const email = normalizeEmail_(payload.email);

    if (!isValidEmail_(email)) {
      return buildIframeResponse_({
        ok: false,
        message: 'Please enter a valid email address.'
      });
    }

    const spreadsheet = getSpreadsheet_();
    const sheet = getOrCreateSignupsSheet_(spreadsheet);
    const result = upsertSignup_(sheet, {
      email: email,
      source: payload.source || 'landing-page',
      pageUrl: payload.pageUrl || '',
      userAgent: payload.userAgent || '',
      submittedAt: new Date()
    });

    return buildIframeResponse_({
      ok: true,
      message: result.created
        ? "You're on the list. We'll email you when the next event is confirmed."
        : "You're already on the list. We'll email you when the next event is confirmed."
    });
  } catch (error) {
    console.error(error);
    return buildIframeResponse_({
      ok: false,
      message: 'We could not save your email right now. Please try again.'
    });
  }
}

function sendNextEventAnnouncement() {
  const event = getEventConfig_();
  const spreadsheet = getSpreadsheet_();
  const sheet = getOrCreateSignupsSheet_(spreadsheet);
  const rows = sheet.getDataRange().getValues();

  if (rows.length < 2) {
    console.log('No signups found.');
    return;
  }

  const headers = rows[0];
  const emailIndex = headers.indexOf('email');
  const statusIndex = headers.indexOf('status');
  const lastKeyIndex = headers.indexOf('last_notified_event_key');
  const lastTimeIndex = headers.indexOf('last_notified_at');

  let sent = 0;

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const email = String(row[emailIndex] || '').trim();
    const status = String(row[statusIndex] || 'active').trim().toLowerCase();
    const lastEventKey = String(row[lastKeyIndex] || '').trim();

    if (!email || status !== 'active' || lastEventKey === event.key) {
      continue;
    }

    MailApp.sendEmail({
      to: email,
      subject: event.subject,
      htmlBody: buildEventEmailHtml_(event),
      body: buildEventEmailText_(event),
      name: 'AI Filmmakers Berlin'
    });

    sheet.getRange(rowIndex + 1, lastKeyIndex + 1).setValue(event.key);
    sheet.getRange(rowIndex + 1, lastTimeIndex + 1).setValue(new Date());
    sent += 1;
  }

  console.log(`Sent ${sent} event announcement emails.`);
}

function getPayload_(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (error) {
      // Fall through to parameter parsing for form-urlencoded posts.
    }
  }

  return (e && e.parameter) || {};
}

function normalizeEmail_(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getSpreadsheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('AIFB_SHEET_ID');

  if (spreadsheetId) {
    return SpreadsheetApp.openById(spreadsheetId);
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();

  if (active) {
    return active;
  }

  throw new Error('Set the AIFB_SHEET_ID script property or bind this script to a spreadsheet.');
}

function getOrCreateSignupsSheet_(spreadsheet) {
  const headers = [
    'email',
    'status',
    'source',
    'page_url',
    'user_agent',
    'created_at',
    'updated_at',
    'last_notified_event_key',
    'last_notified_at'
  ];

  let sheet = spreadsheet.getSheetByName(AIFB_SIGNUPS_SHEET);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(AIFB_SIGNUPS_SHEET);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  return sheet;
}

function upsertSignup_(sheet, signup) {
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const emailIndex = headers.indexOf('email');
  const statusIndex = headers.indexOf('status');
  const sourceIndex = headers.indexOf('source');
  const pageUrlIndex = headers.indexOf('page_url');
  const userAgentIndex = headers.indexOf('user_agent');
  const createdAtIndex = headers.indexOf('created_at');
  const updatedAtIndex = headers.indexOf('updated_at');

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const currentEmail = normalizeEmail_(rows[rowIndex][emailIndex]);

    if (currentEmail !== signup.email) {
      continue;
    }

    sheet.getRange(rowIndex + 1, statusIndex + 1).setValue('active');
    sheet.getRange(rowIndex + 1, sourceIndex + 1).setValue(signup.source);
    sheet.getRange(rowIndex + 1, pageUrlIndex + 1).setValue(signup.pageUrl);
    sheet.getRange(rowIndex + 1, userAgentIndex + 1).setValue(signup.userAgent);
    sheet.getRange(rowIndex + 1, updatedAtIndex + 1).setValue(signup.submittedAt);

    return { created: false };
  }

  const row = new Array(headers.length).fill('');
  row[emailIndex] = signup.email;
  row[statusIndex] = 'active';
  row[sourceIndex] = signup.source;
  row[pageUrlIndex] = signup.pageUrl;
  row[userAgentIndex] = signup.userAgent;
  row[createdAtIndex] = signup.submittedAt;
  row[updatedAtIndex] = signup.submittedAt;
  sheet.appendRow(row);

  return { created: true };
}

function getEventConfig_() {
  const props = PropertiesService.getScriptProperties();
  const event = {
    key: String(props.getProperty('AIFB_EVENT_KEY') || '').trim(),
    subject: String(props.getProperty('AIFB_EVENT_SUBJECT') || '').trim(),
    title: String(props.getProperty('AIFB_EVENT_TITLE') || '').trim(),
    date: String(props.getProperty('AIFB_EVENT_DATE') || '').trim(),
    location: String(props.getProperty('AIFB_EVENT_LOCATION') || '').trim(),
    url: String(props.getProperty('AIFB_EVENT_URL') || '').trim(),
    details: String(props.getProperty('AIFB_EVENT_DETAILS') || '').trim()
  };

  if (!event.key || !event.subject || !event.title || !event.url) {
    throw new Error('Set AIFB_EVENT_KEY, AIFB_EVENT_SUBJECT, AIFB_EVENT_TITLE, and AIFB_EVENT_URL before sending.');
  }

  return event;
}

function buildEventEmailHtml_(event) {
  const details = event.details ? `<p>${escapeHtml_(event.details)}</p>` : '';
  const date = event.date ? `<p><strong>Date:</strong> ${escapeHtml_(event.date)}</p>` : '';
  const location = event.location ? `<p><strong>Location:</strong> ${escapeHtml_(event.location)}</p>` : '';

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111111;">
      <p>Hello,</p>
      <p>the next AI Filmmakers Berlin event is confirmed.</p>
      <h2 style="margin-bottom:8px;">${escapeHtml_(event.title)}</h2>
      ${date}
      ${location}
      ${details}
      <p><a href="${escapeHtml_(event.url)}" style="color:#0057ff;">See the event details</a></p>
      <p>AI Filmmakers Berlin</p>
    </div>
  `;
}

function buildEventEmailText_(event) {
  const parts = [
    'Hello,',
    '',
    'the next AI Filmmakers Berlin event is confirmed.',
    '',
    event.title
  ];

  if (event.date) {
    parts.push(`Date: ${event.date}`);
  }

  if (event.location) {
    parts.push(`Location: ${event.location}`);
  }

  if (event.details) {
    parts.push('', event.details);
  }

  parts.push('', event.url, '', 'AI Filmmakers Berlin');
  return parts.join('\n');
}

function buildIframeResponse_(payload) {
  const serialized = JSON.stringify({
    type: 'aifb-notify-result',
    ok: Boolean(payload.ok),
    message: String(payload.message || '')
  });

  const output = HtmlService.createHtmlOutput(`<!DOCTYPE html>
<html>
  <body>
    <script>
      window.parent.postMessage(${serialized}, '*');
    </script>
  </body>
</html>`);

  output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return output;
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
