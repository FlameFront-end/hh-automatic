/*
 * HH Automatic — выход только из чатов со статусом «Отказ».
 *
 * Как работает:
 * 1. Собирает чаты из списка, включая виртуализированный список.
 * 2. Оставляет только строки, где красный статус равен «Отказ».
 * 3. Выводит отобранные чаты в console.table().
 * 4. Ждёт стандартное подтверждение браузера.
 * 5. Только после подтверждения отправляет POST /chatik/api/leave.
 *
 * Запускать в DevTools Console на странице https://hh.ru/chat.
 */

// Дополнительные сообщения, которые считаются отказом.
// Список можно расширять при появлении новых шаблонов hh.ru.
const REJECTION_MESSAGE_MARKERS = [
  "Спасибо за интерес к вакансии! Мы ценим ваше желание работать с нами, но уже закрыли эту позицию."
];

(async () => {
  const API = 'https://chatik.hh.ru/chatik/api/leave';
  const SCAN_PAUSE = 500;
  const REQUEST_PAUSE = 250;

  let stopped = false;
  const refusals = new Map();

  window.stopHHRejects = () => {
    stopped = true;
    console.warn('Остановка запрошена.');
  };

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  const normalize = value =>
    (value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  const normalizedRejectionMarkers = REJECTION_MESSAGE_MARKERS.map(normalize);

  const scanRefusals = () => {
    document
      .querySelectorAll('[data-qa^="chatik-open-chat-"]')
      .forEach(chat => {
        const match = chat
          .getAttribute('data-qa')
          .match(/chatik-open-chat-(\d+)/);

        if (!match) return;

        const hasRedRefusalStatus = [...chat.querySelectorAll(
          '[class*="last-message-color_red"]'
        )].some(element => normalize(element.textContent) === 'отказ');

        const hasClosedVacancyMessage = normalizedRejectionMarkers.some(
          marker => normalize(chat.textContent).includes(marker)
        );

        const isRefusal = hasRedRefusalStatus || hasClosedVacancyMessage;

        if (!isRefusal) return;

        refusals.set(match[1], {
          chatId: match[1],
          vacancy: chat.querySelector(
            '[data-qa="chat-cell-title"]'
          )?.textContent.trim() || '',
          company: chat.querySelector(
            '[data-qa="chat-cell-subtitle"]'
          )?.textContent.trim() || '',
          reason: hasRedRefusalStatus
            ? 'Отказ'
            : 'Позиция закрыта'
        });
      });
  };

  const findScroller = () => {
    const chat = document.querySelector('[data-qa^="chatik-open-chat-"]');
    let element = chat;

    while (element && element !== document.body) {
      const style = getComputedStyle(element);

      if (
        ['auto', 'scroll'].includes(style.overflowY) &&
        element.scrollHeight > element.clientHeight + 100
      ) {
        return element;
      }

      element = element.parentElement;
    }

    return document.scrollingElement;
  };

  let bottomRounds = 0;

  for (let i = 0; i < 300 && bottomRounds < 3; i++) {
    if (stopped) return;

    scanRefusals();

    const scroller = findScroller();
    if (!scroller) break;

    const atBottom =
      scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 20;

    if (atBottom) {
      bottomRounds++;
    } else {
      bottomRounds = 0;
      scroller.scrollTop += Math.max(300, scroller.clientHeight * 0.8);
    }

    await sleep(SCAN_PAUSE);
  }

  scanRefusals();

  const targets = [...refusals.values()];

  if (!targets.length) {
    console.log('Чаты со статусом «Отказ» не найдены.');
    return;
  }

  console.table(targets);
  console.log(
    `Найдено отказов: ${targets.length}. До подтверждения запросы не отправляются.`
  );

  if (!confirm(`Найдено отказов: ${targets.length}. Выйти только из них?`)) {
    console.log('Отменено. Ни один чат не обработан.');
    return;
  }

  const xsrfToken = prompt(
    'Вставьте актуальное значение x-xsrftoken из запроса /chatik/api/leave:'
  );

  if (!xsrfToken) {
    console.log('Токен не указан. Ни один чат не обработан.');
    return;
  }

  let success = 0;
  let errors = 0;

  for (const chat of targets) {
    if (stopped) break;

    try {
      const response = await fetch(API, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-requested-with': 'XMLHttpRequest',
          'x-xsrftoken': xsrfToken
        },
        body: JSON.stringify({ chatId: Number(chat.chatId) })
      });

      if (response.ok) {
        success++;
        console.log(`Вышел: ${chat.company} — ${chat.vacancy}`);
      } else {
        errors++;
        console.warn(`Ошибка для ${chat.chatId}: HTTP ${response.status}`);

        if ([401, 403].includes(response.status)) {
          console.error('Токен недействителен или истёк.');
          break;
        }
      }
    } catch (error) {
      errors++;
      console.warn(`Ошибка для ${chat.chatId}: ${error.message}`);
    }

    await sleep(REQUEST_PAUSE);
  }

  console.log(
    `Готово. Успешно: ${success}; ошибок: ${errors}; найдено отказов: ${targets.length}`
  );
})();
