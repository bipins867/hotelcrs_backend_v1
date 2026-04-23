exports.removeWhiteSpace = (str, prefix = '') => {
  return str.replace(/\s+/g, prefix);
}

exports.formatDate = (date) => {
  const d = new Date(date);
  return d.toISOString().split("T")[0];
};

exports.getDateRange = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const dates = [];

  if (isNaN(startDate) || isNaN(endDate)) return [];

  while (startDate <= endDate) {
    dates.push(this.formatDate(startDate));
    startDate.setDate(startDate.getDate() + 1);
  }

  return dates;
};

exports.toStringArray = (arr) => {
  return arr.map(v =>
    v === null || v === undefined ? '' : String(v)
  );
}

exports.chunkDateRange = (start, end, chunkDays) => {
  const chunks = [];
  let cursor = new Date(start);

  while (cursor <= new Date(end)) {
    const from = new Date(cursor);
    const to = new Date(cursor);
    to.setDate(to.getDate() + chunkDays - 1);

    chunks.push([from, to > new Date(end) ? new Date(end) : to]);
    cursor.setDate(cursor.getDate() + chunkDays);
  }
  return chunks;
}