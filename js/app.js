
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
  castleLayers.set(filter.value, layer);

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

fetch("data/castle.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error("城データの読み込みに失敗しました");
    }
    return response.json();
  })
  .then((castles) => {
    castles.forEach((castle) => {
      const marker = L.marker([castle.latitude, castle.longitude], {
        icon: visitedCastles.has(castle.id) ? visitedIcons.get(castle.category) : unvisitedIcon,
        title: castle.name
      }).addTo(castleLayers.get(castle.category));

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
    });
  })
  .catch((error) => {
    console.error("城データの読み込みエラー:", error);
  });