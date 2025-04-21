const { Logging } = require('@google-cloud/logging');

// Створюємо клієнт Logging.
// У Cloud Run автентифікація зазвичай відбувається автоматично.
const logging = new Logging();

// Обираємо синхронні логери для stdout та stderr.
// Cloud Run автоматично перехопить ці потоки та зв'яже з ресурсом.
const stdoutLog = logging.logSync('stdout');
const stderrLog = logging.logSync('stderr');

// Стандартні рівні серйозності для Stackdriver Logging
const SEVERITY = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  NOTICE: 'NOTICE',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
  ALERT: 'ALERT',
  EMERGENCY: 'EMERGENCY',
};

/**
 * Записує структурований лог-запис.
 * @param {string} severity Рівень серйозності (з SEVERITY).
 * @param {string} message Основне повідомлення логу.
 * @param {object} [data={}] Додаткові дані для запису в JSON-форматі.
 */
const writeLog = (severity, message, data = {}) => {
  const logInstance = (severity === SEVERITY.ERROR || severity === SEVERITY.CRITICAL || severity === SEVERITY.ALERT || severity === SEVERITY.EMERGENCY)
    ? stderrLog
    : stdoutLog;

  // Створюємо запис логу.
  // Cloud Logging автоматично розпізнає поле 'message' та інші поля.
  const entry = logInstance.entry({ severity }, { message, ...data });

  // Записуємо лог.
  logInstance.write(entry);
};

// Експортуємо функції для різних рівнів логування
const logger = {
  debug: (message, data) => writeLog(SEVERITY.DEBUG, message, data),
  info: (message, data) => writeLog(SEVERITY.INFO, message, data),
  warn: (message, data) => writeLog(SEVERITY.WARNING, message, data),
  error: (message, data) => writeLog(SEVERITY.ERROR, message, data),
  critical: (message, data) => writeLog(SEVERITY.CRITICAL, message, data),
  // Додай інші рівні за потребою
};

module.exports = logger; 