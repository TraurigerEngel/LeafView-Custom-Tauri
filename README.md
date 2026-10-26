# LeafView Custom — Tauri Edition

**Стабильная контрольная версия:** `v0.1.2 HF3 (Open Button Fix)` — Windows 11 / x64.

Неофициальная версия просмотрщика изображений [LeafView](https://github.com/sprout2000/leafview) на базе Tauri 2, Rust, React, TypeScript и Leaflet. Приложение не является официальным релизом исходного проекта. Сохранена лицензия MIT и указание первоначального автора — sprout2000.

## Возможности

- Нижняя панель инструментов скрыта и появляется при подведении курсора к нижнему краю окна.
- Имя файла и счётчик изображений отображаются в нативном заголовке Windows.
- Навигация стрелками без перехода по кругу, масштабирование и перемещение изображения.
- Миниатюры, контекстное меню, открытие через «Открыть…» и `Ctrl+O`, drag-and-drop.
- `Esc` закрывает окно; удаление требует подтверждения и перемещает файл в Корзину Windows.
- При переключении изображений используется предварительная декодировка; карта Leaflet не должна пересоздаваться.
- Русскоязычный тёмный интерфейс; Electron runtime не требуется.

## Скачать и запустить

Откройте раздел **Releases**, выберите `v0.1.2-hf3`, скачайте `Windows_x64_Portable.zip`, распакуйте и запустите `LeafView Custom Tauri.exe`. На компьютере необходим Microsoft Edge WebView2 Runtime (обычно уже установлен в Windows 11). Приложение пока не подписано цифровой подписью; возможны предупреждения Windows SmartScreen.

Portable-версия не устанавливает ассоциации файлов автоматически. Для открытия изображения двойным щелчком используйте Windows «Открыть с помощью».

## Сборка из исходников (Windows 11)

Требуются Node.js 22, Rust stable с target `x86_64-pc-windows-msvc`, Visual Studio C++ Build Tools и Windows SDK.

```powershell
npm ci
.\BUILD-PORTABLE-ONLY.cmd
```

Или раздельно:

```powershell
npm test
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri -- build --no-bundle
```

Результат: `src-tauri/target/release/LeafView Custom Tauri.exe`.

Для установщика NSIS доступен `BUILD-WINDOWS.cmd`; наличие успешного NSIS-артефакта для HF3 пока **не подтверждено**.

## Проверки v0.1.2 HF3

- JS-тесты: **12/12**.
- Rust unit-тесты: **2/2**.
- TypeScript, Vite и релизная сборка Tauri на Windows 11 — успешно.
- Ручная проверка: кнопка «Открыть…» и `Ctrl+O` работают. Основные 8 сценариев ранее проверялись на HF2; полный повторный ручной прогон после HF3 не заявляется.

Подробная история и ограничения: [README-RU.md](README-RU.md). Состав релиза: [RELEASE_NOTES.md](RELEASE_NOTES.md).

## Лицензия

MIT, исходное уведомление об авторстве сохранено в [LICENSE.md](LICENSE.md): © 2020–2026 sprout2000.
