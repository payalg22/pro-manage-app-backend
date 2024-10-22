function getCurrentMonth(currDate = new Date()) {
  // getting first day of the month
  const startDate = new Date(currDate.getFullYear(), currDate.getMonth(), 1);
  // getting last day of the month
  const endDate = new Date(currDate.getFullYear(), currDate.getMonth() + 1, 0);

  return {
    startDate,
    endDate,
  };
}

module.exports = getCurrentMonth;
