/*
 * HH Automatic — выход из всех найденных чатов hh.ru.
 *
 * Как работает:
 * 1. Собирает chatId из списка чатов, включая виртуализированный список.
 * 2. Выводит найденные чаты в console.table().
 * 3. Ждёт стандартное подтверждение браузера.
 * 4. Только после подтверждения отправляет POST /chatik/api/leave.
 *
 * Запускать в DevTools Console на странице https://hh.ru/chat.
 * Скрипт не использует vacancyId: API выхода требует именно chatId.
 */

(async () => {
  const API = 'https://chatik.hh.ru/chatik/api/leave';
  const SCAN_PAUSE = 500;
  const REQUEST_PAUSE = 250;

  let stopped = false;
  const chats = new Map();

  window.stopHHAll = () => {
    stopped = true;
    console.warn('Остановка запрошена.');
  };

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  const scanChats = () => {
    document
      .querySelectorAll(
        '[data-qa^="chatik-open-chat-"], [data-qa^="chatik-select-chat-"]'
      )
      .forEach(element => {
        const qa = element.getAttribute('data-qa');
        const match = qa.match(/chatik-(?:open-chat|select-chat)-(\d+)/);

        if (!match) return;

        const chatId = match[1];
        const row = element.closest('[data-qa^="chatik-open-chat-"]') || element;

        chats.set(chatId, {
          chatId,
          vacancy: row.querySelector('[data-qa="chat-cell-title"]')?.textContent.trim() || '',
          company: row.querySelector('[data-qa="chat-cell-subtitle"]')?.textContent.trim() || ''
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

    scanChats();

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

  scanChats();

  const targets = [...chats.values()];

  if (!targets.length) {
    console.log('Чаты не найдены. Откройте страницу «Чаты» и повторите.');
    return;
  }

  console.table(targets);
  console.log(
    `Найдено чатов: ${targets.length}. До подтверждения запросы не отправляются.`
  );

  if (!confirm(`Найдено чатов: ${targets.length}. Выйти из всех?`)) {
    console.log('Отменено. Ни один чат не обработан.');
    return;
  }

  const confirmationPhrase = prompt(
    'Это действие нельзя легко отменить.\n\n' +
      'Для окончательного подтверждения введите точно:\nВЫЙТИ ИЗ ВСЕХ'
  );

  if (confirmationPhrase !== 'ВЫЙТИ ИЗ ВСЕХ') {
    console.log(
      'Дополнительное подтверждение не пройдено. Ни один чат не обработан.'
    );
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
    `Готово. Успешно: ${success}; ошибок: ${errors}; найдено: ${targets.length}`
  );
})();
