/*
 * Настраиваемый список навыков.
 * Редактируйте только этот массив в верхней части файла.
 */
const SKILLS = [
  "React",
  "React.js",
  "TypeScript",
  "JavaScript",
  "Next.js",
  "HTML",
  "HTML5",
  "CSS",
  "CSS3",
  "SCSS",
  "Git",
  "REST API",
  "API",
  "Docker",
  "CI/CD",
  "Redux",
  "Redux Toolkit",
  "RTK Query",
  "TanStack Query",
  "React Query",
  "Zustand",
  "Vite",
  "Webpack",
  "WebSocket",
  "SSE",
  "Node.js",
  "NestJS",
  "PostgreSQL",
  "Jest",
  "React Testing Library",
  "React Native",
  "Алгоритмы и структуры данных"
];

// После добавления перейти к уровням навыков и сохранить всё автоматически.
const AUTO_FINISH_LEVELS = true;

// Уровень по умолчанию для добавленных навыков.
const DEFAULT_SKILL_LEVEL = "Средний";

// При необходимости задайте отдельный уровень для конкретного навыка.
// Допустимые значения: "Базовый", "Средний", "Продвинутый".
const SKILL_LEVELS = {
  // "React": "Продвинутый",
  // "Английский язык": "Средний"
};

(async () => {
  const INPUT_SELECTOR =
    '[data-qa="resume-editor-skills-input"] input[data-qa="chips-trigger-input"]';

  const normalize = value =>
    String(value || "")
      .replace(/\u00a0/g, " ")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  const isVisible = element =>
    element instanceof HTMLElement &&
    element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== "hidden";

  const getInput = () =>
    document.querySelector(INPUT_SELECTOR) ||
    document.querySelector('input[data-qa="chips-trigger-input"]');

  const getSkillsRoot = () =>
    document.querySelector('[data-qa="resume-editor-skills-input"]');

  const setInputValue = (input, value) => {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set;

    if (!nativeSetter) {
      throw new Error("Не найден нативный setter HTMLInputElement.value");
    }

    input.focus();
    nativeSetter.call(input, value);

    try {
      input.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType: value ? "insertText" : "deleteContentBackward",
          data: value || null
        })
      );
    } catch {
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    input.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const waitFor = async (check, timeout = 3500, interval = 60) => {
    const deadline = performance.now() + timeout;

    while (performance.now() < deadline) {
      const result = check();

      if (result) return result;

      await sleep(interval);
    }

    return null;
  };

  const LEVEL_QA_BY_NAME = {
    "базовый": "skill-level-1",
    "средний": "skill-level-2",
    "продвинутый": "skill-level-3"
  };

  const findSkillCard = skill =>
    [...document.querySelectorAll('[data-qa="skill"]')].find(card => {
      const name = card.querySelector('[data-qa="skillName"]');
      return name && normalize(name.textContent) === normalize(skill);
    });

  const clickSave = async () => {
    const saveButton = await waitFor(
      () => [...document.querySelectorAll(
        '[data-qa="resume-partial-edit-save"]'
      )].find(isVisible),
      8000
    );

    if (!saveButton) return false;

    saveButton.scrollIntoView({ block: "center" });
    saveButton.click();
    return true;
  };

  const setSkillLevel = async (skill, level) => {
    const levelQa = LEVEL_QA_BY_NAME[normalize(level)];

    if (!levelQa) {
      return {
        skill,
        level,
        success: false,
        reason: "неизвестный уровень"
      };
    }

    const card = await waitFor(
      () => findSkillCard(skill),
      8000
    );

    if (!card) {
      return {
        skill,
        level,
        success: false,
        reason: "карточка навыка не найдена"
      };
    }

    const levelElement = card.querySelector(`[data-qa="${levelQa}"]`);
    const label = levelElement?.closest("label");
    const radio = label?.querySelector('input[type="radio"]');

    if (!levelElement || !label) {
      return {
        skill,
        level,
        success: false,
        reason: "кнопка уровня не найдена"
      };
    }

    label.scrollIntoView({ block: "center" });
    label.click();

    const selected = await waitFor(
      () => radio?.checked === true,
      2500
    );

    return {
      skill,
      level,
      success: Boolean(selected),
      reason: selected ? "" : "уровень не подтвердился"
    };
  };

  const hasSelectedSkill = skill => {
    const root = getSkillsRoot();

    if (!root) return false;

    const expected = normalize(skill);

    const chips = [
      ...root.querySelectorAll(
        '[data-qa="chip"], [data-qa*="selected"], [data-qa*="tag"]'
      )
    ];

    if (
      chips.some(chip => {
        if (!isVisible(chip) || chip.closest('[role="listbox"]')) {
          return false;
        }

        return normalize(chip.textContent) === expected;
      })
    ) {
      return true;
    }

    return [...root.querySelectorAll("span")].some(element => {
      if (!isVisible(element) || element.closest('[role="listbox"]')) {
        return false;
      }

      if (normalize(element.textContent) !== expected) {
        return false;
      }

      return ![...element.children].some(
        child => normalize(child.textContent) === expected
      );
    });
  };

  const getCurrentListbox = () => {
    const input = getInput();

    if (!input) return null;

    const controlledId = input.getAttribute("aria-controls");
    const controlledListbox = controlledId
      ? document.getElementById(controlledId)
      : null;

    if (controlledListbox && isVisible(controlledListbox)) {
      return controlledListbox;
    }

    return (
      [...document.querySelectorAll('[role="listbox"]')].find(isVisible) ||
      null
    );
  };

  const findExactOption = skill => {
    const listbox = getCurrentListbox();

    if (!listbox) return null;

    const expected = normalize(skill);

    const roleOption = [...listbox.querySelectorAll('[role="option"]')].find(
      option =>
        isVisible(option) && normalize(option.textContent) === expected
    );

    if (roleOption) return roleOption;

    const exactElement = [
      ...listbox.querySelectorAll("li, button, label, div, span")
    ].find(element => {
      if (!isVisible(element) || normalize(element.textContent) !== expected) {
        return false;
      }

      return ![...element.children].some(
        child => normalize(child.textContent) === expected
      );
    });

    if (!exactElement) return null;

    return (
      exactElement.closest(
        '[role="option"], li, button, label, [data-qa*="suggest"]'
      ) || exactElement
    );
  };

  const clearSearch = () => {
    const input = getInput();

    if (!input) return;

    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        bubbles: true
      })
    );

    setInputValue(input, "");
  };

  const added = [];
  const alreadyPresent = [];
  const skipped = [];

  const initialInput = getInput();

  if (!initialInput) {
    console.error(
      "Не найдено поле Skills. Открой страницу редактирования навыков."
    );
    return;
  }

  console.log(`Начинаю проверку ${SKILLS.length} навыков…`);

  for (const skill of SKILLS) {
    if (hasSelectedSkill(skill)) {
      alreadyPresent.push(skill);
      console.log("↪️ Уже есть:", skill);
      continue;
    }

    let successfullyAdded = false;
    let failureReason = "точная подсказка не найдена";

    for (let attempt = 1; attempt <= 2; attempt++) {
      if (hasSelectedSkill(skill)) {
        successfullyAdded = true;
        break;
      }

      const input = getInput();

      if (!input) {
        failureReason = "поле Skills исчезло со страницы";
        break;
      }

      clearSearch();
      await sleep(120);

      setInputValue(getInput(), skill);

      const option = await waitFor(() => {
        const currentInput = getInput();

        if (!currentInput) return null;

        const dropdownOpened =
          currentInput.getAttribute("aria-expanded") === "true" ||
          Boolean(getCurrentListbox());

        if (!dropdownOpened) return null;

        return findExactOption(skill);
      }, 4000);

      if (!option) {
        failureReason = "точная подсказка не появилась";
        clearSearch();
        break;
      }

      option.scrollIntoView({ block: "nearest" });
      option.click();

      const chipAppeared = await waitFor(
        () => hasSelectedSkill(skill),
        2500
      );

      if (chipAppeared) {
        successfullyAdded = true;
        break;
      }

      failureReason = "подсказка была нажата, но чип не появился";
      clearSearch();

      if (attempt < 2) await sleep(400);
    }

    if (successfullyAdded) {
      added.push(skill);
      console.log("✅ Добавлен:", skill);
    } else {
      skipped.push({ skill, reason: failureReason });
      console.warn(`⚠️ Пропущен: ${skill} — ${failureReason}`);
    }

    clearSearch();
    await sleep(250);
  }

  console.log("\n=== ЗАВЕРШЕНО ===");
  console.log(`Добавлено: ${added.length}`, added);
  console.log(`Уже присутствовало: ${alreadyPresent.length}`, alreadyPresent);
  console.log(`Пропущено: ${skipped.length}`, skipped);

  if (!added.length) {
    console.log("Новых навыков нет — сохранение не требуется.");
    return;
  }

  if (!AUTO_FINISH_LEVELS) {
    console.log(
      "Автоматический переход к уровням отключён. Проверь список и нажми «Сохранить» самостоятельно."
    );
    return;
  }

  console.log("Сохраняю навыки и перехожу к выбору уровней…");

  const firstSave = await clickSave();

  if (!firstSave) {
    console.error("Не найдена кнопка «Сохранить» на странице навыков.");
    return;
  }

  const levelPageReady = await waitFor(
    () => document.querySelector('[data-qa="skill"] [data-qa="skill-level-1"]'),
    10000
  );

  if (!levelPageReady) {
    console.error("Страница выбора уровней не открылась.");
    return;
  }

  const levelResults = [];

  for (const skill of added) {
    const level = SKILL_LEVELS[skill] || DEFAULT_SKILL_LEVEL;
    const result = await setSkillLevel(skill, level);

    levelResults.push(result);

    if (result.success) {
      console.log(`✅ Уровень выбран: ${skill} — ${level}`);
    } else {
      console.warn(
        `⚠️ Не удалось выбрать уровень: ${skill} — ${result.reason}`
      );
    }
  }

  console.table(levelResults);

  const levelSave = await clickSave();

  if (!levelSave) {
    console.error(
      "Уровни выбраны, но кнопка финального «Сохранить» не найдена."
    );
    return;
  }

  console.log(
    "Готово: навыки добавлены, уровни выбраны, финальное сохранение нажато."
  );
})();
