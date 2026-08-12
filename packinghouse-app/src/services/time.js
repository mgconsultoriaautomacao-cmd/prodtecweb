function nowMs() {
  return Date.now();
}

function hourStartMs(ts) {
  const d = new Date(ts);
  d.setMinutes(0, 0, 0, 0);
  return d.getTime();
}

function dayStartMs(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const pad = (n) => String(n).padStart(2, '0');

function isoDateToday() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfDayMs(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

function endOfDayMs(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

module.exports = { 
  nowMs, 
  hourStartMs, 
  dayStartMs, 
  isoDateToday, 
  startOfDayMs, 
  endOfDayMs 
};
