# Uygulama Planı — Pioneer Derby

Her faz bağımsız, test edilebilir bir çıktı üretir. Faz bitince: `npm run verify` yeşil → checkbox işaretlenir → commit.
Çalıştırma: Claude Code içinde `/phase 0`, `/phase 1` … (veya "Faz 2'yi yap").

İlgili dokümanlar: [REQUIREMENTS.md](./REQUIREMENTS.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [ADR'ler](./adr/README.md)

Prensip: **önce MVP kusursuz (Faz 0–5), sonra fark yaratan katmanlar (Faz 6–8).**

---

## Faz 0 — Proje iskeleti & kalite altyapısı
- [ ] `.nvmrc`, `.editorconfig` (git/remote kullanıcı tarafından bağlanır)
- [ ] Vite + Vue 3 + TS projesi (`create-vue`: TS, Pinia, Vitest, Playwright, ESLint, Prettier)
- [ ] Demo dosyalarını temizle, klasör yapısını kur (ARCHITECTURE §3)
- [ ] Path alias `@/`, strict TS
- [ ] Mimari sınır kontrolü: `eslint-plugin-boundaries` (domain → Vue/Pinia import edemez) · X7
- [ ] `vue-i18n` kurulumu, `tr` / `en` locale dosyaları, tarayıcı dilinden otomatik seçim · X9
- [ ] Sass + design token'ları (açık/koyu tema)
- [ ] npm scripts: `dev`, `build`, `preview`, `lint`, `format`, `type-check`, `test:unit`, `test:coverage`, `test:e2e`, `test:visual`, `simulate`, `report:traceability`, `verify`
- [ ] Temel GitHub Actions CI: lint + type-check + unit (PR ve push'ta) · X6
- **Çıktı:** boş ama çalışan app, CI yeşil.

## Faz 1 — Domain katmanı (saf TS) · R2, R3, C1–C6
- [ ] `constants.ts`, `types.ts`
- [ ] `random.ts` (seeded RNG, shuffle, sample)
- [ ] `horses.ts` → 20 at, 20 benzersiz renk, kondisyon 1–100, pioneer isimleri
- [ ] `schedule.ts` → 6 tur, her turda 20'den rastgele 10 farklı at, mesafeler
- [ ] `race-engine.ts` → hız profili, `positionAt`, bitiş sırası (deterministik)
- [ ] `stats.ts` → at bazlı istatistik (koştuğu tur, ortalama sıra, galibiyet)
- [ ] Unit testler — test isimlerinde gereksinim ID'si: `[C5] ...` · X3
- [ ] Property-based testler (fast-check): her seed için tüm kurallar · X2
- **Çıktı:** UI olmadan tüm oyun mantığı test edilmiş.

## Faz 2 — State management (Pinia) & servisler · T1, R4, R5
- [ ] `horses.store`, `schedule.store`, `race.store` (durum makinesi)
- [ ] generate / start / pause / resume / next-round / finish aksiyonları
- [ ] Getter'lar: currentRound, completedResults, canGenerate, canToggle
- [ ] Seed yönetimi: `?seed=` okuma/yazma · X11
- [ ] Analytics event katmanı: tipli `AnalyticsClient` arayüzü + console/panel adapter · X5
- [ ] Store unit testleri (sahte saat ile)
- **Çıktı:** oyun store üzerinden uçtan uca çalışıyor.

## Faz 3 — Shared UI, layout, i18n & erişilebilirlik · T2, responsive
- [ ] `BaseButton`, `BasePanel`, `BaseTable`, `BaseBadge`, `BaseTabs`
- [ ] `AppHeader` (Generate Program + Start/Pause + dil + tema), `ResponsiveLayout`, `MobileTabBar`
- [ ] Breakpoint'ler, `useMediaQuery`, `useReducedMotion`
- [ ] Dil seçici TR/EN (localStorage'da kalıcı), sıra sayıları/metre formatı locale'e göre · X9
- [ ] Klavye kısayolları: `G` generate, `Space` start/pause, `?` yardım · X8
- **Çıktı:** responsive iskelet, iki dilde, klavyeyle kullanılabilir.

## Faz 4 — Özellik bileşenleri · R2, R3, R5
- [ ] `HorseList` (Name / Condition / Color, kondisyon barı, renk swatch)
- [ ] `ProgramPanel` + `RoundTable` (6 tur, "1st Lap – 1200m" / "1. Tur – 1200m")
- [ ] `ResultsPanel` + `RoundResultTable` (tur bittikçe sırayla, `aria-live`)
- [ ] Component testleri
- **Çıktı:** generate ile liste + program dolu, sonuç paneli hazır.

## Faz 5 — Pist & animasyon (performans odaklı) · R4, R6
- [ ] `RaceTrack`, `TrackLane`, `HorseRunner` (renkli SVG at silueti), `FinishLine`
- [ ] `useRaceLoop` (requestAnimationFrame, pause/resume, hız çarpanı 1×/2×/4×)
- [ ] Pozisyonlar Pinia'ya **her karede yazılmaz**; saat + `positionAt` ile hesaplanır · X10
- [ ] Sadece `transform` animasyonu, galop efekti, reduced-motion modu
- [ ] Turlar arası kısa ara, alt etiket "2nd Lap 1400m"
- **Çıktı:** ✅ MVP tamam — PDF'teki tüm zorunlu maddeler karşılanıyor.

## Faz 6 — Ürün katmanı (Insider'a özel) · X4, X5, X11, X12
- [ ] **Kazananı tahmin et**: her turdan önce tahmin, puan sistemi, toplam skor · X4
- [ ] **Önerilen at**: kondisyon + önceki turlardaki forma göre öneri ve kısa gerekçe · X4
- [ ] Event'ler: `program_generated`, `race_started`, `race_paused`, `round_finished`, `prediction_made`, `prediction_result`, `language_changed` · X5
- [ ] Event debug paneli (geliştirici modu, `?debug=1`) · X5
- [ ] **Replay & paylaşım**: "Linki kopyala" (`?seed=`), aynı yarışı tekrar izle · X11
- [ ] **At istatistikleri**: drawer/modal — koştuğu turlar, ortalama sıra, form grafiği · X12
- [ ] Canlı sıralama, photo-finish efekti, podyum, spiker şeridi (TR/EN) · X13
- **Çıktı:** ürün düşüncesi gösteren, ayırt edici deneyim.

## Faz 7 — Kanıt katmanı (testler & ölçümler) · B1, B2, B3, X1–X3, X8, X10
- [ ] **Adalet simülasyonu**: `npm run simulate` → 10.000 seed'li yarış, kondisyon → kazanma oranı · X1
- [ ] Simülasyon çıktısından grafik (SVG) + README'ye tablo · X1
- [ ] İstatistiksel test: kondisyon arttıkça ortalama sıralama iyileşir (monoton) · X1
- [ ] Property-based testleri tamamla (store geçişleri dahil) · X2
- [ ] Unit coverage: domain ≥ %95, store ≥ %90
- [ ] Playwright E2E: tam oyun akışı, pause/resume, generate kuralları, dil değişimi, tahmin akışı
- [ ] Erişilebilirlik testi: `@axe-core/playwright`, sıfır ciddi ihlal · X8
- [ ] Visual testler: desktop / tablet / mobil × açık / koyu × TR / EN
- [ ] Performans kanıtı: Playwright ile FPS/long-task ölçümü + trace ekran görüntüsü · X10
- [ ] `npm run report:traceability` → test isimlerindeki ID'lerden "Gereksinim → Test → ✅" tablosu · X3
- **Çıktı:** her iddia ölçülmüş ve kanıtlanmış.

## Faz 8 — Teslim · X6, X14
- [ ] Tam CI: lint, type-check, coverage, E2E, visual, axe, Lighthouse CI, bundle boyut bütçesi · X6
- [ ] README badge'leri (CI, coverage, Lighthouse)
- [ ] ADR'leri tamamla (`docs/adr/`) · X14
- [ ] README: demo linki, GIF, mimari diyagram, kararlar, adalet grafiği, izlenebilirlik tablosu, nasıl çalıştırılır
- [ ] Deploy (Vercel / Netlify / GitHub Pages) — CI'dan otomatik
- [ ] Son review: `/review-case`
- **Çıktı:** gönderime hazır proje.

---

## Sürekli kurallar (her fazda)
- Küçük, anlamlı Conventional Commit'ler (faz başına birkaç commit) · X15
- Yeni bir mimari karar → `/adr` ile kayıt
- Tüm UI metinleri i18n'den; hard-coded string yok

## Akış

```
Faz 0 iskelet+CI ─▶ 1 domain ─▶ 2 store+servis ─▶ 3 layout+i18n+a11y ─▶ 4 paneller ─▶ 5 pist (MVP ✅)
                                                                                         │
                    Faz 8 teslim ◀── Faz 7 kanıt katmanı ◀── Faz 6 ürün katmanı ◀────────┘
```
