import { customAlphabet } from "nanoid";

export const ACCENT_COLORS = [
  { name: "sage", bg: "#D4E6D0", text: "#2D4A29" },
  { name: "rose", bg: "#EDD5D5", text: "#4A2929" },
  { name: "slate", bg: "#D0D9E6", text: "#293A4A" },
  { name: "amber", bg: "#EDE4CC", text: "#4A3A1A" },
  { name: "lavender", bg: "#DDD5ED", text: "#352A4A" },
  { name: "fog", bg: "#D5DDE6", text: "#2A3440" },
];

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 8);

const toRadians = (value) => (value * Math.PI) / 180;
const toDegrees = (value) => (value * 180) / Math.PI;
const normalizeDegrees = (value) => {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const normalizeHours = (value) => {
  const normalized = value % 24;
  return normalized < 0 ? normalized + 24 : normalized;
};

export const generateId = () => nanoid();

export const formatDate = (dateString) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
};

export const assignAccentColor = () => {
  const index = Math.floor(Math.random() * ACCENT_COLORS.length);
  return ACCENT_COLORS[index];
};

export const getSunTimes = (date, latitude, longitude) => {
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude)
  ) {
    return { sunrise: null, sunset: null };
  }

  const zenith = 90.833;
  const utcBase = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const startOfYear = new Date(Date.UTC(date.getFullYear(), 0, 0));
  const dayOfYear = Math.floor((utcBase - startOfYear) / 86400000);
  const lngHour = longitude / 15;

  const calculateTime = (isSunrise) => {
    const approximateTime = dayOfYear + ((isSunrise ? 6 : 18) - lngHour) / 24;
    const meanAnomaly = 0.9856 * approximateTime - 3.289;
    const trueLongitude = normalizeDegrees(
      meanAnomaly +
        1.916 * Math.sin(toRadians(meanAnomaly)) +
        0.02 * Math.sin(toRadians(2 * meanAnomaly)) +
        282.634
    );

    let rightAscension = normalizeDegrees(
      toDegrees(Math.atan(0.91764 * Math.tan(toRadians(trueLongitude))))
    );

    const longitudeQuadrant = Math.floor(trueLongitude / 90) * 90;
    const rightAscensionQuadrant = Math.floor(rightAscension / 90) * 90;
    rightAscension = (rightAscension + longitudeQuadrant - rightAscensionQuadrant) / 15;

    const sinDeclination = 0.39782 * Math.sin(toRadians(trueLongitude));
    const cosDeclination = Math.cos(Math.asin(sinDeclination));
    const cosLocalHourAngle =
      (Math.cos(toRadians(zenith)) -
        sinDeclination * Math.sin(toRadians(latitude))) /
      (cosDeclination * Math.cos(toRadians(latitude)));

    if (cosLocalHourAngle > 1 || cosLocalHourAngle < -1) {
      return null;
    }

    const localHourAngle = isSunrise
      ? 360 - toDegrees(Math.acos(cosLocalHourAngle))
      : toDegrees(Math.acos(cosLocalHourAngle));

    const localMeanTime =
      localHourAngle / 15 + rightAscension - 0.06571 * approximateTime - 6.622;
    const utcHour = normalizeHours(localMeanTime - lngHour);
    const hours = Math.floor(utcHour);
    const minutes = Math.floor((utcHour - hours) * 60);
    const seconds = Math.round((((utcHour - hours) * 60) - minutes) * 60);
    const result = new Date(utcBase);

    result.setUTCHours(hours, minutes, seconds, 0);
    return result;
  };

  return {
    sunrise: calculateTime(true),
    sunset: calculateTime(false),
  };
};

export const resolveAppearance = ({
  mode,
  systemPrefersDark,
  latitude,
  longitude,
  date = new Date(),
}) => {
  if (mode === "light" || mode === "dark") {
    return mode;
  }

  const { sunrise, sunset } = getSunTimes(date, latitude, longitude);

  if (sunrise && sunset) {
    return date >= sunrise && date < sunset ? "light" : "dark";
  }

  return systemPrefersDark ? "dark" : "light";
};

export default {
  ACCENT_COLORS,
  generateId,
  formatDate,
  assignAccentColor,
  getSunTimes,
  resolveAppearance,
};
