# SimpleUI — BeautifulUI v6.0

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

## Что важно понять про v6

- Все хоткеи игнорируются, пока фокус в любом `TextBox` (поиск, ввод и т. д.).
- Ошибка в вашем колбэке больше не ломает интерфейс — она уходит в `warn`.
- Перетаскивание и хоткеи обслуживают два общих менеджера на всю библиотеку,
  а не по три подключения на каждый элемент (было главной утечкой v5).
- График рисуется через пул объектов: нет `Instance.new`/`Destroy` на каждый кадр.
- Слайдеры/тумблеры/графики восстанавливают состояние через `:Set(...)` — в v5
  это ломалось из-за обращения к `api` до его объявления.
