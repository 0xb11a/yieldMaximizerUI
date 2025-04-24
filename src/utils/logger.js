import pino from 'pino';

// Налаштування pino для роботи в браузері
// Використовуємо стандартні console методи для виводу,
// але pino форматує повідомлення як JSON.
const logger = pino({
  browser: {
    // Передаємо об'єкт pino як console, щоб зберегти стандартну поведінку браузера
    // (наприклад, розгортання об'єктів), але з JSON форматуванням.
    asObject: true,
    // Можна налаштувати `transmit` для надсилання логів на сервер,
    // але для Cloud Run/Cloud Logging достатньо виводу в консоль.
  },
  level: 'info', // Встановлюємо рівень логування за замовчуванням
  base: { 
    // Додаємо базові поля до кожного логу, якщо потрібно 
    // pid: undefined, // Вимикаємо pid, бо в браузері його немає
    // hostname: undefined // Вимикаємо hostname
  },
  // Додаємо мітку часу
  timestamp: pino.stdTimeFunctions.isoTime,
  // Форматуємо рівень логування у відповідності до Cloud Logging
  formatters: {
    level: (label) => {
      // Перетворюємо стандартні назви рівнів pino на назви Google Cloud Logging
      // https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#LogSeverity
      const pinoLevelToSeverity = {
        trace: 'DEBUG',
        debug: 'DEBUG',
        info: 'INFO',
        warn: 'WARNING',
        error: 'ERROR',
        fatal: 'CRITICAL',
      };
      return { severity: pinoLevelToSeverity[label] || label.toUpperCase() };
    },
    // Перейменовуємо msg на message для кращої сумісності з Cloud Logging
    log: (obj) => {
       if (obj.msg) {
         obj.message = obj.msg;
         delete obj.msg;
       }
       return obj;
    }
  }
});

// Експортуємо логгер
export default logger; 