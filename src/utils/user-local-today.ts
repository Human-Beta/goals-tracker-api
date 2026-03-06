type DateParts = {
  year: string;
  month: string;
  day: string;
};

function resolveDateParts(timezone: string, now: Date): DateParts {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (error) {
    if (error instanceof RangeError) {
      throw new Error(`Invalid IANA timezone: ${timezone}`);
    }

    throw error;
  }

  const parts = formatter.formatToParts(now);

  return {
    year: parts.find(part => part.type === 'year')?.value ?? '',
    month: parts.find(part => part.type === 'month')?.value ?? '',
    day: parts.find(part => part.type === 'day')?.value ?? '',
  };
}

export function getUserLocalToday(timezone: string, now: Date = new Date()): string {
  const { year, month, day } = resolveDateParts(timezone, now);

  if (!year || !month || !day) {
    throw new Error('Failed to resolve local date parts');
  }

  return `${year}-${month}-${day}`;
}
