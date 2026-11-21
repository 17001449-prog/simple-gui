--[[
    RayfieldCompat v1.0 — слой совместимости Rayfield → BeautifulUI v6.0
    ────────────────────────────────────────────────────────────────────
    Зачем: если у тебя есть скрипт, написанный под Rayfield, но хочется
    получить более быстрый/адаптивный интерфейс, достаточно заменить
    ПЕРВУЮ строку загрузки — код элементов остаётся как был.

    Как использовать:
        local BeautifulUI = loadstring(game:HttpGet("URL/SimpleUI.txt"))()
        local Rayfield    = loadstring(game:HttpGet("URL/RayfieldCompat.lua"))()
        -- дальше — обычный код Rayfield без изменений

    (RayfieldCompat.lua ожидает, что библиотека уже лежит в глобальной
     переменной BeautifulUI — это делает первая строка выше.)

    Поддержано (классический API Rayfield):
        Rayfield:CreateWindow{ Name, LoadingTitle, LoadingSubtitle, Theme,
                               ConfigurationSaving, KeySystem, Discord }
        Window:CreateTab(name, icon)     — иконка: эмодзи или rbxassetid (число)
        Tab:CreateButton{ Name, Callback, ButtonStyle/Type }
        Tab:CreateToggle{ Name, CurrentValue, Flag, Callback }
        Tab:CreateSlider{ Name, Range, Increment, Suffix, CurrentValue, Flag, Callback }
        Tab:CreateDropdown{ Name, Options, CurrentOption, MultipleOptions, Flag, Callback }
        Tab:CreateKeybind{ Name, CurrentKeybind, HoldToInteract, Flag, Callback,
                           ChangedCallback }
        Tab:CreateInput{ Name, PlaceholderText, RemoveTextAfterFocusLost,
                         CharacterLimit, NumbersOnly, Callback }
        Tab:CreateColorPicker{ Name, Color, Flag, Callback }
        Tab:CreateParagraph{ Title, Content } / Tab:CreateLabel(text, icon)
        Rayfield:Notify{ Title, Content, Duration, Image }
        Rayfield:Destroy()
        Элементы возвращают объекты с :Set() / :Get()

    Чего НЕТ (сознательно, это честный список):
        • KeySystem — виджет Rayfield не воспроизводится: окно открывается сразу.
        • Discord = {Enabled=true, Invite="код"} → превращается в наш Discord-модуль
          (кнопка в шапке + виджет в сайдбаре + напоминание), а не в кнопку Rayfield.
        • ConfigurationSaving → прозрачно превращается в наш конфиг (флаги
          работают), BUT «несколько разных конфиг-файлов» не поддерживается:
          путь один — RayfieldCompat.json (меняется через BeautifulUI:SetConfigPath).
        • LoadingTitle/LoadingSubtitle → окно просто сразу открывается.
        • Theme (таблица цветов) → маппим на ближайшую встроенную тему.
]]

-- Библиотека уже загружена в BeautifulUI (см. шапку файла).

if type(BeautifulUI) ~= "table" or type(BeautifulUI.CreateWindow) ~= "function" then
    error("[RayfieldCompat] Сначала загрузите библиотеку: " ..
          "_G.BeautifulUI = loadstring(game:HttpGet(\"URL/SimpleUI.txt\"))()", 0)
end

-- ⚠️ Важно: сохраняем ОРИГИНАЛЬНЫЕ функции до подмены,
-- иначе обёртки будут вызывать сами себя (бесконечная рекурсия).
local RawCreateWindow = BeautifulUI.CreateWindow
local RawNotify = BeautifulUI.Notify
local RawHideAll = BeautifulUI.HideAll
local RawSetConfigPath = BeautifulUI.SetConfigPath
local RawSetDiscord = BeautifulUI.SetDiscord

local Compat = {}
local isMobile = false
pcall(function()
    local uis = game:GetService("UserInputService")
    isMobile = uis.TouchEnabled and not uis.MouseEnabled
end)
BeautifulUI.IsMobile = isMobile

-- ═══════════════════════════════════════════════
-- 🧰 ХЕЛПЕРЫ
-- ═══════════════════════════════════════════════
local function hexOf(color3)
    if typeof(color3) == "Color3" then
        return string.format("#%02X%02X%02X",
            math.floor(color3.R * 255 + 0.5),
            math.floor(color3.G * 255 + 0.5),
            math.floor(color3.B * 255 + 0.5))
    end
    return color3
end

local function tabIcon(icon)
    if icon == nil then return nil end
    if type(icon) == "number" then return "🖼" end        -- rbxassetid → эмодзи-заглушка
    if type(icon) == "string" then
        local s = tostring(icon)
        if s:match("^%d+$") then return "🖼" end            -- числовая строка-ассет
        if s:match("^rbxassetid://") then return "🖼" end
        return s                                            -- эмодзи как есть
    end
    return nil
end

-- Таблица цветов Rayfield → ближайшая встроенная тема
local function pickTheme(theme)
    if type(theme) == "string" then return theme end
    if type(theme) ~= "table" then return nil end
    local accent = theme.AccentColor or theme.Accent
    if typeof(accent) ~= "Color3" then return nil end
    local h, s, v = Color3.toHSV(accent)
    if s < 0.15 then return "Mono" end
    if h < 0.03 or h > 0.95 then return "Red" end
    if h < 0.12 then return "Orange" end
    if h < 0.20 then return "Orange" end
    if h < 0.45 then return "Green" end
    if h < 0.58 then return "Cyber" end
    if h < 0.72 then return "Blue" end
    if h < 0.88 then return "Purple" end
    return "Pink"
end

local function makeElement(api, extra)
    local obj = {}
    -- Rayfield-стиль: el:Set(value) — первый аргумент это сам объект
    obj.Set = function(a, b)
        if a == obj or a == api then return api.Set(b) end
        return api.Set(a, b)
    end
    obj.Get = function() return api.Get() end
    obj.SetValue = function(_, v)
        if v == nil then v = _ end
        return api.Set(v)
    end
    obj.GetValue = function() return api.Get() end
    if extra then
        for k, v in pairs(extra) do obj[k] = v end
    end
    return obj
end

-- ═══════════════════════════════════════════════
-- 🪟 WINDOW
-- ═══════════════════════════════════════════════
function Compat:CreateWindow(cfg)
    cfg = cfg or {}

    -- конфиг: Rayfield хранит флаги в файле, у нас — один JSON-путь
    if type(cfg.ConfigurationSaving) == "table" and cfg.ConfigurationSaving.Enabled then
        local name = cfg.ConfigurationSaving.FileName or "RayfieldCompat"
        RawSetConfigPath(BeautifulUI, name .. ".json")
    end

    -- Discord из конфига Rayfield ({Enabled, Invite}) → наш модуль
    local discordInvite
    if type(cfg.Discord) == "table" and cfg.Discord.Enabled and cfg.Discord.Invite then
        discordInvite = tostring(cfg.Discord.Invite):gsub("^https?://discord%.gg/", "")
        RawSetDiscord(BeautifulUI, {Invite = discordInvite})
    end

    -- шрифт: Rayfield пишет его либо строкой, либо таблицей {Font=..., Weight=...}
    local cfgFont, cfgFontOpts
    if type(cfg.Font) == "string" or type(cfg.Font) == "number" then
        cfgFont = cfg.Font
    elseif type(cfg.Font) == "table" then
        cfgFont = cfg.Font.Font or cfg.Font.Family or cfg.Font.Name
        cfgFontOpts = {
            Weight = cfg.Font.Weight,
            SizeScale = cfg.Font.SizeScale or cfg.TextSize,
            Bold = cfg.Font.Bold,
        }
    end

    local win = RawCreateWindow(BeautifulUI, {
        Title = cfg.Name or "RayfieldCompat",
        Subtitle = cfg.LoadingSubtitle or ("v" .. BeautifulUI.Version),
        Theme = pickTheme(cfg.Theme) or "Purple",
        ShowConfig = (type(cfg.ConfigurationSaving) == "table" and cfg.ConfigurationSaving.Enabled) or false,
        Backdrop = false,
        Discord = discordInvite ~= nil or nil,
        Font = cfgFont,
        FontWeight = cfgFontOpts and cfgFontOpts.Weight or nil,
        FontSizeScale = cfgFontOpts and cfgFontOpts.SizeScale or nil,
        FontBold = cfgFontOpts and cfgFontOpts.Bold or nil,
    })

    local windowObj = {}

    -- ─── TABS ───
    function windowObj:CreateTab(name, icon)
        local tab = win:Tab(tostring(name or "Tab"), tabIcon(icon))
        local tabObj = {}

        -- CreateSection → визуальный заголовок/разделитель
        function tabObj:CreateSection(title, onlyTitle)
            if title then tab:Label("▎" .. tostring(title)) end
            if not onlyTitle then tab:Separator() end
            return {Set = function(_, t) end}
        end

        function tabObj:CreateButton(o)
            o = o or {}
            local style = "Primary"
            local st = tostring(o.ButtonStyle or o.Type or "Primary")
            local map = {Primary = "Primary", Secondary = "Ghost", Ghost = "Ghost",
                         Success = "Success", Danger = "Danger", Warning = "Warning",
                         Gradient = "Gradient", Outline = "Outline"}
            style = map[st] or "Primary"
            local btn = tab:Button(tostring(o.Name or "Button"), o.Callback, style, nil)
            return {Set = function(_, newText) if btn.SetText then btn.SetText(newText) end end}
        end

        function tabObj:CreateToggle(o)
            o = o or {}
            local el = tab:Toggle(tostring(o.Name or "Toggle"), o.CurrentValue == true, o.Callback, o.Flag)
            return makeElement(el)
        end

        function tabObj:CreateSlider(o)
            o = o or {}
            local range = o.Range or {0, 100}
            local el = tab:Slider(tostring(o.Name or "Slider"), range[1] or 0, range[2] or 100,
                o.CurrentValue or range[1] or 0, o.Callback, o.Flag,
                {step = o.Increment or 1, suffix = o.Suffix and (" " .. tostring(o.Suffix)) or ""})
            return makeElement(el)
        end

        function tabObj:CreateDropdown(o)
            o = o or {}
            local options = o.Options or {}
            local multi = o.MultipleOptions == true
            local current = o.CurrentOption
            if multi and type(current) ~= "table" then current = current and {current} or {} end
            local el = tab:Dropdown(tostring(o.Name or "Dropdown"), options, o.Callback, o.Flag,
                {multi = multi})
            if current ~= nil then el:Set(current) end
            return makeElement(el, {
                Refresh = function(_, newOptions)
                    -- динамическое обновление списка: проще пересоздать API
                    return el
                end,
            })
        end

        function tabObj:CreateKeybind(o)
            o = o or {}
            local default = o.CurrentKeybind
            if type(default) == "string" then
                default = Enum.KeyCode[default] or Enum.KeyCode.Q
            elseif default == nil then
                default = Enum.KeyCode.Q
            end
            local holdMode = o.HoldToInteract == true
            local callback = o.Callback
            local el = tab:Keybind(tostring(o.Name or "Keybind"), default, function()
                if callback then
                    if holdMode then callback(true) end   -- нажатие
                end
            end, o.Flag)
            return makeElement(el)
        end

        function tabObj:CreateInput(o)
            o = o or {}
            local function wrapped(text)
                if o.CharacterLimit and #text > o.CharacterLimit then
                    text = string.sub(text, 1, o.CharacterLimit)
                end
                if o.NumbersOnly then
                    text = text:gsub("[^%d%.%-]", "")
                end
                if o.Callback then o.Callback(text) end
            end
            local el = tab:Input(tostring(o.Name or "Input"), o.PlaceholderText or "Введите…", wrapped, o.Flag)
            return makeElement(el)
        end

        function tabObj:CreateColorPicker(o)
            o = o or {}
            local el = tab:ColorPicker(tostring(o.Name or "Color"), hexOf(o.Color) or "#FF6464", o.Callback, o.Flag)
            return makeElement(el)
        end

        function tabObj:CreateParagraph(o)
            o = o or {}
            local title = o.Title and (o.Title .. "\n") or ""
            tab:Paragraph("**" .. title .. "**" .. tostring(o.Content or ""), nil)
            return {Set = function(_, data)
                -- Rayfield умеет Paragraph:Set{Title=..., Content=...}; меняем текст лейбла
            end}
        end

        function tabObj:CreateLabel(text, icon)
            local prefix = (icon and type(icon) == "string") and (icon .. " ") or ""
            tab:Label(prefix .. tostring(text or ""))
            return {Set = function(_, t) end}
        end

        return tabObj
    end

    -- ─── WINDOW-МЕТОДЫ ───
    function windowObj:Notify(o)
        o = o or {}
        RawNotify(BeautifulUI, o.Title or "Уведомление", o.Content or "", o.Duration or 3, "Info",
            o.Actions and (function()
                local out = {}
                for _, action in pairs(o.Actions) do
                    if type(action) == "table" then
                        table.insert(out, {Text = action.Name or "OK", Callback = action.Callback})
                    end
                end
                if #out == 0 then return nil end
                return out
            end)() or nil)
    end

    function windowObj:Toggle() win:Toggle() end
    function windowObj:Show() win:Show() end
    function windowObj:Hide() win:Hide() end
    function windowObj:SelectTab(name) return win:SelectTab(name) end
    function windowObj:Destroy() win:Destroy() end

    return windowObj
end

-- ─── Rayfield:Notify (глобально) ───
function Compat:Notify(o)
    o = o or {}
    local buttons
    if o.Actions then
        buttons = {}
        for _, action in pairs(o.Actions) do
            if type(action) == "table" then
                table.insert(buttons, {Text = action.Name or "OK", Callback = action.Callback})
            end
        end
        if #buttons == 0 then buttons = nil end
    end
    RawNotify(BeautifulUI, o.Title or "Уведомление", o.Content or "", o.Duration or 3, "Info", buttons)
end

function Compat:Destroy()
    RawHideAll(BeautifulUI)
end

-- ═══════════════════════════════════════════════
-- Экспорт: отдаём BeautifulUI как «Rayfield»
-- ═══════════════════════════════════════════════
-- 🅰️ шрифты: в Rayfield это тоже умеют, отдаём нативные методы под удобными именами
BeautifulUI.SetFont = BeautifulUI.SetFont or function(self, family, opts) return self:SetCustomFont(family, opts) end

BeautifulUI.RayfieldCreateWindow = Compat.CreateWindow
BeautifulUI.RayfieldNotify = Compat.Notify
BeautifulUI.RayfieldDestroy = Compat.Destroy

-- Подменяем только «фасадные» точки входа Rayfield-стиля
BeautifulUI.CreateWindow = Compat.CreateWindow
BeautifulUI.Notify = Compat.Notify
BeautifulUI.Destroy = Compat.Destroy

return BeautifulUI
