/**
 * Bauder Home feed: Google Calendar + Airbnb calendars for the Bauder Home iPad app.
 *
 * Runs in your own Google account (script.google.com), so it can read your
 * calendars and fetch your Airbnb calendar links. The iPad can't fetch those
 * links directly because Airbnb and Google block other websites from reading them.
 *
 * Your private links live in Script Properties (Project Settings → Script
 * Properties), never in this file or the public GitHub repo:
 *
 *   KEY        Required. Any long random text. The app's feed address ends with ?key=<KEY>
 *   LISTINGS   Required for Airbnb. JSON list, one entry per listing:
 *              [{"name":"Wall St","ical":"https://www.airbnb.com/calendar/ical/123.ics?s=abc","checkin":"16:00","checkout":"11:00"}]
 *   CALENDARS  Optional. Comma-separated Google calendar names to include.
 *              Leave it out to include every calendar that's checked in Google Calendar.
 *   DAYS       Optional. How many days ahead to send (default 30).
 *   EV         Optional. JSON list for the EV Projects widget:
 *              [{"site":"Site A","status":"Permit approved"}]
 *
 * Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 * After changing this code, use Deploy → Manage deployments → Edit → Version: New version.
 */

var CACHE_SECONDS = 300;

function doGet(e) {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('KEY');
  var params = (e && e.parameter) || {};
  if (!key) return json_({ error: 'Set a KEY in Script Properties first.' });
  if (params.key !== key) return json_({ error: 'Wrong or missing key.' });

  var cache = CacheService.getScriptCache();
  if (params.fresh !== '1') {
    var hit = cache.get('feed');
    if (hit) return text_(hit);
  }
  var body = JSON.stringify(buildFeed_(props));
  try { cache.put('feed', body, CACHE_SECONDS); } catch (err) { /* larger than 100 KB: skip the cache */ }
  return text_(body);
}

function buildFeed_(props) {
  var days = Number(props.getProperty('DAYS')) || 30;
  var tz = Session.getScriptTimeZone();
  var out = { version: 1, updated: new Date().toISOString(), timeZone: tz, calendars: [], events: [], listings: [], errors: [] };

  // Google Calendar
  try {
    var wanted = String(props.getProperty('CALENDARS') || '')
      .split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(String);
    var start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 1);
    var end = new Date(start.getTime() + (days + 2) * 86400000);
    CalendarApp.getAllCalendars().forEach(function (cal) {
      var name = cal.getName();
      if (wanted.length) { if (wanted.indexOf(name.toLowerCase()) < 0) return; }
      else if (cal.isHidden() || !cal.isSelected()) return;
      var ctz = cal.getTimeZone() || tz;
      out.calendars.push({ name: name, color: cal.getColor() });
      cal.getEvents(start, end).forEach(function (ev) {
        var allDay = ev.isAllDayEvent();
        // For all-day events, start and end are midnight in the calendar's time zone,
        // and the end is the day after the event ends.
        out.events.push({
          cal: name,
          title: ev.getTitle() || 'Busy',
          allDay: allDay,
          start: allDay ? Utilities.formatDate(ev.getStartTime(), ctz, 'yyyy-MM-dd') : ev.getStartTime().toISOString(),
          end: allDay ? Utilities.formatDate(ev.getEndTime(), ctz, 'yyyy-MM-dd') : ev.getEndTime().toISOString(),
          location: ev.getLocation() || ''
        });
      });
    });
  } catch (err) {
    out.errors.push('Google Calendar: ' + err.message);
  }

  // EV projects, typed into Script Properties as JSON
  var evRaw = props.getProperty('EV');
  if (evRaw) {
    try { out.ev = JSON.parse(evRaw); }
    catch (err) { out.errors.push('EV is not valid JSON. Check the quotes and brackets.'); }
  }

  // Airbnb (or any booking site's iCal export)
  var listings = [];
  try { listings = JSON.parse(props.getProperty('LISTINGS') || '[]'); }
  catch (err) { out.errors.push('LISTINGS is not valid JSON. Check the quotes and brackets.'); }
  var cache = CacheService.getScriptCache();
  listings.forEach(function (l, i) {
    var item = { name: l.name || ('Listing ' + (i + 1)), checkin: l.checkin || '16:00', checkout: l.checkout || '11:00', stays: [] };
    try {
      if (!l.ical) throw new Error('No ical link set');
      var ck = 'ics' + i;
      var ics = cache.get(ck);
      if (!ics) {
        var res = UrlFetchApp.fetch(l.ical, { muteHttpExceptions: true, followRedirects: true });
        if (res.getResponseCode() !== 200) throw new Error('The calendar link answered ' + res.getResponseCode() + '. It may have been reset in Airbnb.');
        ics = res.getContentText();
        try { cache.put(ck, ics, 900); } catch (e2) { /* too big to cache */ }
      }
      item.stays = parseStays_(ics);
    } catch (err) {
      item.error = err.message;
      out.errors.push(item.name + ': ' + err.message);
    }
    out.listings.push(item);
  });

  return out;
}

/**
 * Turns an iCal file into stays: [{start:'2026-10-24', end:'2026-10-27', phone4:'1234'}].
 * Airbnb marks bookings "Reserved" and owner blocks "Airbnb (Not available)".
 * Anything that isn't clearly a block counts as a stay, so other wording still works.
 */
function parseStays_(ics) {
  var text = String(ics).replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  var blocks = text.split('BEGIN:VEVENT').slice(1);
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  var cutoffStr = Utilities.formatDate(cutoff, Session.getScriptTimeZone(), 'yyyyMMdd');
  var stays = [];
  blocks.forEach(function (b) {
    b = b.split('END:VEVENT')[0];
    var get = function (name) {
      var m = new RegExp('(?:^|\\n)' + name + '(?:;[^:\\n]*)?:([^\\r\\n]*)').exec(b);
      return m ? m[1].trim() : '';
    };
    var summary = get('SUMMARY');
    var desc = get('DESCRIPTION').replace(/\\n/g, '\n');
    var hasReservation = /reservation url|reservations\/details|reservation id/i.test(desc);
    if (!hasReservation && /not available|unavailable|blocked|closed/i.test(summary)) return;
    var s = get('DTSTART').replace(/[^0-9]/g, '').slice(0, 8);
    var e = get('DTEND').replace(/[^0-9]/g, '').slice(0, 8);
    if (s.length !== 8) return;
    if (e.length !== 8 || e <= s) {
      var d = new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8) + 1);
      e = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyyMMdd');
    }
    if (e < cutoffStr) return;
    var phone = /Last 4 Digits\)?\s*:\s*(\d{4})/i.exec(desc);
    stays.push({ start: dash_(s), end: dash_(e), phone4: phone ? phone[1] : '' });
  });
  stays.sort(function (a, b) { return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });
  return stays;
}

function dash_(s) { return s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8); }
function text_(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON); }
function json_(o) { return text_(JSON.stringify(o)); }

/** Run this once from the editor to check everything before deploying. */
function testFeed() {
  var out = buildFeed_(PropertiesService.getScriptProperties());
  Logger.log('Calendars: %s', out.calendars.map(function (c) { return c.name; }).join(', ') || 'none');
  Logger.log('Events in the next %s days: %s', PropertiesService.getScriptProperties().getProperty('DAYS') || 30, out.events.length);
  out.listings.forEach(function (l) { Logger.log('%s: %s stays%s', l.name, l.stays.length, l.error ? ' (error: ' + l.error + ')' : ''); });
  if (out.ev) Logger.log('EV projects: %s', out.ev.length);
  if (out.errors.length) Logger.log('Problems: %s', out.errors.join(' | '));
}
