/*
 * HH Automatic — удаление выбранных навыков из резюме.
 *
 * НАСТРОЙКА: измените массив SKILLS_TO_REMOVE в самом верху файла.
 *
 * Запускать только на странице редактирования резюме hh.ru,
 * на экране «Какими навыками владеете?». Скрипт не нажимает
 * кнопку «Сохранить» автоматически.
 */

const SKILLS_TO_REMOVE = [
  "Linux",
  "Docker",
  "Python",
  "Английский язык"
];

(async () => {
  const ROOT_SELECTOR = '[data-qa="resume-editor-skills-input"]';
  const CHIP_SELECTOR = '[data-qa^="chips-trigger-chip-"]';
  const DELETE_SELECTOR =
    '[data-qa="chip-delete-action"], button[aria-label="Удалить"]';

  let stopped = false;

  window.stopHHRemoveSkills = () => {
    stopped = true;
    console.warn('Удаление навыков остановлено.');
  };

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  const normalize = value =>
    String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  const isVisible = element =>
    element instanceof HTMLElement &&
    element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== 'hidden';

  const getRoot = () => document.querySelector(ROOT_SELECTOR);

  const getSelectedChips = () => {
    const root = getRoot();
    if (!root) return [];

    return [...root.querySelectorAll(CHIP_SELECTOR)].filter(isVisible);
  };

  const getChipName = chip => {
    const qa = chip.getAttribute('data-qa') || '';
    const prefix = 'chips-trigger-chip-';

    return qa.startsWith(prefix)
      ? qa.slice(prefix.length)
      : chip.textContent || '';
  };

  const findChip = skill =>
    getSelectedChips().find(
      chip => normalize(getChipName(chip)) === normalize(skill)
    );

  const waitFor = async (check, timeout = 3000) => {
    const deadline = performance.now() + timeout;

    while (performance.now() < deadline) {
      if (stopped) return null;

      const result = check();
      if (result) return result;

      await sleep(80);
    }

    return null;
  };

  if (!getRoot()) {
    console.error(
      'Не найдено поле навыков. Откройте страницу редактирования резюме и экран «Какими навыками владеете?». '
    );
    return;
  }

  if (!SKILLS_TO_REMOVE.length) {
    console.warn('Массив SKILLS_TO_REMOVE пуст.');
    return;
  }

  const found = SKILLS_TO_REMOVE
    .map(skill => ({ requested: skill, chip: findChip(skill) }))
    .filter(item => item.chip)
    .map(item => ({
      skill: item.requested,
      currentName: getChipName(item.chip)
    }));

  const notFound = SKILLS_TO_REMOVE.filter(
    skill => !found.some(item => normalize(item.skill) === normalize(skill))
  );

  console.table(found);

  if (notFound.length) {
    console.log('Не найдены среди выбранных:', notFound);
  }

  if (!found.length) {
    console.log('Ни один из указанных навыков не найден.');
    return;
  }

  if (!confirm(
    `Будут удалены навыки: ${found.map(item => item.currentName).join(', ')}.\n\nПродолжить?`
  )) {
    console.log('Отменено. Навыки не изменены.');
    return;
  }

  const removed = [];
  const failed = [];

  for (const item of found) {
    if (stopped) break;

    const chip = findChip(item.requested);
    const deleteButton = chip?.querySelector(DELETE_SELECTOR);

    if (!chip || !deleteButton || !isVisible(deleteButton)) {
      failed.push({
        skill: item.currentName,
        reason: 'кнопка удаления не найдена'
      });
      continue;
    }

    deleteButton.click();

    const disappeared = await waitFor(
      () => !findChip(item.requested),
      3000
    );

    if (disappeared) {
      removed.push(item.currentName);
      console.log('🗑️ Удалён:', item.currentName);
    } else {
      failed.push({
        skill: item.currentName,
        reason: 'чип не исчез после клика'
      });
      console.warn('⚠️ Не удалось удалить:', item.currentName);
    }

    await sleep(200);
  }

  console.log('\n=== ЗАВЕРШЕНО ===');
  console.log(`Удалено: ${removed.length}`, removed);
  console.log(`Ошибок: ${failed.length}`, failed);
  console.log(
    'Изменения пока не сохранены. Проверьте результат и нажмите «Сохранить» вручную.'
  );
})();
