/*
 * Настраиваемый список навыков.
 * level: "Базовый", "Средний", "Продвинутый" или "-".
 * Значение "-" означает: добавить навык, но не выбирать ему уровень.
 */

// Максимум - 30 для HH.ru
const SKILLS = [
  { skill: "Kubernetes", level: "Продвинутый" },
  { skill: "Linux", level: "Продвинутый" },
  { skill: "Docker", level: "Продвинутый" },
  { skill: "CI/CD", level: "Продвинутый" },
  { skill: "DevOps", level: "Продвинутый" },
  { skill: "Python", level: "Средний" },
  { skill: "Bash", level: "Продвинутый" },
  { skill: "Ansible", level: "Продвинутый" },
  { skill: "Terraform", level: "Продвинутый" },
  { skill: "GitLab CI/CD", level: "Продвинутый" },
  { skill: "PostgreSQL", level: "Средний" },
  { skill: "Администрирование серверов Linux", level: "Продвинутый" },
  { skill: "Prometheus", level: "Продвинутый" },
  { skill: "Grafana", level: "Продвинутый" },
  { skill: "Nginx", level: "Продвинутый" },
  { skill: "Git", level: "Продвинутый" },
  { skill: "Helm", level: "Продвинутый" },
  { skill: "Мониторинг", level: "Продвинутый" },
  { skill: "Infrastructure as Code", level: "Продвинутый" },
  { skill: "ArgoCD", level: "Средний" },
  { skill: "SRE", level: "Средний" },
  { skill: "SLI/SLO", level: "Средний" },
  { skill: "Zabbix", level: "Средний" },
  { skill: "ELK", level: "Средний" },
  { skill: "Loki", level: "Средний" },
  { skill: "Redis", level: "Средний" },
  { skill: "HashiCorp Vault", level: "Средний" },
  { skill: "AWS", level: "Средний" },
  { skill: "Yandex Cloud", level: "Продвинутый" },
  { skill: "Astra Linux", level: "Средний" }
];

(async () => {
  const INPUT_SELECTOR =
    '[data-qa="resume-editor-skills-input"] input[data-qa="chips-trigger-input"]';

  const normalize = (value) =>
    String(value || "")
      .replace(/\u00a0/g, " ")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const isVisible = (element) =>
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
      "value",
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
          data: value || null,
        }),
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
    базовый: "skill-level-1",
    средний: "skill-level-2",
    продвинутый: "skill-level-3",
  };

  const findSkillCard = (skill) =>
    [...document.querySelectorAll('[data-qa="skill"]')].find((card) => {
      const name = card.querySelector('[data-qa="skillName"]');
      return name && normalize(name.textContent) === normalize(skill);
    });

  const clickSave = async () => {
    const saveButton = await waitFor(
      () =>
        [
          ...document.querySelectorAll('[data-qa="resume-partial-edit-save"]'),
        ].find(isVisible),
      8000,
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
        reason: "неизвестный уровень",
      };
    }

    const card = await waitFor(() => findSkillCard(skill), 8000);

    if (!card) {
      return {
        skill,
        level,
        success: false,
        reason: "карточка навыка не найдена",
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
        reason: "кнопка уровня не найдена",
      };
    }

    label.scrollIntoView({ block: "center" });
    label.click();

    const selected = await waitFor(() => radio?.checked === true, 2500);

    return {
      skill,
      level,
      success: Boolean(selected),
      reason: selected ? "" : "уровень не подтвердился",
    };
  };

  const hasSelectedSkill = (skill) => {
    const root = getSkillsRoot();

    if (!root) return false;

    const expected = normalize(skill);

    const chips = [
      ...root.querySelectorAll(
        '[data-qa="chip"], [data-qa*="selected"], [data-qa*="tag"]',
      ),
    ];

    if (
      chips.some((chip) => {
        if (!isVisible(chip) || chip.closest('[role="listbox"]')) {
          return false;
        }

        return normalize(chip.textContent) === expected;
      })
    ) {
      return true;
    }

    return [...root.querySelectorAll("span")].some((element) => {
      if (!isVisible(element) || element.closest('[role="listbox"]')) {
        return false;
      }

      if (normalize(element.textContent) !== expected) {
        return false;
      }

      return ![...element.children].some(
        (child) => normalize(child.textContent) === expected,
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
      [...document.querySelectorAll('[role="listbox"]')].find(isVisible) || null
    );
  };

  const findExactOption = (skill) => {
    const listbox = getCurrentListbox();

    if (!listbox) return null;

    const expected = normalize(skill);

    const roleOption = [...listbox.querySelectorAll('[role="option"]')].find(
      (option) =>
        isVisible(option) && normalize(option.textContent) === expected,
    );

    if (roleOption) return roleOption;

    const exactElement = [
      ...listbox.querySelectorAll("li, button, label, div, span"),
    ].find((element) => {
      if (!isVisible(element) || normalize(element.textContent) !== expected) {
        return false;
      }

      return ![...element.children].some(
        (child) => normalize(child.textContent) === expected,
      );
    });

    if (!exactElement) return null;

    return (
      exactElement.closest(
        '[role="option"], li, button, label, [data-qa*="suggest"]',
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
        bubbles: true,
      }),
    );

    setInputValue(input, "");
  };

  const added = [];
  const alreadyPresent = [];
  const skipped = [];

  const initialInput = getInput();

  if (!initialInput) {
    console.error(
      "Не найдено поле Skills. Открой страницу редактирования навыков.",
    );
    return;
  }

  console.log(`Начинаю проверку ${SKILLS.length} навыков…`);

  for (const skillConfig of SKILLS) {
    const skill = skillConfig.skill;

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

      const searchInput = getInput();

      if (!searchInput) {
        failureReason = "поле Skills исчезло со страницы";
        break;
      }

      searchInput.focus();
      setInputValue(searchInput, skill);

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

      const chipAppeared = await waitFor(() => hasSelectedSkill(skill), 2500);

      if (chipAppeared) {
        successfullyAdded = true;
        break;
      }

      failureReason = "подсказка была нажата, но чип не появился";
      clearSearch();

      if (attempt < 2) await sleep(400);
    }

    if (successfullyAdded) {
      added.push({
        skill,
        level: skillConfig.level,
      });
      console.log("✅ Добавлен:", skill);
    } else {
      skipped.push({ skill, reason: failureReason });
      console.warn(`⚠️ Пропущен: ${skill} — ${failureReason}`);
    }

    clearSearch();
    await sleep(250);
  }

  console.log("\n=== ЗАВЕРШЕНО ===");
  console.log(
    `Добавлено: ${added.length}`,
    added.map((item) => `${item.skill} — ${item.level}`),
  );
  console.log(`Уже присутствовало: ${alreadyPresent.length}`, alreadyPresent);
  console.log(`Пропущено: ${skipped.length}`, skipped);

  if (!added.length) {
    console.log("Новых навыков нет — сохранение не требуется.");
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
    10000,
  );

  if (!levelPageReady) {
    console.error("Страница выбора уровней не открылась.");
    return;
  }

  const levelResults = [];

  for (const item of added) {
    const level = String(item.level || "-").trim();

    if (!level || level === "-") {
      levelResults.push({
        skill: item.skill,
        level: "-",
        success: true,
        reason: "уровень не выбирался",
      });
      console.log(`↪️ Уровень пропущен: ${item.skill}`);
      continue;
    }

    const result = await setSkillLevel(item.skill, level);

    levelResults.push(result);

    if (result.success) {
      console.log(`✅ Уровень выбран: ${skill} — ${level}`);
    } else {
      console.warn(
        `⚠️ Не удалось выбрать уровень: ${skill} — ${result.reason}`,
      );
    }
  }

  console.table(levelResults);

  const levelSave = await clickSave();

  if (!levelSave) {
    console.error(
      "Уровни выбраны, но кнопка финального «Сохранить» не найдена.",
    );
    return;
  }

  console.log(
    "Готово: навыки добавлены, уровни выбраны, финальное сохранение нажато.",
  );
})();
