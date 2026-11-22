--[[
    ⚡ TEST HUB — демонстрационный UI на BeautifulUI v6.5
    ─────────────────────────────────────────────────────────
    Запуск: вставь в executor (или сохрани как .lua и выполни).
    Ссылка на библиотеку — ниже, замени на свою raw-ссылку.
    Всё, что здесь есть, покрывает: кнопки (все формы), тумблеры,
    слайдеры, дропдаун, ввод, цвет, кейбинд, прогресс, 7 типов
    графиков, легенду, статусы, подсказки, подразделы, уведомления.
]]

-- ═══ 1. Загрузка библиотеки ═══
local LIB_URL = "https://raw.githubusercontent.com/17001449-prog/simple-gui/refs/heads/arena/acdd1950-simple-gui/SimpleUI.txt"
local BeautifulUI = loadstring(game:HttpGet(LIB_URL))()

-- ═══ 2. Окно ═══
local Window = BeautifulUI:CreateWindow({
    Title = "Test Hub",
    Subtitle = "v" .. tostring(BeautifulUI.Version) .. " · демо",
    Theme = "Cyber",
    Icon = "⚡",
    ToggleKey = Enum.KeyCode.RightShift,
    ShowConfig = true,
    Size = UDim2.new(0, 820, 0, 600),
})

-- ═══ 3. Главная ═══
local Main = Window:Tab("Главная", "🏠")
Main:Badge(3)                      -- счётчик на вкладке в сайдбаре

Main:Status("Состояние", "Готов", "Success")
Main:Status("Сервер", "RU-3", "Info")
Main:Status("Пинг", "42 мс", "Warning")

Main:Paragraph("Это тестовый хаб: покрути элементы и посмотри, как всё отвечает. Правый Shift — скрыть/показать окно.")

local clicks = 0
Main:Button("Нажми меня", function()
    clicks = clicks + 1
    Main:Notify("Клики", "Нажато раз: " .. clicks, 2, "Success")
end, "Gradient", "🚀")

-- формы кнопок (v6.5) — все шесть
Main:Button{ Text = "Pill",     Callback = function() Main:Notify("Форма", "Pill — капсула", 2, "Info") end, Shape = "Pill",   Style = "Success" }
Main:Button{ Text = "Square",   Callback = function() Main:Notify("Форма", "Square — плотная", 2, "Info") end, Shape = "Square", Style = "Primary" }
Main:Button{ Text = "Sharp",    Callback = function() Main:Notify("Форма", "Sharp — без скругления", 2, "Info") end, Shape = "Sharp",  Style = "Ghost" }
Main:Button{ Text = "Широкая",  Callback = function() Main:Notify("Форма", "Wide — высокая", 2, "Info") end, Shape = "Wide",   Style = "Outline" }

Main:Hint("Кнопки-иконки ниже: Circle, 40×40")

local state = Main:Toggle("Автофарм", false, function(v)
    BeautifulUI:Toast("Автофарм: " .. (v and "включён" or "выключен"), v and "Success" or "Info")
end, "AutoFarm")

Main:InfoToggle("Защита от падения", "Телепортирует на базу при низком HP", true, function(v) end, "AntiFall")

Main:Slider("Скорость", 16, 120, 32, function(v) end, "Speed")
Main:InputSlider("Дистанция", 0, 500, 120, function(v) end, "Distance")

Main:Dropdown("Режим", {"Тихий", "Обычный", "Агрессивный"}, function(v) end, "Mode")

Main:Input("Ник для приглашения", "Введите ник…", function(text) end, "Invite")

Main:ColorPicker("Цвет метки", "#00FFDC", function(color) end, "MarkColor")

Main:Keybind("Бинд телепорта", Enum.KeyCode.T, function() end, "TpBind")

-- прогресс с имитацией загрузки
local progress = Main:ProgressBar("Загрузка ассетов", 100)
local running = false
Main:Button("Запустить загрузку", function()
    if running then return end
    running = true
    task.spawn(function()
        for i = 0, 100, 4 do
            progress:Set(i)
            task.wait(0.04)
        end
        progress:Set(100)
        running = false
        Main:Notify("Готово", "Ассеты загружены", 3, "Success")
    end)
end, "Success", "⬇️")

-- ═══ 4. Графики ═══
local Charts = Window:Tab("Графики", "📈")

local fpsGraph = Charts:Graph("FPS", "line", 150, { MaxPoints = 60, ShowAxis = true })
local pingGraph = Charts:Graph("Пинг", "area", 120, { Color = "#FF5050" })
local bars = Charts:Graph("Онлайн по часам", "bar", 130, { Data = {12, 30, 45, 38, 60, 75, 52} })
local dots = Charts:Graph("Разброс", "scatter", 120, { Data = {10, 40, 25, 70, 55, 90} })
local radar = Charts:Graph("Характеристики", "radial", 150, { Data = {80, 65, 90, 40, 75} })

-- pie с легендой: проценты считаются сами (v6.5)
local pie = Charts:Graph("Доли сервера", "pie", 150, {
    Data = {45, 30, 25},
    LegendLabels = {"RU", "EU", "US"},
})

-- или своя легенда с текстом
local custom = Charts:Graph("Модули", "stacked", 130, {
    Data = {5, 15, 25, 40, 55},
    Legend = {
        {Name = "Ядро",   Value = "12 мс", Color = "#00FFDC"},
        {Name = "Сеть",   Value = "8 мс"},
        {Name = "Рендер", Value = "20 мс"},
    },
})

-- живые данные: FPS и пинг каждые полсекунды
task.spawn(function()
    while true do
        -- 1 / dt — это и есть FPS; GetRealPhysicsFPS может врать, берём время кадра
        local t0 = os.clock()
        task.wait(0.5)
        local dt = math.max(os.clock() - t0, 1 / 240)
        fpsGraph:PushAndLabel(math.floor(1 / dt + 0.5), "FPS: %d")
        pingGraph:AddPoint(math.random(20, 90))
    end
end)

Charts:Hint("Данные обновляются сами. RightShift — свернуть окно.")

-- ═══ 5. Инструменты ═══
local Tools = Window:Tab("Инструменты", "🧰")

local sub = Tools:SubTab("Утилиты", "🔧")
sub:Button("Скопировать ник", function()
    pcall(function() setclipboard(game.Players.LocalPlayer.Name) end)
    Tools:Notify("Скопировано", game.Players.LocalPlayer.Name, 2, "Success")
end, "Primary", "📋")
sub:Toggle("Показывать хитбоксы", false, function(v) end, "Hitboxes")
sub:Slider("Прозрачность", 0, 1, 1, function(v) end, "Opacity")

local sub2 = Tools:SubTab("Опасное", "⚠️")
sub2:Button("Удалить всё (демо)", function()
    BeautifulUI:Notify("Точно?", "Это демонстрация — ничего не удалится", 5, "Warning", {
        {Text = "Да", Color = "#F05050", Callback = function() BeautifulUI:Toast("Отменено в демо", "Info") end},
        {Text = "Нет"},
    })
end, "Danger", "🗑")

Tools:Button{ Text = "Сменить тему на Nord", Callback = function() BeautifulUI:SetTheme("Nord") end, Shape = "Pill", Style = "Ghost" }
Tools:Button{ Text = "Сменить тему на Dracula", Callback = function() BeautifulUI:SetTheme("Dracula") end, Shape = "Pill", Style = "Ghost" }
Tools:Button{ Text = "Сбросить тему на Cyber", Callback = function() BeautifulUI:SetTheme("Cyber") end, Shape = "Pill", Style = "Ghost" }

Tools:ColorPicker("Акцентный цвет", "#00FFDC", function(color)
    BeautifulUI:SetColor("Accent", color)   -- меняем акцент живым цветом
end, "AccentColor")

Tools:Keybind("Панель команд", Enum.KeyCode.K, function() end, "CmdBind")
Tools:Hint("F10 — debug-консоль (если твой ник в списке), K — панель команд, RightShift — свернуть окно.")

-- ═══ 6. О себе ═══
local About = Window:Tab("О себе", "💬")

About:TextPanel({
    Text = "Test Hub — демонстрация BeautifulUI v" .. tostring(BeautifulUI.Version) .. ": 7 типов графиков, легенда, формы кнопок и всё остальное.",
    Speaker = "Гид",
    Icon = "⚡",
    Accent = "#00FFDC",
})

About:Label("Возможности библиотеки", "#00FFDC")
About:Paragraph("• 11 тем и живая смена акцента\n• 7 типов графиков с легендой\n• Формы кнопок и кнопки-иконки\n• Конфиг, поиск по элементам, панель команд\n• Уведомления, диалоги, подсказки")

About:Button("Проверить обновления", function()
    local v = BeautifulUI:CheckForUpdates(LIB_URL:gsub("SimpleUI%.txt$", "version.txt"), true)
    if not v then BeautifulUI:Toast("version.txt не найден — это нормально", "Info") end
end, "Outline", "🔄")

About:Button{ Text = "Скопировать build info", Callback = function()
    local info = BeautifulUI:GetBuildInfo()
    local parts = {}
    for k, v in pairs(info) do table.insert(parts, k .. "=" .. tostring(v)) end
    pcall(function() setclipboard(table.concat(parts, ", ")) end)
    About:Notify("Build info", table.concat(parts, ", "), 6, "Info")
end, Shape = "Pill", Style = "Success" }

-- ═══ 7. Финал ═══
BeautifulUI:Toast("Test Hub загружен — v" .. tostring(BeautifulUI.Version), "Success")
print("[Test Hub] готов, версия:", BeautifulUI.Version)
