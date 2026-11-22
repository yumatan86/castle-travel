// =========================
// 画面切り替え
// =========================

const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

navItems.forEach((item) => {
  item.addEventListener("click", () => {

    const targetPage = item.dataset.page;

    // すべての画面を非表示にする
    pages.forEach((page) => {
      page.classList.remove("active");
    });
    document.getElementById(targetPage).classList.add("active");

    // ナビゲーションの選択状態を更新
    navItems.forEach((nav) => {
      nav.classList.remove("active");
    });
    item.classList.add("active");
  });
});

// =========================
// 地図の初期化
// =========================

const mapElement = document.getElementById("map");
const map = L.map(mapElement).setView([36.5, 137.5], 5);
// 詳細パネルや画面切り替えで地図の表示領域が変わったら再計算する
const mapResizeObserver = new ResizeObserver(() => {
  if (mapElement.clientWidth && mapElement.clientHeight) {
    map.invalidateSize();
  }
});
mapResizeObserver.observe(mapElement);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// =========================
// 訪問状況の保存と復元
// =========================

const castleLayers = new Map();

const visitedCastlesKey = "castle-travel.visited-castles";
let visitedCastles = new Set();
try {
  visitedCastles = readVisitedCastles();
} catch (error) {
  console.warn("訪問状況を読み込めませんでした:", error);
}

function readVisitedCastles() {
  const raw = localStorage.getItem(visitedCastlesKey);
  try {
    const stored = JSON.parse(raw);
    return new Set(Array.isArray(stored) ? stored.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

// =========================
// 城の詳細と訪問状況の変更
// =========================

const castleDetail = document.getElementById("castle-detail");
const castleName = document.getElementById("castle-detail-name");
const castleCategory = document.getElementById("castle-detail-category");
const castleNumber = document.getElementById("castle-detail-number");
const castleLocation = document.getElementById("castle-detail-location");
const visitStatus = document.getElementById("castle-visit-status");
const castleHistoryNote = document.getElementById("castle-history-note");
const addVisitForm = document.getElementById("add-visit-form");
const addVisitMessage = document.getElementById("add-visit-message");
let selectedCastle = null;

function closeCastleDetail() {
  castleDetail.hidden = true;
  selectedCastle = null;
}

document.getElementById("close-castle-detail").addEventListener("click", () => {
  const markerElement = selectedCastle.marker.getElement();
  closeCastleDetail();
  markerElement.focus({ preventScroll: true });
});

visitStatus.addEventListener("change", () => {
  const { castle, marker } = selectedCastle;
  const isVisited = visitStatus.value === "visited";
  if (isVisited) {
    visitedCastles.add(castle.id);
  } else {
    visitedCastles.delete(castle.id);
  }
  marker.setIcon(isVisited ? visitedIcons.get(castle.category) : unvisitedIcon);
  renderCastleProgress();
  renderCastleList();

  try {
    // 別のタブで保存した城の訪問状況も残す
    const stored = readVisitedCastles();
    if (isVisited) {
      stored.add(castle.id);
    } else {
      stored.delete(castle.id);
    }
    localStorage.setItem(visitedCastlesKey, JSON.stringify([...stored]));
  } catch (error) {
    console.warn("訪問状況を保存できませんでした:", error);
  }
});

// =========================
// 区分別のマーカーレイヤーとアイコン
// =========================

document.querySelectorAll(".map-filters input").forEach((filter) => {
  const layer = L.layerGroup();
  castleLayers.set(filter.value, { filter, layer, updateLayer });

  function updateLayer() {
    if (filter.checked) {
      layer.addTo(map);
    } else {
      if (selectedCastle?.castle.category === filter.value) {
        closeCastleDetail();
      }
      layer.remove();
    }
  }

  filter.addEventListener("change", updateLayer);
  updateLayer();
});

function createCastleIcon(className) {
  return L.divIcon({
    className,
    html: '<div class="castle-marker-dot"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

const unvisitedIcon = createCastleIcon("castle-marker");
const visitedIcons = new Map([
  ["日本100名城", createCastleIcon("castle-marker castle-marker--visited-100")],
  ["続日本100名城", createCastleIcon("castle-marker castle-marker--visited-zoku")]
]);

// =========================
// 城一覧と訪問達成率
// =========================

const castleSearch = document.getElementById("castle-search");
const categoryFilter = document.getElementById("castle-category-filter");
const prefectureFilter = document.getElementById("castle-prefecture-filter");
const statusFilter = document.getElementById("castle-status-filter");
const castleProgress = document.getElementById("castle-progress");
const progress100 = document.getElementById("progress-100");
const progressZoku = document.getElementById("progress-zoku");
const progressUnvisited = document.getElementById("progress-unvisited");
const progressUnvisitedCount = document.getElementById("progress-unvisited-count");
const castleListStatus = document.getElementById("castle-list-status");
const castleList = document.getElementById("castle-list");
const castleListItem = document.getElementById("castle-list-item");
const mapTab = document.querySelector('.nav-item[data-page="map-page"]');
let castleEntries = [];

// 日付のない既存の訪問済み設定と、日付付きの履歴を別々に保存する。
const visitHistoryKey = "castle-travel.visit-history";
const historyList = document.getElementById("visit-history-list");
const historyEmpty = document.getElementById("visit-history-empty");
const historyMessage = document.getElementById("visit-history-message");
const historyItem = document.getElementById("visit-history-item");
let visitHistory = [];
let castlesWithHistory = new Set();

function isVisitHistory(entries) {
  return Array.isArray(entries) && entries.every((entry) =>
    entry && typeof entry.id === "string" && typeof entry.castleId === "string" &&
    typeof entry.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
    typeof entry.memo === "string"
  );
}

function readVisitHistory() {
  const stored = JSON.parse(localStorage.getItem(visitHistoryKey) ?? "[]");
  if (!isVisitHistory(stored)) throw new Error("訪問履歴の形式が不正です");
  return stored;
}

function setVisitHistory(entries) {
  visitHistory = entries;
  castlesWithHistory = new Set(entries.map((entry) => entry.castleId));
}

try {
  setVisitHistory(readVisitHistory());
} catch (error) {
  historyMessage.textContent = "保存済みの訪問履歴を読み込めませんでした。";
  console.warn(error);
}

function isCastleVisited(castleId) {
  return visitedCastles.has(castleId) || castlesWithHistory.has(castleId);
}

function updateDetailVisitStatus(castleId) {
  visitStatus.value = isCastleVisited(castleId) ? "visited" : "unvisited";
  visitStatus.disabled = castlesWithHistory.has(castleId);
  castleHistoryNote.hidden = !visitStatus.disabled;
}

function saveVisitHistory(update, message) {
  try {
    const next = update(readVisitHistory());
    localStorage.setItem(visitHistoryKey, JSON.stringify(next));
    setVisitHistory(next);
  } catch (error) {
    message.textContent = "訪問履歴を保存できませんでした。";
    console.warn(error);
    return false;
  }

  refreshVisitViews();
  return true;
}

function refreshVisitViews() {
  for (const { castle, marker } of castleEntries) {
    const icon = isCastleVisited(castle.id) ? visitedIcons.get(castle.category) : unvisitedIcon;
    if (marker.options.icon !== icon) marker.setIcon(icon);
  }
  if (selectedCastle) updateDetailVisitStatus(selectedCastle.castle.id);
  renderCastleProgress();
  renderCastleList();
  renderVisitHistory();
}

function visitFields(form) {
  const data = new FormData(form);
  return { date: data.get("date"), memo: data.get("memo").trim() };
}

addVisitForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const entry = {
    id: crypto.randomUUID(),
    castleId: selectedCastle.castle.id,
    ...visitFields(addVisitForm)
  };
  if (saveVisitHistory((entries) => [...entries, entry], addVisitMessage)) {
    addVisitForm.reset();
    addVisitMessage.textContent = "訪問履歴を追加しました。";
  }
});

function renderVisitHistory() {
  const castleNames = new Map(castleEntries.map(({ castle }) => [castle.id, castle.name]));
  const sorted = [...visitHistory].reverse().sort((a, b) => b.date.localeCompare(a.date));

  historyList.replaceChildren(...sorted.map((entry) => {
    const item = historyItem.content.cloneNode(true);
    const name = castleNames.get(entry.castleId) ?? entry.castleId;
    item.querySelector("h4").textContent = name;
    const date = item.querySelector("time");
    date.dateTime = entry.date;
    date.textContent = entry.date;
    const memo = item.querySelector(".visit-history-memo");
    memo.textContent = entry.memo;
    memo.hidden = !entry.memo;

    const actions = item.querySelector(".visit-history-actions");
    const edit = item.querySelector(".edit-visit");
    const form = item.querySelector("form");
    edit.addEventListener("click", () => {
      form.elements.date.value = entry.date;
      form.elements.memo.value = entry.memo;
      actions.hidden = true;
      form.hidden = false;
      form.elements.date.focus();
    });
    form.querySelector(".cancel-visit").addEventListener("click", () => {
      form.hidden = true;
      actions.hidden = false;
      edit.focus();
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const fields = visitFields(form);
      if (saveVisitHistory((entries) => entries.map((saved) =>
        saved.id === entry.id ? { ...saved, ...fields } : saved
      ), historyMessage)) {
        historyMessage.textContent = "訪問履歴を更新しました。";
        historyMessage.focus();
      }
    });
    item.querySelector(".delete-visit").addEventListener("click", () => {
      if (!window.confirm(`${name}（${entry.date}）の訪問履歴を削除しますか？`)) return;
      if (saveVisitHistory((entries) => entries.filter((saved) => saved.id !== entry.id), historyMessage)) {
        historyMessage.textContent = "訪問履歴を削除しました。";
        historyMessage.focus();
      }
    });
    return item;
  }));

  historyEmpty.hidden = sorted.length > 0;
}

function renderCastleProgress() {
  const entries = [
    ["全体", castleEntries],
    ...Array.from(castleLayers.keys(), (category) => [
      category,
      castleEntries.filter(({ castle }) => castle.category === category)
    ])
  ];

  const stats = entries.map(([label, group]) => ({
    label,
    total: group.length,
    visited: group.filter(({ castle }) => isCastleVisited(castle.id)).length
  }));

  castleProgress.replaceChildren(...stats.map(({ label, total, visited }) => {
    const percent = total ? 100 * visited / total : 0;
    const item = document.createElement("div");
    const name = document.createElement("dt");
    const value = document.createElement("dd");
    const rate = document.createElement("span");
    const count = document.createElement("span");
    name.textContent = label;
    rate.className = "castle-progress-rate";
    rate.textContent = `${percent}%`;
    count.className = "castle-progress-count";
    count.textContent = `${visited} / ${total}城`;
    value.append(rate, count);
    item.append(name, value);
    return item;
  }));

  const [overall, regular, sequel] = stats;
  const unvisited = overall.total - overall.visited;
  progress100.style.flexGrow = regular.visited;
  progressZoku.style.flexGrow = sequel.visited;
  progressUnvisited.style.flexGrow = unvisited;
  progressUnvisitedCount.textContent = `${unvisited}城`;
}

function renderCastleList() {
  const query = castleSearch.value.trim().normalize("NFKC").toLowerCase();
  const results = document.createDocumentFragment();
  let count = 0;

  for (const { castle, marker } of castleEntries) {
    const state = isCastleVisited(castle.id) ? "visited" : "unvisited";
    if (query && !castle.name.normalize("NFKC").toLowerCase().includes(query)) continue;
    if (categoryFilter.value && castle.category !== categoryFilter.value) continue;
    if (prefectureFilter.value && castle.prefecture !== prefectureFilter.value) continue;
    if (statusFilter.value && state !== statusFilter.value) continue;

    const item = castleListItem.content.cloneNode(true);
    item.querySelector(".castle-list-name").textContent = castle.name;
    item.querySelector(".castle-list-location").textContent = `${castle.prefecture}${castle.municipality}`;
    item.querySelector(".castle-list-category").textContent = `${castle.category}・第${castle.official_number}番`;

    const badge = item.querySelector(".castle-list-visit-status");
    const isVisited = state === "visited";
    badge.dataset.state = state;
    if (isVisited && castle.category === "続日本100名城") {
      badge.classList.add("castle-list-visit-status--zoku");
    }
    badge.querySelector(".castle-list-visit-icon").textContent = isVisited ? "✓" : "○";
    badge.querySelector(".castle-list-visit-label").textContent = isVisited ? "訪問済み" : "未訪問";

    const button = item.querySelector("button");
    button.setAttribute("aria-label", `${castle.name}を地図で見る`);
    button.addEventListener("click", () => {
      const { filter, updateLayer } = castleLayers.get(castle.category);
      filter.checked = true;
      updateLayer();
      mapTab.click();
      marker.fire("click");
      map.invalidateSize({ pan: false });
      map.setView(marker.getLatLng(), Math.max(map.getZoom(), 8), { animate: false });
      window.scrollTo(0, 0);
    });
    results.append(item);
    count += 1;
  }

  castleList.replaceChildren(results);
  castleListStatus.textContent = count ? `${count}城を表示` : "条件に一致する城はありません。";
}

// =========================
// 訪問データのバックアップ
// =========================

const backupVersion = 1;
const backupMessage = document.getElementById("backup-message");
const backupFile = document.getElementById("backup-file");
const importBackupForm = document.getElementById("import-backup");

document.getElementById("export-backup").addEventListener("click", () => {
  try {
    const backup = {
      version: backupVersion,
      visitedCastles: [...readVisitedCastles()],
      visitHistory: readVisitHistory()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "castle-travel-backup.json";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    backupMessage.textContent = "バックアップのダウンロードを開始しました。";
  } catch (error) {
    backupMessage.textContent = "バックアップを書き出せませんでした。";
    console.warn(error);
  }
});

function isCastleBackup(backup) {
  return backup?.version === backupVersion &&
    Array.isArray(backup.visitedCastles) &&
    backup.visitedCastles.every((id) => typeof id === "string" && id.length > 0) &&
    isVisitHistory(backup.visitHistory) &&
    backup.visitHistory.every(({ id, castleId, date }) => {
      const parsed = new Date(date);
      return id.length > 0 && castleId.length > 0 && date >= "0001-01-01" &&
        Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
    });
}

function mergeCastleBackup(backup) {
  const previousVisited = localStorage.getItem(visitedCastlesKey);
  const visited = readVisitedCastles();
  const history = new Map(readVisitHistory().map((entry) => [entry.id, entry]));
  const previousVisitedCount = visited.size;
  const previousHistoryCount = history.size;

  for (const id of backup.visitedCastles) visited.add(id);
  for (const { id, castleId, date, memo } of backup.visitHistory) {
    if (!history.has(id)) history.set(id, { id, castleId, date, memo });
  }
  const entries = [...history.values()];

  localStorage.setItem(visitedCastlesKey, JSON.stringify([...visited]));
  try {
    localStorage.setItem(visitHistoryKey, JSON.stringify(entries));
  } catch (error) {
    // 履歴の保存に失敗した場合は、先に書き込んだ訪問済み設定も元に戻す。
    if (previousVisited === null) {
      localStorage.removeItem(visitedCastlesKey);
    } else {
      localStorage.setItem(visitedCastlesKey, previousVisited);
    }
    throw error;
  }

  visitedCastles = visited;
  setVisitHistory(entries);
  refreshVisitViews();
  return { visited: visited.size - previousVisitedCount, history: history.size - previousHistoryCount };
}

importBackupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = backupFile.files[0];
  if (!file) return;

  const submitButton = importBackupForm.querySelector("button");
  submitButton.disabled = true;
  backupMessage.textContent = "";
  try {
    const backup = JSON.parse(await file.text());
    if (!isCastleBackup(backup)) {
      backupMessage.textContent = "対応する城巡りのバックアップファイルを選んでください。";
      return;
    }

    const added = mergeCastleBackup(backup);
    backupMessage.textContent = added.visited || added.history
      ? `読み込み完了。訪問済みの設定 ${added.visited}件、訪問履歴 ${added.history}件を追加しました。`
      : "読み込み完了。追加する記録はありませんでした。";
  } catch (error) {
    backupMessage.textContent = error instanceof SyntaxError
      ? "JSONファイルを読み込めませんでした。"
      : "バックアップを取り込めませんでした。";
    console.warn(error);
  } finally {
    importBackupForm.reset();
    submitButton.disabled = false;
  }
});

// =========================
// 城データの読み込みと各画面の初期表示
// =========================

fetch("data/castle.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error("城データの読み込みに失敗しました");
    }
    return response.json();
  })
  .then((castles) => {
    castleEntries = castles.map((castle) => {
      const marker = L.marker([castle.latitude, castle.longitude], {
        icon: isCastleVisited(castle.id) ? visitedIcons.get(castle.category) : unvisitedIcon,
        title: castle.name
      }).addTo(castleLayers.get(castle.category).layer);

      marker.on("click", () => {
        selectedCastle = { castle, marker };
        castleName.textContent = castle.name;
        castleCategory.textContent = castle.category;
        castleNumber.textContent = castle.official_number;
        castleLocation.textContent = `${castle.prefecture}${castle.municipality}`;
        updateDetailVisitStatus(castle.id);
        addVisitForm.reset();
        addVisitMessage.textContent = "";
        castleDetail.hidden = false;
        castleName.focus({ preventScroll: true });
      });
      return { castle, marker };
    });

    const prefectures = new Set(castles.map((castle) => castle.prefecture));
    for (const prefecture of prefectures) {
      prefectureFilter.add(new Option(prefecture));
    }

    castleSearch.addEventListener("input", renderCastleList);
    for (const filter of [categoryFilter, prefectureFilter, statusFilter]) {
      filter.addEventListener("change", renderCastleList);
    }
    renderCastleProgress();
    castleProgress.parentElement.hidden = false;
    renderCastleList();
    renderVisitHistory();
  })
  .catch((error) => {
    castleListStatus.textContent = "城データを読み込めませんでした。";
    console.error("城データの読み込みエラー:", error);
  });
