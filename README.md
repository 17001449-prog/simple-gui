# SimpleUI — BeautifulUI v6.3

Один файл `SimpleUI.txt` — UI-библиотека для Roblox (Luau). Вставьте содержимое в `ModuleScript`
или загружайте строкой:

```lua
local BeautifulUI = loadstring(game:HttpGet("ВАШ_URL/SimpleUI.txt"))()
```

## Быстрый старт

```lua
local win = BeautifulUI:CreateWindow({
    Title = "My Hub",       -- заголовок
    Subtitle = "v1.0",      -- подзаголовок (по умолчанию версия библиотеки)
    Theme = "Cyber",        -- Purple | Blue | Red | Green | Orange | Pink |
                            -- Cyber | Mono | Discord | Dracula | Nord
    Icon = "⚡",            -- иконка окна и кнопки вызова
    ToggleKey = Enum.KeyCode.RightShift,
    ShowConfig = true,      -- кнопки 💾/📂 в сайдбаре
    Backdrop = false,       -- затемнение фона под окном
    Compact = nil,          -- true/false — принудительный компактный режим
    Size = UDim2.new(0, 780, 0, 580), -- базовый размер (дальше сам подстроится)
})

local tab = win:Tab("Main", "🏠")

tab:Button("Привет", function()
    BeautifulUI:Toast("Кнопка нажата!", "Success")
end, "Gradient", "🚀")

tab:Toggle("Автофарм", false, function(v) print(v) end, "AutoFarm")
tab:Slider("Скорость", 0, 100, 25, function(v) print(v) end, "Speed")
tab:Hint("Настройки сохраняются кнопкой 💾 в левом нижнем углу")
```

## Компоненты вкладки

| Метод | Описание |
|---|---|
| `Button(text, callback, style, icon)` | стили: `Primary`, `Success`, `Danger`, `Warning`, `Gradient`, `Ghost`, `Outline` |
| `Toggle(text, default, callback, flag)` | тумблер |
| `InfoToggle(text, description, default, callback, flag)` | тумблер с подписью |
| `Slider(text, min, max, default, callback, flag)` | слайдер с ползунком |
| `InputSlider(...)` | слайдер + поле ввода числа |
| `Input(text, placeholder, callback, flag)` | текстовое поле |
| `Dropdown(text, options, callback, flag)` | выпадающий список со скроллом (>5 опций) |
| `ColorPicker(text, default, callback, flag)` | HSB-палитра + HEX |
| `Keybind(text, default, callback, flag)` | привязка клавиши |
| `ProgressBar(text, max)` | `:Set(v)`, `:Get()` |
| `Graph(text, type, height)` | `line`, `area`, `bar`; `:AddPoint()`, `:SetData()`, `:SetRange()`, `:SetAutoRange()`, `:SetColor()`, `:SetMaxPoints()`, `:Clear()`, `:GetData()` |
| `Label(text, color)` · `Paragraph(text)` · `Separator()` | текст |
| `Status(label, value, type)` | значение-статус в чипе (`Success`/`Danger`/`Warning`/`Info`) |
| `Hint(text)` | неброская подсказка |
| `Badge(count)` | счётчик на самой вкладке в сайдбаре |
| `ConfigButtons()` | кнопки «Сохранить/Загрузить» внутри вкладки |
| `RegisterSearchText(text)` | добавить свои слова в поиск |
| `Image(id, height, frames, fps)` · `ImageButton(...)` · `TextPanel{...}` | картинки и «диалоговые» панели |
| `SubTab(name, icon)` | сворачиваемая группа (`:Button`, `:Toggle`, `:Slider`, `:Label`) |
| `ThemeEditor()` | встроенный редактор палитры с пресетами |

## Управление окном

```lua
win:Show() / win:Hide() / win:Toggle() / win:IsVisible()
win:SelectTab("Main")   -- или индексом: win:SelectTab(1)
win:SetTitle("Новое название", "подзаголовок")
win:SetSize(900, 600)
win:SetToggleKey(Enum.KeyCode.Insert)
win:Center()
win:Destroy()
```

## Уведомления и диалоги

```lua
BeautifulUI:Notify("Заголовок", "Текст", 3, "Success")
BeautifulUI:Toast("Коротко и по делу", "Info")
BeautifulUI:Notify("Удалить?", "Действие необратимо", 5, "Warning", {
    {Text = "Да", Color = "#F05050", Callback = function() end},
    {Text = "Нет"},
})
BeautifulUI:DialogBox({Text = "Привет, мир!", Speaker = "Гид", Duration = 5})
```

Уведомление закрывается кликом по ✕, таймер ставится на паузу при наведении,
одновременно показывается не больше пяти.

## Темы и цвета

```lua
BeautifulUI:SetTheme("Nord")
BeautifulUI:SetColor("Accent", "#00FFDC")
BeautifulUI:GetThemeHex()                     -- таблица HEX
BeautifulUI:CreateCustomTheme("My", {Accent = "#FF0066"})

BeautifulUI:ApplyGradientPreset(frame, "Sunset")     -- 30 пресетов
BeautifulUI:ApplyAnimationPreset(frame, "Breath")    -- 15 пресетов
BeautifulUI:ApplyCustomPalette(frame, "Fire")
-- вызовы работают и через ":", и через "."
```

## Анимации

`Rainbow`, `Breathe`, `CycleColors`, `Sparkle`, `WaveColor`, `AnimatedColor`,
`AnimatedGradient`, `AnimatedImage`, `CustomAnimatedColor`, `StopAnimation`.

```lua
BeautifulUI.Rainbow(frame, "BackgroundColor3", 0.2)
BeautifulUI:PauseAnimations(true)   -- остановить всё (например, при сворачивании)
print(BeautifulUI.GetAnimationCount()) -- сколько анимаций живо
```

Анимации у невидимых элементов не тикают, поэтому скрытое окно не ест кадры.

## Конфиг, поиск, прочее

```lua
BeautifulUI:SetConfigPath("MyHub.json")
BeautifulUI:SaveConfig() / BeautifulUI:LoadConfig() / BeautifulUI:DeleteConfig()

BeautifulUI:HideAll() / BeautifulUI:ShowAll() / BeautifulUI:ToggleAll()
BeautifulUI:IsOnMobile()
BeautifulUI:RegisterPlaceholder("mykey", function() return "значение" end)
```

Debug-консоль (F10) доступна только тем, кого вы добавили:

```lua
table.insert(BeautifulUI.DebugUsers, "МойНик")
BeautifulUI.BuiltInDebug = "МойНик"  -- по умолчанию пусто
```

## 💬 Discord-интеграция

```lua
BeautifulUI:SetDiscord({Invite = "мойсервер", Name = "My Hub", Reminder = 300})

local win = BeautifulUI:CreateWindow({
    Title = "My Hub",
    Discord = true,   -- кнопка 💬 в шапке + виджет в сайдбаре + напоминание
})
```

Что делает модуль:
- **Кнопка в шапке** — открывает карточку с инвайтом и копирует ссылку в буфер.
- **Виджет в сайдбаре** — показывает название сервера и «N онлайн · M участников»,
  если вы задали источник статистики (см. ниже).
- **Напоминание** — через `Reminder` секунд после запуска предлагает вступить
  (кнопки «Вступить»/«Позже»; при `Remember = true` больше не напоминает).

Статистика сервера (необязательно) — укажите свой endpoint, возвращающий JSON:

```lua
-- ответ: {name = "My Hub", members = 12500, online = 3400}
BeautifulUI.DiscordEndpoint = function(invite)
    return "https://мой-сайт/api/invite/" .. invite
end
BeautifulUI:RefreshDiscord()
```

Без endpoint всё работает в «базовом» режиме: кнопка, копирование ссылки, напоминание.
Прямой запрос к Discord API из клиента невозможен (CORS + токен), поэтому цифры
подтягиваются только из вашего прокси — иначе виджет честно показывает инвайт.

## ⌨️ Полезные фичи

| Фича | Как пользоваться |
|---|---|
| **Палитра команд** | `Ctrl+K` — поиск по всем настройкам хаба; `Enter` переходит на нужную вкладку и подсвечивает элемент |
| **Памятка хоткеев** | `Ctrl+.` — тост со всеми клавишами (включая ваши, см. ниже) |
| **Сброс настроек** | `Ctrl+Shift+R` — сбрасывает тему, размер и позицию окна |
| **Автосохранение раскладки** | позиция/размер/активная вкладка/тема пишутся сами в `<config>_prefs.json` |
| **Проверка обновлений** | `BeautifulUI:CheckForUpdates("URL/version.txt", true)` |
| **Экспорт конфига** | `BeautifulUI:ShowConfigSummary()` — читаемый список текущих значений |
| **Миграция флагов** | `BeautifulUI:MigrateConfig({rename = {Old = "New"}, remove = {"Dead"}})` |
| **Свои горячие клавиши в памятке** | `BeautifulUI:RegisterHotkey(Enum.KeyCode.X, "Автофарм")` |
| **Свои команды в палитре** | `BeautifulUI:RegisterCommand{Name = "Телепорт", Keywords = {"tp"}, Callback = function() end}` |
| **Инфо о сборке** | `BeautifulUI:GetBuildInfo()` → версия, тема, окна, команды, анимации |
| **Слежение за дискавери** | Discord-модуль выше |

Палитра и хоткеи не срабатывают, когда фокус в текстовом поле, так что они не мешают
поиску и вводу значений.

## 🅰️ Свой шрифт (Custom Font)

Весь интерфейс можно переключить на любой шрифт — встроенный `Enum.Font`, шрифт из
Marketplace по ID или собственный `.json`-ассет. Переключается на лету, вместе с
уже созданными элементами и закрытыми окнами.

```lua
-- в конфиге окна
local Window = BeautifulUI:CreateWindow({
    Title = "My Hub",
    Font = "GothamBlack",        -- имя Enum.Font, ID (12187365375) или "rbxasset://fonts/…"
    FontSizeScale = 1.15,        -- все тексты +15%
})

-- на лету, для всего интерфейса
BeautifulUI:SetCustomFont("PressStart2P")
BeautifulUI:SetCustomFont(12187365375, { SizeScale = 1.1, Bold = false })
BeautifulUI:SetCustomFont({ Family = "Code", Monospace = true })
BeautifulUI:ResetFont()          -- вернуть исходные шрифты и размеры
```

| Возможность | Детали |
|---|---|
| **Любой шрифт** | `FontFace` + `Font.new/fromId/fromEnum` — поддержаны ассеты Marketplace, а не только встроенные |
| **Масштаб текста** | `SizeScale` 0.8–1.4: `TextSize` пересчитывается от исходного, без «накопления» при повторных вызовах |
| **Сохранение жирности** | заголовки остаются жирными, подписи — обычными: жирность запоминается при создании элемента |
| **Моно-режим** | `Monospace = true` не трогает `Code`-надписи (HEX-поля, консоль) |
| **Образец** | `BeautifulUI:PreviewFont("Oswald")` — живой тест со всеми символами и кириллицей |
| **Fallback** | если клиент не умеет `FontFace`, автоматически переключается на `Enum.Font` (без ошибок) |
| **Инспектор** | `GetAvailableFonts()` — список шрифтов, `GetFontStats()` — сколько текстов под управлением |
| **Готовый экран** | `Tab:FontPicker({Default = "GothamBlack"})` — дропдаун, масштаб, своё ID, жирность, тест одной строкой |
| **Автосохранение** | выбранный шрифт пишется в `<config>_prefs.json` и восстанавливается при следующем запуске |

```lua
local Tab = Window:Tab("Шрифт", "🅰️")
local Fonts = Tab:FontPicker({ Default = "GothamBlack", OnChange = function(name)
    print("шрифт:", name)
end })
Fonts.Apply("Michroma")
Fonts.Reset()
```

## 🎨 UI-редактор (HTML)

В папке `ui-editor/` лежит визуальный редактор окна: собираешь интерфейс мышкой
и получаешь готовый Lua-код для этого файла. Никакой сборки и зависимостей.

**Как запустить:** дважды кликнуть по `ui-editor/index.html` — этого достаточно.
Подробная инструкция со всеми вариантами и разбором проблем:
**[`ui-editor/README.md`](ui-editor/README.md)**.

```bash
# вариант 2 — локальный сервер (автосохранение работает всегда)
node ui-editor/serve.mjs          # → http://localhost:8080/ui-editor/
node ui-editor/serve.mjs 3000     # другой порт
python3 -m http.server 8080       # если нет Node
```

Двойной клик работает потому, что редактор не обращается к сети: темы лежат
в `ui-editor/themes.js`, а не парсятся из `SimpleUI.txt` на лету. Нюанс Chrome:
на `file://` он может блокировать автосохранение — редактор честно предупредит
и предложит скачать `.lua`. Нужен Node 18+ только для `serve.mjs`/`sync-themes.mjs`.

Что умеет:

| Возможность | Детали |
|---|---|
| **Настройка окна** | заголовок, подзаголовок, иконка, тема, `Width`/`Height` → `Size = UDim2.fromOffset(...)` |
| **12+ типов элементов** | кнопка (7 стилей), тумблер, слайдер (шаг, суффикс), дропдаун (мультивыбор), поле ввода, заголовок, абзац, статус, подсказка, разделитель, colorpicker, keybind, прогресс-бар, график, subtab |
| **Палитра** | 13 цветов выбранной темы переопределяются по одному; правый клик — копировать HEX |
| **Вкладки** | добавить/переименовать/удалить, иконки, бейджи, drag-порядок стрелками |
| **Живое превью** | точная копия окна (сайдбар, вкладки, элементы), режим десктоп/мобильный, сетка |
| **Генератор Lua** | код с подсветкой, `Copy`, скачивание `.lua`, счётчик строк/КБ |
| **Импорт Lua** | вставь сгенерированный код обратно — окно, вкладки и элементы восстановятся (roundtrip) |
| **Discord / конфиг** | чекбоксы `ShowConfig`, `Backdrop`, `Compact`, инвайт → `SetDiscord` |
| **Автосохранение** | состояние живёт в `localStorage`, закрыл вкладку — вернулся к тому же проекту |

Генератор выдаёт ровно тот API, что есть в библиотеке (`Window:Tab`, `Tab:Button(text, cb, style, icon)`,
`Tab:Slider(text, min, max, default, cb, flag, {step, suffix})`, `Tab:Dropdown(text, options, cb, flag, {multi})`
и т.д.), поэтому код запускается без правок: достаточно подставить свой `URL` библиотеки
в поле «URL библиотеки (raw)».

Темы редактор не хардкодит, а берёт из этого файла:

```bash
node ui-editor/sync-themes.mjs   # перегенерирует ui-editor/themes.js из блока local Themes
```

## Совместимость с Rayfield

В репозитории есть `RayfieldCompat.lua` — слой, который превращает BeautifulUI
в замену Rayfield с сохранением знакомого API:

```lua
_G.BeautifulUI = loadstring(game:HttpGet("URL/SimpleUI.txt"))()
local Rayfield  = loadstring(game:HttpGet("URL/RayfieldCompat.lua"))()

local Window = Rayfield:CreateWindow({Name = "My Hub", KeySystem = false})
local Tab = Window:CreateTab("Main", 4483362458)  -- иконка эмодзи или asset id

Tab:CreateButton({Name = "Click", Callback = function() end})
Tab:CreateToggle({Name = "God", CurrentValue = true, Flag = "GodMode", Callback = function(v) end})
Tab:CreateSlider({Name = "Speed", Range = {16, 100}, Increment = 4, Suffix = "studs/s"})
Tab:CreateDropdown({Name = "Tool", Options = {"Sword","Bow"}, CurrentOption = "Sword"})
Tab:CreateDropdown({Name = "Multi", Options = {"A","B"}, MultipleOptions = true})
Tab:CreateKeybind({Name = "Bind", CurrentKeybind = "Q"})
Tab:CreateInput({Name = "Amount", NumbersOnly = true, CharacterLimit = 4})
Tab:CreateColorPicker({Name = "Color", Color = Color3.fromRGB(255,0,0)})
Tab:CreateSection("Раздел")
Tab:CreateParagraph({Title = "Важно", Content = "Текст"})
Rayfield:Notify({Title = "Загружено", Content = "Ок", Duration = 3})
```

Все элементы отдают `:Set()` / `:Get()` как в Rayfield.

**Что действительно поддержано:** окно, вкладки, секции, кнопки, тумблеры,
слайдеры (шаг/суффикс), дропдауны (включая мультивыбор), кейбинды, инпуты,
колорпикеры, абзацы/лейблы, уведомления (с `Actions`), `Rayfield:Destroy()`.

**Чего нет — честно:** `KeySystem` и `Discord` не воспроизводятся (окно открывается
сразу, Discord-кнопки нет), загрузочный экран (`LoadingTitle/Subtitle`) пропускается,
`Theme`-таблица маппится на ближайшую встроенную тему, а `ConfigurationSaving`
сохраняет один файл (`RayfieldCompat.json` / ваше имя), без множественных профилей.

## Что важно понять про v6

- Все хоткеи игнорируются, пока фокус в любом `TextBox` (поиск, ввод и т. д.).
- Ошибка в вашем колбэке больше не ломает интерфейс — она уходит в `warn`.
- Перетаскивание и хоткеи обслуживают два общих менеджера на всю библиотеку,
  а не по три подключения на каждый элемент (было главной утечкой v5).
- График рисуется через пул объектов: нет `Instance.new`/`Destroy` на каждый кадр.
- Слайдеры/тумблеры/графики восстанавливают состояние через `:Set(...)` — в v5
  это ломалось из-за обращения к `api` до его объявления.
