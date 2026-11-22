
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
const map = L.map("map").setView([36.5, 137.5], 5);

// 地図のタイル画像を読み込む
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// =========================
// 城のマーカー表示
// =========================

// 区分ごとにマーカーをまとめ、チェック状態に合わせて地図に表示する
const castleLayers = new Map();

document.querySelectorAll(".map-filters input").forEach((filter) => {
  const layer = L.layerGroup();
  castleLayers.set(filter.value, layer);

  function updateLayer() {
    if (filter.checked) {
      layer.addTo(map);
    } else {
      layer.remove();
    }
  }

  filter.addEventListener("change", updateLayer);
  updateLayer();
});

const unvisitedIcon = L.divIcon({
  className: "castle-marker",
  html: '<div class="castle-marker-dot"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});
fetch("data/castle.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error("城データの読み込みに失敗しました");
    }
    return response.json();
  })
  .then((castles) => {
    castles.forEach((castle) => {
      L.marker([castle.latitude, castle.longitude], { icon: unvisitedIcon })
        .bindPopup(
          `<strong>${castle.name}</strong><br>${castle.prefecture}<br>${castle.category}`
        )
        .addTo(castleLayers.get(castle.category));
    });
  })
  .catch((error) => {
    console.error("城データの読み込みエラー:", error);
  });