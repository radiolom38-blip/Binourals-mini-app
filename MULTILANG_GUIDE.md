# 🌍 Многоязычность (Multi-language Support)

## Добавлено в приложение:

### ✅ Функции:
- Переключатель языков EN/RU в правом верхнем углу
- Автоматическое определение языка пользователя Telegram
- Сохранение выбранного языка в localStorage
- Полный перевод всех элементов интерфейса

---

## 🎨 Что переведено:

### Английский (EN):
- Deep Sleep — Delta waves
- Meditation — Theta waves  
- Relaxation — Alpha waves
- Focus & Work — Beta waves
- Clarity — Gamma waves
- Select a state to begin
- Playing: [mode name]
- Stop Generation
- Quick Guide + все инструкции

### Русский (RU):
- Глубокий сон — Дельта-волны
- Медитация — Тета-волны
- Расслабление — Альфа-волны
- Фокус и работа — Бета-волны
- Ясность — Гамма-волны
- Выберите состояние для начала
- Играет: [название режима]
- Остановить генерацию
- Краткое руководство + все инструкции

---

## 🔧 Как работает:

### 1. Автоопределение языка:
```javascript
// Приоритет определения:
1. Сохранённый язык (localStorage)
2. Язык Telegram пользователя
3. По умолчанию: English
```

### 2. Поддерживаемые языки Telegram → RU:
- ru (Русский)
- uk (Українська) 
- be (Беларуская)

### 3. Сохранение выбора:
При переключении язык сохраняется в браузере и используется при следующем запуске.

---

## ➕ Как добавить новый язык:

### Шаг 1: Добавьте переводы
В `index.html` найдите объект `translations` и добавьте:

```javascript
const translations = {
    en: { ... },
    ru: { ... },
    // Добавьте новый язык:
    es: {
        appTitle: 'Temple Sound Engine',
        selectState: 'Selecciona un estado para comenzar',
        modeSleep: 'Sueño Profundo',
        // ... остальные переводы
    }
};
```

### Шаг 2: Добавьте кнопку
```html
<div class="lang-switcher">
    <button class="lang-btn" data-lang="en" onclick="switchLanguage('en')">EN</button>
    <button class="lang-btn" data-lang="ru" onclick="switchLanguage('ru')">RU</button>
    <button class="lang-btn" data-lang="es" onclick="switchLanguage('es')">ES</button>
</div>
```

### Шаг 3: Обновите автоопределение
```javascript
function initLanguage() {
    const tgLang = tg.initDataUnsafe?.user?.language_code;
    
    // Добавьте маппинг для нового языка
    if (tgLang === 'es' || tgLang === 'mx') {
        currentLang = 'es';
    }
    // ...
}
```

---

## 🎯 Ключевые переводы:

Все тексты имеют атрибут `data-i18n` для автоматического перевода:

```html
<div data-i18n="selectState">Select a state to begin</div>
<div data-i18n="modeSleep">Deep Sleep</div>
<span data-i18n="stopButton">⬛ Stop Generation</span>
```

Полный список ключей переводов:
- `appTitle`
- `selectState`
- `playingState`
- `modeSleep`, `modeSleepDesc`
- `modeMeditation`, `modeMeditationDesc`
- `modeRelax`, `modeRelaxDesc`
- `modeWork`, `modeWorkDesc`
- `modeClarity`, `modeClarityDesc`
- `stopButton`
- `guideTitle`
- `guide1Title`, `guide1Text`
- `guide2Title`, `guide2Text`
- `guide3Title`, `guide3Text`
- `guide4Title`, `guide4Text`

---

## 💡 Советы:

### RTL языки (арабский, иврит):
Добавьте в CSS:
```css
.lang-switcher[data-lang="ar"],
.lang-switcher[data-lang="he"] {
    direction: rtl;
}
```

### Длинные переводы:
Некоторые языки требуют больше места. Проверьте:
- Кнопки режимов (длинные названия)
- Инструкции (могут не поместиться)

### Fallback:
Если перевод не найден, отобразится английский текст.

---

## 📱 Тестирование:

1. Откройте приложение
2. Нажмите EN/RU в правом углу
3. Проверьте все экраны:
   - Статус бар
   - Названия режимов
   - Описания режимов
   - Кнопку остановки
   - Инструкции

---

## ✨ Готово!

Теперь ваше приложение поддерживает английский и русский языки с автоматическим определением и удобным переключением!
