
// =========================
// 画面切り替え機能
// =========================

const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

// ナビゲーションをクリックしたとき
navItems.forEach((item) => {
  item.addEventListener("click", () => {

    // 選択された画面のIDを取得
    const targetPage = item.dataset.page;

    // すべての画面を非表示にする
    pages.forEach((page) => {
      page.classList.remove("active");
    });

    // 選択された画面だけ表示
    document.getElementById(targetPage).classList.add("active");

    // ナビゲーションの選択状態を更新
    navItems.forEach((nav) => {
      nav.classList.remove("active");
    });

    item.classList.add("active");
  });
});

// =========================
// 地図表示機能
// =========================

// 地図を作成
const mapElement = document.getElementById("map");
const map = L.map(mapElement).setView([36.5, 137.5], 5);
const mapResizeObserver = new ResizeObserver(() => {
  if (mapElement.clientWidth && mapElement.clientHeight) {
    map.invalidateSize();
  }
});
mapResizeObserver.observe(mapElement);

// 地図のタイル画像を読み込む
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// =========================
// 城のマーカー表示
// =========================

// 区分ごとにマーカーをまとめ、チェック状態に合わせて地図に表示する
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
const castleDetail = document.getElementById("castle-detail");
const castleName = document.getElementById("castle-detail-name");
const castleCategory = document.getElementById("castle-detail-category");
const castleNumber = document.getElementById("castle-detail-number");
const castleLocation = document.getElementById("castle-detail-location");
const visitStatus = document.getElementById("castle-visit-status");
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
    visited: group.filter(({ castle }) => visitedCastles.has(castle.id)).length
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
    const state = visitedCastles.has(castle.id) ? "visited" : "unvisited";
    if (query && !castle.name.normalize("NFKC").toLowerCase().includes(query)) continue;
    if (categoryFilter.value && castle.category !== categoryFilter.value) continue;
    if (prefectureFilter.value && castle.prefecture !== prefectureFilter.value) continue;
    if (statusFilter.value && state !== statusFilter.value) continue;

    const item = castleListItem.content.cloneNode(true);
    item.querySelector(".castle-list-name").textContent = castle.name;
    item.querySelector(".castle-list-location").textContent = `${castle.prefecture}${castle.municipality}`;
    item.querySelector(".castle-list-category").textContent = `${castle.category}・第${castle.official_number}番`;
    item.querySelector(".castle-list-visit-status").textContent = state === "visited" ? "訪問済み" : "未訪問";
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
        icon: visitedCastles.has(castle.id) ? visitedIcons.get(castle.category) : unvisitedIcon,
        title: castle.name
      }).addTo(castleLayers.get(castle.category).layer);

      marker.on("click", () => {
        selectedCastle = { castle, marker };
        castleName.textContent = castle.name;
        castleCategory.textContent = castle.category;
        castleNumber.textContent = castle.official_number;
        castleLocation.textContent = `${castle.prefecture}${castle.municipality}`;
        visitStatus.value = visitedCastles.has(castle.id) ? "visited" : "unvisited";
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
  })
  .catch((error) => {
    castleListStatus.textContent = "城データを読み込めませんでした。";
    console.error("城データの読み込みエラー:", error);
  });