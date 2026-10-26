# LeafView Custom — Tauri Edition

**Актуальная стабильная версия: `v0.1.2 HF5` (Windows 11, x64).**

Неофициальная адаптация просмотрщика [LeafView](https://github.com/sprout2000/leafview) для Windows на **Tauri 2 + Rust + React + TypeScript + Leaflet**, без Electron runtime. Сохранена лицензия MIT и указание первоначального автора — sprout2000.

## Возможности

- При запуске окно **развёрнуто** на весь рабочий экран, с сохранением нативного заголовка Windows. `F11` переключает настоящий полноэкранный режим.
- Нижняя панель появляется, когда курсор подходит ближе чем на **64 пикселя** к нижнему краю, и остаётся видимой в пределах **128 пикселей**.
- Перелистывание изображений без анимаций Leaflet; предварительная декодировка перед сменой отображаемого слоя.
- Имя изображения и счётчик в заголовке окна; стрелки переключают изображения без зацикливания.
- Масштабирование, перемещение, миниатюры, контекстное меню, `Ctrl+O`, drag-and-drop, удаление с подтверждением в Корзину Windows.
- **Регистрация в Windows 11**: `REGISTER-LEAFVIEW.cmd` добавляет приложение в список доступных просмотрщиков; `UNREGISTER-LEAFVIEW.cmd` удаляет регистрацию. Поддерживаются BMP, GIF, ICO, JPEG, JPG, PNG, SVG и WebP.

## Установка и запуск

Откройте [Releases](https://github.com/TraurigerEngel/LeafView-Custom-Tauri/releases), скачайте архив **Windows x64 Portable ZIP**, распакуйте его в **постоянную папку** и запустите `LeafView Custom Tauri.exe`.

Для регистрации форматов нужны `REGISTER-LEAFVIEW.cmd` и папка `scripts` из полного Portable ZIP (оба включены в архив). Windows 11 требует вручную выбрать LeafView в **Параметры → Приложения → Приложения по умолчанию**. Скрипт не изменяет защищённый `UserChoice` и не требует прав администратора. См. [FILE-ASSOCIATIONS-RU.md](FILE-ASSOCIATIONS-RU.md). **Не перемещайте EXE после регистрации**, иначе ассоциации могут перестать работать.

Windows 11 обычно уже содержит Microsoft Edge WebView2 Runtime. EXE не имеет цифровой подписи; возможно предупреждение SmartScreen.

## Сборка из исходников (Windows 11)

Нужны Node.js 22, Rust stable (`x86_64-pc-windows-msvc`), MSVC Build Tools и Windows SDK.

```powershell
npm ci
.\BUILD-PORTABLE-ONLY.cmd
```

Либо: `npm test`, `cargo test --manifest-path src-tauri/Cargo.toml`, `npm run tauri -- build --no-bundle`.

Итоговый EXE: `src-tauri/target/release/LeafView Custom Tauri.exe`.

## Проверки стабильной версии

- HF5: 19/19 JS-тестов, TypeScript/Vite и Tauri Release успешно собраны на Windows 11.
- Пользователь подтвердил: появление нижней панели, переключение изображений без анимации, развёрнутое окно и `F11`.
- HF4: пользователь подтвердил регистрацию просмотрщика в Windows; назначение по умолчанию задаётся в системных настройках.
- В HF3 были проверены кнопка «Открыть…» и `Ctrl+O`.

[Подробные сведения](README-RU.md) · [История релиза](RELEASE_NOTES.md) · [Лицензия MIT](LICENSE.md).
