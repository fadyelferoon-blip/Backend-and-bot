/**
 * Timezone Conversion Service
 * Bot signals are in UTC+6 (Bangladesh time)
 */

class TimezoneConverter {

  // Get current time in UTC+6 (bot timezone)
  getCurrentBotTime() {
    const now = new Date();
    let hour = now.getUTCHours() + 6;
    if (hour >= 24) hour -= 24;
    const minute = now.getUTCMinutes();
    const second = now.getUTCSeconds();
    return {
      hour,
      minute,
      second,
      totalSeconds: hour * 3600 + minute * 60 + second
    };
  }

  // Convert signal time from UTC+6 to user timezone (display only)
  convertToUserTime(signalTime, userOffset) {
    const [h, m, s] = signalTime.split(':').map(Number);
    let userHour = h + (userOffset - 6);
    if (userHour < 0)   userHour += 24;
    if (userHour >= 24) userHour -= 24;
    const pad = n => String(n).padStart(2, '0');
    return {
      hour: userHour,
      minute: m,
      second: s,
      localTime: `${pad(userHour)}:${pad(m)}:${pad(s)}`
    };
  }

  /**
   * Filter and sort signals - STRICT rules:
   * - Only signals that have NOT started yet (secondsUntil > 0)
   * - Remove anything expired or currently active
   * - Sort by soonest first
   */
  findNextSignal(signals, userOffset) {
    const bot = this.getCurrentBotTime();
    console.log(`⏰ Bot time (UTC+6): ${bot.hour}:${bot.minute}:${bot.second}`);

    const upcoming = [];

    for (const signal of signals) {
      const [h, m, s] = signal.time.split(':').map(Number);
      const signalSeconds = h * 3600 + m * 60 + s;

      // Seconds until signal starts
      const secondsUntil = signalSeconds - bot.totalSeconds;

      // STRICT: only future signals (must be at least 1 second away)
      if (secondsUntil <= 0) continue;

      const converted = this.convertToUserTime(signal.time, userOffset);

      upcoming.push({
        ...signal,
        localTime:   converted.localTime,
        localHour:   converted.hour,
        localMinute: converted.minute,
        localSecond: converted.second,
        secondsUntil,
        minutesUntil: Math.floor(secondsUntil / 60),
        hoursUntil:   Math.floor(secondsUntil / 3600)
      });
    }

    upcoming.sort((a, b) => a.secondsUntil - b.secondsUntil);

    console.log(`📊 Upcoming signals: ${upcoming.length}`);
    if (upcoming.length > 0) {
      const next = upcoming[0];
      console.log(`🎯 Next: ${next.type} @ ${next.localTime} in ${next.minutesUntil}min ${next.secondsUntil % 60}s`);
    }

    return upcoming;
  }

  formatCountdown(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = n => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
}

module.exports = new TimezoneConverter();
