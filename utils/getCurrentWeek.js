function getCurrentWeek(currDate = new Date()) {
  const fDate = new Date(currDate);
  let endDate = new Date(currDate);
  let startDate = new Date(currDate);
  //getting day of the week
  let weekDay = fDate.getDay();
  //changing sunday from 1st day to last day of the week
  days = weekDay === 0 ? 7 : weekDay;

  startDate.setDate(startDate.getDate() - (days - 1));
  endDate.setDate(endDate.getDate() + (7 - days));

  return {
    startDate,
    endDate,
  };
}

module.exports = getCurrentWeek;
