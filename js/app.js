
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

// JSONファイルから城データを読み込む
fetch("data/castle.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error("城データの読み込みに失敗しました");
    }
    return response.json();
  })
  .then((castles) => {

    // 城データを1件ずつ処理
    castles.forEach((castle) => {

      // 緯度・経度を使ってマーカーを配置
      L.marker([castle.latitude, castle.longitude])
        .addTo(map)
        .bindPopup(
          `<strong>${castle.name}</strong><br>${castle.prefecture}<br>${castle.category}`
        );

    });

    console.log(`${castles.length}城のマーカーを表示しました`);

  })
  .catch((error) => {
    console.error("城データの読み込みエラー:", error);
  });