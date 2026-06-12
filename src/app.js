const SOURCES = [
  {
    volume: "17",
    label: "第17巻",
    path: "/data/lessing_letters_translation.md",
  },
  {
    volume: "18",
    label: "第18巻",
    path: "/data/lessing_letters_translation_vol18.md",
  },
];

const elements = {
  query: document.querySelector("#queryInput"),
  from: document.querySelector("#fromInput"),
  to: document.querySelector("#toInput"),
  volume: document.querySelector("#volumeInput"),
  clear: document.querySelector("#clearButton"),
  downloadResults: document.querySelector("#downloadResultsButton"),
  resultCount: document.querySelector("#resultCount"),
  rangeText: document.querySelector("#rangeText"),
  list: document.querySelector("#letterList"),
  view: document.querySelector("#letterView"),
};

const state = {
  letters: [],
  filtered: [],
  selectedId: null,
};

function parseLetters(markdown, source) {
  const blocks = markdown.split(/\n(?=## 第\d+書簡\s+)/g);
  return blocks
    .filter((block) => /^## 第\d+書簡\s+/m.test(block))
    .map((block) => {
      const title = block.match(/^##\s+(.+)$/m)?.[1]?.trim() ?? "無題";
      const number = Number(title.match(/第(\d+)書簡/)?.[1] ?? 0);
      const recipient = title.replace(/^第\d+書簡\s*/, "").trim();
      const originalTitle = block.match(/^原題:\s*(.+)$/m)?.[1]?.trim() ?? "";
      const dateLabel = block.match(/^日付:\s*(.+)$/m)?.[1]?.trim() ?? "日付未詳";
      const dateRange = parseDateRange(dateLabel);
      const body = block.replace(/^##\s+.+\n?/, "").trim();

      return {
        id: `${source.volume}-${number}`,
        volume: source.volume,
        volumeLabel: source.label,
        number,
        title,
        recipient,
        originalTitle,
        dateLabel,
        dateStart: dateRange.start,
        dateEnd: dateRange.end,
        body,
        searchable: `${title}\n${originalTitle}\n${dateLabel}\n${body}`.toLowerCase(),
      };
    });
}

function parseDateRange(label) {
  const full = label.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (full) {
    const date = isoDate(full[1], full[2], full[3]);
    return { start: date, end: date };
  }

  const yearMonth = label.match(/(\d{4})年(\d{1,2})月/);
  if (yearMonth) {
    const year = Number(yearMonth[1]);
    const month = Number(yearMonth[2]);
    return {
      start: isoDate(year, month, 1),
      end: isoDate(year, month, daysInMonth(year, month)),
    };
  }

  const splitYear = label.match(/(\d{4})\/(\d{2})年/);
  if (splitYear) {
    const startYear = Number(splitYear[1]);
    const endYear = Number(`${String(startYear).slice(0, 2)}${splitYear[2]}`);
    return {
      start: `${startYear}-01-01`,
      end: `${endYear}-12-31`,
    };
  }

  const years = [...label.matchAll(/(\d{4})年/g)].map((match) => Number(match[1]));
  if (years.length) {
    return {
      start: `${Math.min(...years)}-01-01`,
      end: `${Math.max(...years)}-12-31`,
    };
  }

  return { start: "", end: "" };
}

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function applyFilters() {
  const query = elements.query.value.trim().toLowerCase();
  const terms = query.split(/\s+/).filter(Boolean);
  const from = elements.from.value;
  const to = elements.to.value;
  const volume = elements.volume.value;

  state.filtered = state.letters.filter((letter) => {
    const matchesVolume = volume === "all" || letter.volume === volume;
    const matchesTerms = terms.every((term) => letter.searchable.includes(term));
    const matchesFrom = !from || !letter.dateEnd || letter.dateEnd >= from;
    const matchesTo = !to || !letter.dateStart || letter.dateStart <= to;
    return matchesVolume && matchesTerms && matchesFrom && matchesTo;
  });

  if (!state.filtered.some((letter) => letter.id === state.selectedId)) {
    state.selectedId = state.filtered[0]?.id ?? null;
  }

  render();
}

function render() {
  renderMeta();
  renderList();
  renderLetter();
}

function renderMeta() {
  elements.resultCount.textContent = `${state.filtered.length}件`;
  const from = elements.from.value || "指定なし";
  const to = elements.to.value || "指定なし";
  elements.rangeText.textContent = `期間: ${from} から ${to}`;
}

function renderList() {
  elements.list.replaceChildren(
    ...state.filtered.map((letter) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = letter.id === state.selectedId ? "letter-item is-active" : "letter-item";
      button.dataset.id = letter.id;
      button.innerHTML = `
        <span class="letter-number">${letter.volumeLabel} / 第${letter.number}書簡</span>
        <span class="letter-title">${escapeHtml(letter.recipient)}</span>
        <span class="letter-date">${escapeHtml(letter.dateLabel)}</span>
      `;
      return button;
    }),
  );
}

function renderLetter() {
  const letter = state.letters.find((item) => item.id === state.selectedId);
  if (!letter) {
    elements.view.innerHTML = `<p class="empty">条件に合う書簡がありません。</p>`;
    return;
  }

  elements.view.innerHTML = `
    <header class="letter-header">
      <p>${letter.volumeLabel} / 第${letter.number}書簡</p>
      <h2>${escapeHtml(letter.recipient)}</h2>
      <dl>
        ${letter.originalTitle ? `<div><dt>原題</dt><dd>${escapeHtml(letter.originalTitle)}</dd></div>` : ""}
        <div><dt>日付</dt><dd>${escapeHtml(letter.dateLabel)}</dd></div>
      </dl>
    </header>
    <div class="letter-body">${markdownToHtml(letter.body)}</div>
  `;
}

function markdownToHtml(markdown) {
  const lines = markdown.split("\n");
  const html = [];
  let paragraph = [];

  const flush = () => {
    if (!paragraph.length) return;
    html.push(`<p>${paragraph.map(escapeHtml).join("<br>")}</p>`);
    paragraph = [];
  };

  for (const line of lines) {
    if (!line.trim()) {
      flush();
    } else if (/^訳注:/.test(line)) {
      flush();
      html.push(`<h3>${escapeHtml(line)}</h3>`);
    } else if (/^[^:：]{1,12}[：:]$/.test(line.trim())) {
      flush();
      html.push(`<h3>${escapeHtml(line.trim())}</h3>`);
    } else {
      paragraph.push(line);
    }
  }

  flush();
  return html.join("");
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}

function downloadResults() {
  const rows = [
    ["巻", "書簡番号", "宛先", "原題", "日付", "開始日", "終了日"].join(","),
    ...state.filtered.map((letter) =>
      [
        letter.volumeLabel,
        `第${letter.number}書簡`,
        letter.recipient,
        letter.originalTitle,
        letter.dateLabel,
        letter.dateStart,
        letter.dateEnd,
      ]
        .map(csvCell)
        .join(","),
    ),
  ];
  const blob = new Blob([`\ufeff${rows.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "lessing_search_results.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

async function load() {
  const files = await Promise.all(
    SOURCES.map(async (source) => {
      const response = await fetch(source.path);
      if (!response.ok) throw new Error(`${source.path} を読み込めませんでした。`);
      return parseLetters(await response.text(), source);
    }),
  );

  state.letters = files.flat().sort((a, b) => {
    if (a.dateStart && b.dateStart && a.dateStart !== b.dateStart) {
      return a.dateStart.localeCompare(b.dateStart);
    }
    return a.number - b.number;
  });
  state.selectedId = state.letters[0]?.id ?? null;
  applyFilters();
}

elements.list.addEventListener("click", (event) => {
  const button = event.target.closest(".letter-item");
  if (!button) return;
  state.selectedId = button.dataset.id;
  render();
});

[elements.query, elements.from, elements.to, elements.volume].forEach((input) => {
  input.addEventListener("input", applyFilters);
});

elements.clear.addEventListener("click", () => {
  elements.query.value = "";
  elements.from.value = "";
  elements.to.value = "";
  elements.volume.value = "all";
  applyFilters();
});

elements.downloadResults.addEventListener("click", downloadResults);

load().catch((error) => {
  elements.resultCount.textContent = "読み込み失敗";
  elements.view.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
});
