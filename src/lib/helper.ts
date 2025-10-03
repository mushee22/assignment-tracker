export function deadlineMinus(due_date: Date, schedule: string) {
  const dueDate = new Date(due_date);
  const [time, unit] = schedule.split(',');
  switch (unit) {
    case 'minutes':
      dueDate.setMinutes(dueDate.getMinutes() - Number(time));
      break;
    case 'hours':
      dueDate.setHours(dueDate.getHours() - Number(time));
      break;
    case 'days':
      dueDate.setDate(dueDate.getDate() - Number(time));
      break;
    case 'weeks':
      dueDate.setDate(dueDate.getDate() - Number(time) * 7);
      break;
    default:
      break;
  }
  return dueDate;
}
