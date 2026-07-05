/* ephemeris.js — sidereal planetary positions on top of astronomy-engine.
 * Raw positions come from astronomy-engine (arc-second accurate); every
 * astrology-specific step (Lahiri ayanamsa, ascendant, mean node) is our own
 * verified math, matching what was cross-checked against real charts.
 * Works in the browser (global `Astronomy`) and in Node (global.Astronomy). */
(function (root) {
  const VA = (root.VA = root.VA || {});
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const norm360 = (x) => ((x % 360) + 360) % 360;
  function AE() {
    const A = (typeof window !== 'undefined' ? window : root).Astronomy;
    if (!A) throw new Error('astronomy-engine not loaded');
    return A;
  }

  // Julian Day (UT) from an astronomy-engine time (ut = days since J2000 noon UT)
  const jdOf = (t) => 2451545.0 + t.ut;

  /* Lahiri (Chitrapaksha) ayanamsa in degrees.
   * Polynomial in centuries from 1900.0; validated against known values:
   * 1998→23.83, 2000(J2000)→23.85, 2004→23.91 — matches DrikPanchang's Lahiri. */
  function ayanamsa(t) {
    const T = (jdOf(t) - 2415020.0) / 36525.0;
    return 22.460148 + 1.396042 * T + 0.0000308 * T * T;
  }
  VA.ayanamsa = ayanamsa;

  // Make an astronomy-engine time from local civil time + timezone offset (hours)
  function makeTime(y, mo, d, hh, mm, tzHours) {
    const ms = Date.UTC(y, mo - 1, d, hh, mm, 0) - tzHours * 3600 * 1000;
    return AE().MakeTime(new Date(ms));
  }
  VA.makeTime = makeTime;

  // True obliquity of date (degrees)
  function obliquity(t) { return AE().e_tilt(t).tobl; }

  /* Tropical ecliptic longitude OF DATE (degrees) for a body.
   * Moon/Sun have of-date helpers; planets: EQJ vector → equator of date → ecliptic of date. */
  function tropLonOfDate(body, t) {
    const A = AE();
    if (body === 'Moon') return norm360(A.EclipticGeoMoon(t).lon);
    if (body === 'Sun') return norm360(A.SunPosition(t).elon);
    const eqj = A.GeoVector(A.Body[body], t, true);
    const eqd = A.RotateVector(A.Rotation_EQJ_EQD(t), eqj);
    const eps = obliquity(t) * D2R;
    const xe = eqd.x;
    const ye = eqd.y * Math.cos(eps) + eqd.z * Math.sin(eps);
    return norm360(Math.atan2(ye, xe) * R2D);
  }

  // Sidereal longitude (degrees) of a body
  function siderealLon(body, t) { return norm360(tropLonOfDate(body, t) - ayanamsa(t)); }
  VA.siderealLon = siderealLon;

  // Rahu / Ketu — mean lunar node (both sidereal, degrees). Rahu is always retrograde.
  function rahuKetu(t) {
    const T = t.tt / 36525.0; // Julian centuries TT from J2000
    const om = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000;
    const rahu = norm360(om - ayanamsa(t));
    return { rahu, ketu: norm360(rahu + 180) };
  }
  VA.rahuKetu = rahuKetu;

  /* Sidereal ascendant (Lagna) in degrees. */
  function ascendant(t, latDeg, lonDeg) {
    const A = AE();
    const gast = A.SiderealTime(t);            // Greenwich apparent sidereal time, hours
    const lst = gast + lonDeg / 15;            // local sidereal time, hours
    const ramc = lst * 15 * D2R;               // right ascension of MC, radians
    const eps = obliquity(t) * D2R;
    const phi = latDeg * D2R;
    let asc = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)));
    asc = norm360(asc * R2D);
    return norm360(asc - ayanamsa(t));
  }
  VA.ascendant = ascendant;

  // Retrograde test: compare sidereal longitude a short time before/after.
  function isRetro(body, t) {
    if (body === 'Sun' || body === 'Moon') return false;
    const A = AE();
    const before = A.MakeTime(t.ut - 0.5);
    const after = A.MakeTime(t.ut + 0.5);
    let d = siderealLon(body, after) - siderealLon(body, before);
    if (d > 180) d -= 360; if (d < -180) d += 360;
    return d < 0;
  }
  VA.isRetro = isRetro;

  root.VA = VA;
})(typeof globalThis !== 'undefined' ? globalThis : this);
