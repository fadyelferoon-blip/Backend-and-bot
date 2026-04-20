/**
 * Timezone Conversion Service
 * Bot signals are in UTC+6 (Bangladesh time)
 * We fetch signals at UTC+6, filter expired ones, then convert to user timezone
 */

class TimezoneConverter {
  
  // Get current time in UTC+6 (bot timezone)
  getCurrentBotTime() {
    const now = new Date();
    let hour = now.getUTCHours() + 6;
    if (hour >= 24) hour -= 24;
    return {
      hour,
      minute: now.getUTCMinutes(),
      second: now.getUTCSeconds(),
      totalSeconds: hour * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds()
    };
  }

  // Convert time from UTC+6 to user's timezone
  convertFromBotToUser(signalTime, userTimezoneOffset) {
    const [hour, minute, second] = signalTime.split(':').map(Number);
    
    // Bot is UTC+6, convert to UTC first, then to user timezone
    let userHour = hour + (userTimezoneOffset - 6);
    
    if (userHour < 0)   userHour += 24;
    if (userHour >= 24) userHour -= 24;

    const pad = n => String(n).padLeft ? String(n).padStart(2,'0') : (n < 10 ? '0'+n : ''+n);
    
    return {
      hour: userHour,
      minute,
      second,
      localTime: `${pad(userHour)}:${pad(minute)}:${pad(second)}`
    };
  }

  /**
   * Main function: filter expired signals and sort by next upcoming
   * @param {Array} signals - signals with time in UTC+6
   * @param {number} userTimezoneOffset - user's UTC offset (e.g. 2 for UTC+2)
   */
  findNextSignal(signals, userTimezoneOffset) {
    const botNow = this.getCurrentBotTime();
    
    console.log(`⏰ Bot time (UTC+6): ${botNow.hour}:${botNow.minute}:${botNow.second}`);

    const result = [];

    for (const signal of signals) {
      const [h, m, s] = signal.time.split(':').map(Number);
      const signalBotSeconds = h * 3600 + m * 60 + s;

      // Seconds until this signal fires (in UTC+6)
      let secondsUntil = signalBotSeconds - botNow.totalSeconds;

      // Skip signals that already passed (more than 60s ago)
      if (secondsUntil < -60) continue;

      // If slightly negative (within 60s), treat as happening now
      if (secondsUntil < 0) secondsUntil = 0;

      // Convert signal time to user's local timezone for display
      const converted = this.convertFromBotToUser(signal.time, userTimezoneOffset);

      result.push({
        ...signal,
        localTime:    converted.localTime,
        localHour:    converted.hour,
        localMinute:  converted.minute,
        localSecond:  converted.second,
        secondsUntil,
        minutesUntil: Math.floor(secondsUntil / 60),
        hoursUntil:   Math.floor(secondsUntil / 3600)
      });
    }

    // Sort by soonest first
    result.sort((a, b) => a.secondsUntil - b.secondsUntil);

    console.log(`📊 Valid signals: ${result.length} (removed expired)`);
    if (result.length > 0) {
      const next = result[0];
      console.log(`🎯 NEXT SIGNAL: ${next.type} @ ${next.localTime} (user time) in ${next.minutesUntil}min`);
    }

    return result;
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
