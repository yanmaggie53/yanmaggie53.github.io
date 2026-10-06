/* sky-time.js
   Works out what time of day it is for the visitor (based on where the sun
   actually is for them) and sets <html data-mode="..."> before the page paints.

   Modes:  day → afternoon → sunset → night
   - day:       sunrise until 2pm
   - afternoon: 2pm until golden hour (the after-lunch slump)
   - sunset:    golden hour (sun 6° above the horizon) until dusk (6° below)
   - night:     dusk until sunrise

   Loaded in <head> on every page, so keep it small and dependency-free.
   Testing helpers: add ?mode=sunset or ?at=18:30 to any URL. */
(function () {
  'use strict';

  var MODES = ['day', 'afternoon', 'sunset', 'night'];
  var AFTERNOON_STARTS = 14;   // local hour the afternoon slump kicks in
  var GOLDEN_HOUR = 6;         // sun altitude (degrees) where sunset mode begins
  var DUSK = -6;               // civil dusk: sunset mode ends, night begins
  var SUNRISE = -0.833;        // standard sunrise/sunset altitude
  var KEY_MODE = 'maggie:mode';
  var KEY_MINUTE = 'maggie:minute';

  // Maggie's own sky, for the "in Boston it's…" line.
  var HOME = { name: 'Boston', lat: 42.36, lng: -71.06, tz: 'America/New_York' };

  // Rough coordinates for common time zones. We never ask for the visitor's
  // location; their time zone is close enough to get sunset within a few minutes.
  var ZONES = {
    'America/New_York': [40.71, -74.01], 'America/Detroit': [42.33, -83.05],
    'America/Toronto': [43.65, -79.38], 'America/Montreal': [45.5, -73.57],
    'America/Chicago': [41.88, -87.63], 'America/Indiana/Indianapolis': [39.77, -86.16],
    'America/Denver': [39.74, -104.99], 'America/Phoenix': [33.45, -112.07],
    'America/Boise': [43.62, -116.2], 'America/Los_Angeles': [34.05, -118.24],
    'America/Vancouver': [49.28, -123.12], 'America/Anchorage': [61.22, -149.9],
    'Pacific/Honolulu': [21.31, -157.86], 'America/Halifax': [44.65, -63.57],
    'America/St_Johns': [47.56, -52.71], 'America/Mexico_City': [19.43, -99.13],
    'America/Puerto_Rico': [18.47, -66.11], 'America/Bogota': [4.71, -74.07],
    'America/Lima': [-12.05, -77.04], 'America/Santiago': [-33.45, -70.67],
    'America/Sao_Paulo': [-23.55, -46.63], 'America/Argentina/Buenos_Aires': [-34.6, -58.38],
    'Europe/London': [51.51, -0.13], 'Europe/Dublin': [53.35, -6.26],
    'Europe/Lisbon': [38.72, -9.14], 'Europe/Madrid': [40.42, -3.7],
    'Europe/Paris': [48.86, 2.35], 'Europe/Brussels': [50.85, 4.35],
    'Europe/Amsterdam': [52.37, 4.9], 'Europe/Berlin': [52.52, 13.4],
    'Europe/Zurich': [47.38, 8.54], 'Europe/Rome': [41.9, 12.5],
    'Europe/Vienna': [48.21, 16.37], 'Europe/Prague': [50.08, 14.44],
    'Europe/Copenhagen': [55.68, 12.57], 'Europe/Stockholm': [59.33, 18.07],
    'Europe/Oslo': [59.91, 10.75], 'Europe/Helsinki': [60.17, 24.94],
    'Europe/Warsaw': [52.23, 21.01], 'Europe/Athens': [37.98, 23.73],
    'Europe/Istanbul': [41.01, 28.98], 'Europe/Kiev': [50.45, 30.52],
    'Europe/Kyiv': [50.45, 30.52], 'Europe/Moscow': [55.76, 37.62],
    'Africa/Cairo': [30.04, 31.24], 'Africa/Lagos': [6.52, 3.38],
    'Africa/Nairobi': [-1.29, 36.82], 'Africa/Johannesburg': [-26.2, 28.05],
    'Africa/Casablanca': [33.57, -7.59], 'Asia/Jerusalem': [31.77, 35.21],
    'Asia/Dubai': [25.2, 55.27], 'Asia/Riyadh': [24.71, 46.68],
    'Asia/Tehran': [35.69, 51.39], 'Asia/Karachi': [24.86, 67.01],
    'Asia/Kolkata': [21.0, 78.0], 'Asia/Calcutta': [21.0, 78.0],
    'Asia/Dhaka': [23.81, 90.41], 'Asia/Bangkok': [13.76, 100.5],
    'Asia/Ho_Chi_Minh': [10.82, 106.63], 'Asia/Jakarta': [-6.21, 106.85],
    'Asia/Singapore': [1.35, 103.82], 'Asia/Kuala_Lumpur': [3.14, 101.69],
    'Asia/Manila': [14.6, 120.98], 'Asia/Hong_Kong': [22.32, 114.17],
    'Asia/Shanghai': [31.23, 121.47], 'Asia/Taipei': [25.03, 121.57],
    'Asia/Seoul': [37.57, 126.98], 'Asia/Tokyo': [35.68, 139.69],
    'Australia/Perth': [-31.95, 115.86], 'Australia/Adelaide': [-34.93, 138.6],
    'Australia/Brisbane': [-27.47, 153.03], 'Australia/Sydney': [-33.87, 151.21],
    'Australia/Melbourne': [-37.81, 144.96], 'Pacific/Auckland': [-36.85, 174.76]
  };

  /* ---------- sun math (after SunCalc by Vladimir Agafonkin, BSD-2) ---------- */

  var rad = Math.PI / 180;
  var dayMs = 864e5;
  var J1970 = 2440588;
  var J2000 = 2451545;
  var J0 = 0.0009;
  var obliquity = rad * 23.4397;

  function toDays(date) { return date.valueOf() / dayMs - 0.5 + J1970 - J2000; }
  function fromJulian(j) { return new Date((j + 0.5 - J1970) * dayMs); }
  function meanAnomaly(d) { return rad * (357.5291 + 0.98560028 * d); }
  function eclipticLongitude(M) {
    var C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    return M + C + rad * 102.9372 + Math.PI;
  }
  function declination(L) { return Math.asin(Math.sin(obliquity) * Math.sin(L)); }
  function rightAscension(L) { return Math.atan2(Math.sin(L) * Math.cos(obliquity), Math.cos(L)); }

  // Sun altitude above the horizon, in degrees.
  function sunAltitude(date, lat, lng) {
    var lw = rad * -lng;
    var phi = rad * lat;
    var d = toDays(date);
    var L = eclipticLongitude(meanAnomaly(d));
    var dec = declination(L);
    var H = rad * (280.16 + 360.9856235 * d) - lw - rightAscension(L);
    return Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)) / rad;
  }

  // Sunrise, golden hour, sunset and dusk for the day containing `date`.
  // Any of them can be null near the poles, when the sun never crosses that angle.
  function solarTimes(date, lat, lng) {
    var lw = rad * -lng;
    var phi = rad * lat;
    var d = toDays(date);
    var n = Math.round(d - J0 - lw / (2 * Math.PI));
    var ds = J0 + lw / (2 * Math.PI) + n;
    var M = meanAnomaly(ds);
    var L = eclipticLongitude(M);
    var dec = declination(L);
    var Jnoon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);

    function evening(h) {
      var w = Math.acos((Math.sin(h * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
      if (isNaN(w)) return null;
      var a = J0 + (w + lw) / (2 * Math.PI) + n;
      return J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
    }
    function morningOf(j) { return j === null ? null : fromJulian(Jnoon - (j - Jnoon)); }
    function at(j) { return j === null ? null : fromJulian(j); }

    var set = evening(SUNRISE);
    return {
      noon: fromJulian(Jnoon),
      sunrise: morningOf(set),
      goldenHour: at(evening(GOLDEN_HOUR)),
      sunset: at(set),
      dusk: at(evening(DUSK))
    };
  }

  // 0 = new moon, 0.5 = full moon.
  function moonPhase(date) {
    var synodic = 29.530588853;
    var knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
    var p = (((date - knownNewMoon) / dayMs) % synodic) / synodic;
    return p < 0 ? p + 1 : p;
  }

  /* ---------- places & clocks ---------- */

  function visitorPlace() {
    var zone = null;
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (err) { /* old browser */ }
    var c = zone && ZONES[zone];
    if (c) return { lat: c[0], lng: c[1], tz: null, zone: zone };
    // Unknown zone: estimate longitude from the standard-time UTC offset.
    var year = new Date().getFullYear();
    var std = Math.max(new Date(year, 0, 1).getTimezoneOffset(), new Date(year, 6, 1).getTimezoneOffset());
    return { lat: 40, lng: -std / 4, tz: null, zone: zone || 'UTC' };
  }

  // Hours since local midnight (e.g. 14.5 = 2:30pm), in the visitor's zone or a named one.
  function localHour(date, tz) {
    if (!tz) return date.getHours() + date.getMinutes() / 60;
    var h = 0;
    var m = 0;
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(date)
      .forEach(function (p) {
        if (p.type === 'hour') h = +p.value;
        if (p.type === 'minute') m = +p.value;
      });
    return h + m / 60;
  }

  function formatTime(date, tz) {
    if (!date) return '';
    var opts = { hour: 'numeric', minute: '2-digit' };
    if (tz) opts.timeZone = tz;
    return date.toLocaleTimeString('en-US', opts).toLowerCase().replace(/\s/g, ' ');
  }

  function modeAt(date, place) {
    var alt = sunAltitude(date, place.lat, place.lng);
    if (alt >= GOLDEN_HOUR) return localHour(date, place.tz) >= AFTERNOON_STARTS ? 'afternoon' : 'day';
    var descending = sunAltitude(new Date(date.getTime() + 6e5), place.lat, place.lng) < alt;
    if (descending) return alt >= DUSK ? 'sunset' : 'night';
    return alt >= SUNRISE ? 'day' : 'night';
  }

  // The visitor's whole day split into mode segments, for the day bar.
  // Returns [{ mode, start, end }] with start/end in minutes since local midnight.
  function dayPlan(date, place) {
    var midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var segments = [];
    for (var minute = 0; minute < 1440; minute += 5) {
      var mode = modeAt(new Date(midnight.getTime() + minute * 6e4), place);
      var last = segments[segments.length - 1];
      if (last && last.mode === mode) last.end = minute + 5;
      else segments.push({ mode: mode, start: minute, end: minute + 5 });
    }
    return segments;
  }

  // A representative minute for a mode (middle of its longest stretch today),
  // so picking "sunset" by hand puts the sun somewhere sensible.
  function minuteFor(mode, plan) {
    var best = null;
    plan.forEach(function (s) {
      if (s.mode !== mode) return;
      // Prefer the evening stretch of night over the pre-dawn one.
      var weight = (s.end - s.start) + (mode === 'night' && s.start > 720 ? 600 : 0);
      if (!best || weight > best.weight) best = { weight: weight, s: s };
    });
    if (!best) return { day: 600, afternoon: 900, sunset: 1110, night: 1350 }[mode];
    if (mode === 'night' && best.s.start > 720) return Math.min(best.s.start + 150, 1430);
    return Math.round((best.s.start + best.s.end) / 2);
  }

  /* ---------- the visitor's choice ---------- */

  function readStore(key) {
    try { return sessionStorage.getItem(key); } catch (err) { return null; }
  }
  function writeStore(key, value) {
    try {
      if (value === null || value === undefined) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, String(value));
    } catch (err) { /* storage blocked: the choice just won't follow them between pages */ }
  }

  var params = new URLSearchParams(location.search);
  var offset = 0;
  var at = /^(\d{1,2}):(\d{2})$/.exec(params.get('at') || '');
  if (at) {
    var target = new Date();
    target.setHours(+at[1], +at[2], 0, 0);
    offset = target - Date.now();
  }
  function now() { return new Date(Date.now() + offset); }

  var place = visitorPlace();
  var forced = MODES.indexOf(params.get('mode')) > -1 ? params.get('mode') : null;

  var SkyTime = {
    MODES: MODES,
    HOME: HOME,
    place: place,
    now: now,
    sunAltitude: sunAltitude,
    solarTimes: solarTimes,
    moonPhase: moonPhase,
    modeAt: modeAt,
    dayPlan: dayPlan,
    minuteFor: minuteFor,
    localHour: localHour,
    formatTime: formatTime,

    // The mode the visitor picked by hand (or null when following the sun).
    override: function () {
      if (forced) return forced;
      var m = readStore(KEY_MODE);
      return MODES.indexOf(m) > -1 ? m : null;
    },
    // A hand-scrubbed minute of the day, if they dragged the day bar.
    overrideMinute: function () {
      var v = parseInt(readStore(KEY_MINUTE), 10);
      return isNaN(v) ? null : v;
    },
    choose: function (mode, minute) {
      forced = null;
      writeStore(KEY_MODE, mode);
      writeStore(KEY_MINUTE, minute === undefined ? null : minute);
    },
    followSun: function () {
      forced = null;
      writeStore(KEY_MODE, null);
      writeStore(KEY_MINUTE, null);
    },
    current: function () {
      return SkyTime.override() || modeAt(now(), place);
    },
    apply: function (mode) {
      var root = document.documentElement;
      root.setAttribute('data-mode', mode);
      root.setAttribute('data-auto', SkyTime.override() ? 'false' : 'true');
    }
  };

  window.SkyTime = SkyTime;
  SkyTime.apply(SkyTime.current());
})();
