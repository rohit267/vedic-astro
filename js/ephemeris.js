/* ephemeris.js: sidereal planetary positions on top of astronomy-engine.
 * Raw positions come from astronomy-engine; the astrology-specific steps
 * (Lahiri ayanamsa, nutation removal, ascendant, midheaven, mean node) are ours
 * and are checked against Swiss Ephemeris in test/accuracy.js.
 * Works in the browser (global `Astronomy`) and in Node (global.Astronomy). */
(function (root) {
  const VA = (root.VA = root.VA || {});
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const norm360 = (x) => ((x % 360) + 360) % 360;
  /* ΔT (TT−UT), seconds. The library's Espenak–Meeus polynomial drifts ~5 s high
   * after 2005, so from 2005 on we use the observed IERS values (1 Jan of each year). */
  const DT_OBS = [64.69, 64.85, 65.15, 65.46, 65.78, 66.07, 66.32, 66.60, 66.91, 67.28, 67.64,
    68.10, 68.59, 68.97, 69.22, 69.36, 69.36, 69.29, 69.18, 69.10, 69.00, 68.90]; // 2005..2026
  let dtSet = false;
  function AE() {
    const A = (typeof window !== 'undefined' ? window : root).Astronomy;
    if (!A) throw new Error('astronomy-engine not loaded');
    if (!dtSet) {
      dtSet = true;
      A.SetDeltaTFunction((ut) => {
        const y = 2000 + (ut + 0.5) / 365.25 - 2005;      // years since 1 Jan 2005
        if (y < 0) return A.DeltaT_EspenakMeeus(ut);
        // ponytail: held flat after the last observed year; append one value per year
        const i = Math.min(Math.floor(y), DT_OBS.length - 1), j = Math.min(i + 1, DT_OBS.length - 1);
        return DT_OBS[i] + (DT_OBS[j] - DT_OBS[i]) * Math.min(y - i, 1);
      });
    }
    return A;
  }

  // Julian Day (UT) from an astronomy-engine time (ut = days since J2000 noon UT)
  const jdOf = (t) => 2451545.0 + t.ut;

  /* Lahiri (Chitrapaksha) mean ayanamsa in degrees: its J2000 value plus the
   * IAU 2006 general precession in longitude. Agrees with Swiss Ephemeris'
   * SIDM_LAHIRI to 0.001" over 1900–2100 (the old polynomial drifted up to 7"). */
  function ayanamsa(t) {
    const T = t.tt / 36525.0;
    return 23.8570923 + (5028.796195 * T + 1.1054348 * T * T + 0.00007964 * T ** 3 - 0.000023857 * T ** 4) / 3600;
  }
  VA.ayanamsa = ayanamsa;

  /* Tropical-of-date longitude → sidereal. Library longitudes are measured from the
   * TRUE equinox, which wobbles ±17" with nutation; the stars do not, so nutation in
   * longitude comes off before the mean ayanamsa is subtracted. */
  const toSidereal = (trop, t) => norm360(trop - AE().e_tilt(t).dpsi / 3600 - ayanamsa(t));

  // Make an astronomy-engine time from local civil time + timezone offset (hours)
  function makeTime(y, mo, d, hh, mm, tzHours, ss = 0) {
    const ms = Date.UTC(y, mo - 1, d, hh, mm, ss) - tzHours * 3600 * 1000;
    return AE().MakeTime(new Date(ms));
  }
  VA.makeTime = makeTime;
  VA.timeOf = (date) => AE().MakeTime(date);

  /* UTC offset (hours) a named zone used at a local wall-clock time, from the browser's
   * own tz database, e.g. Asia/Kolkata was +6:30 (war time) from 1942 to 1945. */
  function zoneOffsetHours(zone, y, mo, d, hh, mm) {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric',
      month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    const off = (ms) => {
      const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, +x.value]));
      return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - ms) / 3600000;
    };
    const wall = Date.UTC(y, mo - 1, d, hh, mm);
    return off(wall - off(wall) * 3600000);
  }
  VA.zoneOffsetHours = zoneOffsetHours;

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
  function siderealLon(body, t) { return toSidereal(tropLonOfDate(body, t), t); }
  VA.siderealLon = siderealLon;

  // Rahu / Ketu: mean lunar node (both sidereal, degrees). Rahu is always retrograde.
  function rahuKetu(t) {
    const T = t.tt / 36525.0; // Julian centuries TT from J2000
    const om = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000;
    const rahu = norm360(om - ayanamsa(t)); // mean node is already free of nutation
    return { rahu, ketu: norm360(rahu + 180) };
  }
  VA.rahuKetu = rahuKetu;

  // Right ascension of the meridian (radians) from Greenwich apparent sidereal time
  const ramcOf = (t, lonDeg) => (AE().SiderealTime(t) + lonDeg / 15) * 15 * D2R;

  /* Sidereal ascendant (Lagna) in degrees. */
  function ascendant(t, latDeg, lonDeg) {
    const ramc = ramcOf(t, lonDeg), eps = obliquity(t) * D2R, phi = latDeg * D2R;
    const asc = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)));
    return toSidereal(asc * R2D, t);
  }
  VA.ascendant = ascendant;

  // Sidereal midheaven (10th cusp, where the ecliptic crosses the meridian) in degrees
  function midheaven(t, lonDeg) {
    const ramc = ramcOf(t, lonDeg), eps = obliquity(t) * D2R;
    return toSidereal(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) * R2D, t);
  }
  VA.midheaven = midheaven;

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
