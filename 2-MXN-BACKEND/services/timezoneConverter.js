class TimezoneConverter {

  // 🔹 عرض وقت البوت (UTC+6 فقط للعرض)
  getCurrentBotTime() {
    const now = new Date();

    const hour = (now.getUTCHours() + 6) % 24;
    const minute = now.getUTCMinutes();
    const second = now.getUTCSeconds();

    return {
      hour,
      minute,
      second,
      totalSeconds: hour * 3600 + minute * 60 + second
    };
  }

  /**
   * 🔹 تحويل الوقت من وقت البوت إلى وقت المستخدم
   */
  convertToUserTime(signalTime, userOffset, botOffset = 6) {
    const [h, m, s] = signalTime.split(':').map(Number);

    const userHour = (h - botOffset + userOffset + 24) % 24;

    return {
      hour: userHour,
      minute: m,
      second: s,
      // ✅ تم التصحيح هنا باستخدام علامات ` `
      localTime: `${String(userHour).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    };
  }

  /**
   * 🔹 فلترة الإشارات القادمة فقط
   */
  findNextSignal(signals, userOffset) {
    const bot = this.getCurrentBotTime();
    const upcoming = [];

    for (const signal of signals) {
      const [h, m, s] = signal.time.split(':').map(Number);
      const signalSeconds = h * 3600 + m * 60 + s;
      const secondsUntil = signalSeconds - bot.totalSeconds;

      if (secondsUntil <= 0) continue;

      const converted = this.convertToUserTime(signal.time, userOffset);

      upcoming.push({
        ...signal,
        localTime: converted.localTime,
        localHour: converted.hour,
        localMinute: converted.minute,
        secondsUntil
      });
    }

    return upcoming.sort((a, b) => a.secondsUntil - b.secondsUntil);
  }
}

module.exports = new TimezoneConverter();
