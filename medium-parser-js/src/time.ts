export function convertDatetimeToHumanReadable(unixTime: number): string {
  const datetimeObject = new Date(unixTime);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const day = datetimeObject.getDate();
  const month = monthNames[datetimeObject.getMonth()];
  const year = datetimeObject.getFullYear();

  return `${month} ${day}, ${year}`;
}

export function getUnixMs(): number {
  return Date.now();
}
