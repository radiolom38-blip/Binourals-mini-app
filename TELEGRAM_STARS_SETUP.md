# 💎 ПОДКЛЮЧЕНИЕ TELEGRAM STARS

## Пошаговая инструкция настройки платежей

---

## 📋 ЧТО ВЫ ПОЛУЧИЛИ:

В папке `telegram-app-premium/` находится версия приложения с интеграцией Telegram Stars:
- ✅ Premium баннер с описанием преимуществ
- ✅ 1 бесплатный режим (Focus & Work)
- ✅ 4 платных режима (🔒 заблокированы)
- ✅ Кнопка покупки Premium
- ✅ Восстановление покупок
- ✅ Бейдж PREMIUM для подписчиков

---

## 🎯 ТЕКУЩАЯ НАСТРОЙКА:

### Цена: **250 Stars/месяц**
### Модель: **Месячная подписка** (автоматически продлевается)
### Период: **30 дней**
### Бесплатно: **1 режим** (Focus & Work)
### Premium: **4 режима** (Sleep, Meditation, Relax, Clarity)

---

## ⚙️ ШАГ 1: СОЗДАНИЕ ТОВАРА В @BOTFATHER

### 1. Откройте @BotFather в Telegram

### 2. Подключите платежи через Stars:
```
/mybots
→ Выберите вашего бота
→ Bot Settings
→ Accept Payments
→ Telegram Stars
```

### 3. Создайте товар (Product):
```
Название: Temple Sound Engine Premium - 1 Month
Описание: Monthly subscription - All 5 binaural modes unlocked
Цена: 250 Stars
```

### 4. Сохраните данные:
- Bot Token (уже есть у вас)
- Название товара / Product ID

---

## 🖥️ ШАГ 2: НАСТРОЙКА СЕРВЕРА (BACKEND)

Для работы платежей нужен простой сервер, который будет:
1. Создавать invoice (счёт на оплату)
2. Проверять статус оплаты
3. Сохранять список оплативших пользователей

### Вариант А: Cloudflare Workers (бесплатно)

Создайте бесплатный аккаунт на https://workers.cloudflare.com

**Код worker:**

```javascript
// Cloudflare Worker для Telegram Stars
const BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';
const PRICE_STARS = 250;

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Создать invoice
  if (url.pathname === '/create-invoice') {
    const data = await request.json();
    const userId = data.user_id;
    
    const invoice = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Temple Sound Engine Premium - 1 Month',
        description: 'Monthly subscription: All 5 binaural frequency modes',
        payload: `premium_${userId}`,
        currency: 'XTR', // Telegram Stars
        prices: [{ label: 'Monthly Subscription', amount: 250 }]
      })
    });
    
    const result = await invoice.json();
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Проверить статус подписки
  if (url.pathname === '/check-premium') {
    const data = await request.json();
    const userId = data.user_id;
    
    // TODO: Проверка в базе данных (KV хранилище Cloudflare)
    // Пока возвращаем false
    
    return new Response(JSON.stringify({ premium: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  return new Response('Temple Sound Engine API', { headers: corsHeaders });
}
```

### Вариант Б: Vercel Serverless Functions (бесплатно)

Создайте файл `/api/payment.js`:

```javascript
const BOT_TOKEN = process.env.BOT_TOKEN;

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { action, user_id } = req.body;
    
    if (action === 'create-invoice') {
      const response = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Temple Sound Engine Premium',
            description: 'Lifetime access to all 5 modes',
            payload: `premium_${user_id}`,
            currency: 'XTR',
            prices: [{ label: 'Premium', amount: 250 }]
          })
        }
      );
      
      const data = await response.json();
      return res.json(data);
    }
    
    if (action === 'check-premium') {
      // TODO: Проверка в базе данных
      return res.json({ premium: false });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
```

---

## 🔌 ШАГ 3: ПОДКЛЮЧЕНИЕ К ПРИЛОЖЕНИЮ

Откройте `index.html` и найдите функцию `buyPremium()`:

```javascript
// Замените YOUR_INVOICE_LINK_HERE на:

// Вариант 1: Прямая ссылка от BotFather
const invoiceUrl = 'https://t.me/your_bot?start=pay_premium';

// Вариант 2: Через ваш сервер (рекомендуется)
const response = await fetch('https://your-worker.workers.dev/create-invoice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user_id: tg.initDataUnsafe.user.id })
});
const data = await response.json();
const invoiceUrl = data.result;
```

---

## 💾 ШАГ 4: СОХРАНЕНИЕ ПЛАТЕЖЕЙ

Когда платёж успешен, нужно сохранить user_id + дату окончания подписки.

### Используйте webhook от Telegram:

```
/setwebhook YOUR_SERVER_URL/webhook
```

**Обработчик webhook** (на сервере):

```javascript
// Когда пришёл платёж
app.post('/webhook', async (req, res) => {
  const update = req.body;
  
  // Успешный платёж
  if (update.pre_checkout_query) {
    // Подтвердить платёж
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
      method: 'POST',
      body: JSON.stringify({
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true
      })
    });
  }
  
  // Платёж завершён
  if (update.message && update.message.successful_payment) {
    const userId = update.message.from.id;
    
    // Вычислить дату окончания (через 30 дней)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    // Сохранить в базу данных
    await db.set(`premium_${userId}`, {
      status: 'active',
      started: Date.now(),
      expires: expiryDate.getTime(),
      amount: update.message.successful_payment.total_amount
    });
    
    console.log(`User ${userId} subscribed until ${expiryDate.toISOString()}`);
  }
  
  res.sendStatus(200);
});
```

---

## 🔄 АВТОМАТИЧЕСКОЕ ПРОДЛЕНИЕ

### Вариант 1: Уведомление о истечении подписки

Создайте cron job (ежедневная проверка):

```javascript
// Каждый день проверяем истекающие подписки
async function checkExpiringSubscriptions() {
  const now = Date.now();
  const tomorrow = now + (24 * 60 * 60 * 1000);
  
  // Найти подписки, которые истекают завтра
  const expiring = await db.query({
    expires: { between: [now, tomorrow] }
  });
  
  // Отправить уведомление каждому
  for (const sub of expiring) {
    await sendMessage(sub.userId, 
      '⭐ Ваша подписка Premium истекает завтра!\n' +
      'Продлите её, чтобы сохранить доступ ко всем режимам.'
    );
  }
}
```

### Вариант 2: Автоматическое списание

Telegram пока не поддерживает автоматическое списание Stars.
Пользователь должен подтвердить продление вручную.

### Вариант 3: Напоминание + ссылка на покупку

```javascript
const daysLeft = Math.ceil((sub.expires - Date.now()) / (1000*60*60*24));

if (daysLeft <= 3) {
  await sendMessage(sub.userId,
    `⏰ Осталось ${daysLeft} дней подписки\n` +
    `Нажмите для продления:`,
    { inline_keyboard: [[
      { text: '🔄 Продлить на месяц', url: 'https://t.me/your_bot/app' }
    ]]}
  );
}
```

---

## 🔍 ШАГ 5: ПРОВЕРКА ПОДПИСКИ

При запуске приложения проверяйте статус и дату окончания:

```javascript
// В функции checkPremiumStatus()
async function checkPremiumStatus() {
  const userId = tg.initDataUnsafe.user.id;
  
  const response = await fetch('https://your-server.com/check-premium', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId })
  });
  
  const data = await response.json();
  
  if (data.premium && data.expires) {
    const now = Date.now();
    const expiryDate = data.expires;
    
    // Проверить, не истекла ли подписка
    if (now < expiryDate) {
      isPremium = true;
      
      // Показать сколько дней осталось
      const daysLeft = Math.ceil((expiryDate - now) / (1000*60*60*24));
      console.log(`Premium active. Days left: ${daysLeft}`);
    } else {
      // Подписка истекла
      isPremium = false;
      console.log('Premium expired');
    }
  }
  
  updatePremiumUI();
}
```

**Серверная проверка:**

```javascript
// На сервере
app.post('/check-premium', async (req, res) => {
  const { user_id } = req.body;
  
  // Получить из базы
  const sub = await db.get(`premium_${user_id}`);
  
  if (sub && sub.status === 'active') {
    res.json({
      premium: true,
      expires: sub.expires,
      started: sub.started
    });
  } else {
    res.json({ premium: false });
  }
});
```

---

## 🧪 ТЕСТИРОВАНИЕ

### Режим разработки (без сервера):

В `index.html` временно установите:
```javascript
isPremium = true; // Для тестирования UI
```

### С реальными платежами:

1. Telegram автоматически использует тестовый режим для разработчиков
2. Вы можете делать "тестовые" покупки без списания Stars
3. Для продакшена нужно опубликовать бота

---

## 💰 НАСТРОЙКА ЦЕНЫ

Изменить цену (если нужно):

```javascript
// В HTML
<span class="price">⭐ 250 Stars/mo</span>

// В серверном коде
prices: [{ label: 'Monthly Subscription', amount: 250 }]
```

**Рекомендуемые цены для подписки:**
- Месяц: 250 Stars (~$2.50)
- 3 месяца: 650 Stars (~$6.50) - выгоднее на 13%
- 6 месяцев: 1200 Stars (~$12) - выгоднее на 20%
- Год: 2200 Stars (~$22) - выгоднее на 27%

---

## 🎨 КАСТОМИЗАЦИЯ

### Изменить бесплатные режимы:

В `index.html` найдите кнопки и измените атрибуты:

```html
<!-- Сделать режим бесплатным -->
<button data-free="true" onclick="startMode('relax')">

<!-- Сделать режим платным -->
<button data-premium="true" onclick="tryPremiumMode('sleep')">
```

### Изменить описание Premium:

```html
<div class="premium-banner">
  <h3>Ваш текст</h3>
  <p>Ваше описание</p>
  <ul>
    <li>Преимущество 1</li>
    <li>Преимущество 2</li>
  </ul>
</div>
```

---

## 📊 БАЗА ДАННЫХ

Для хранения подписчиков используйте:

### Вариант 1: Cloudflare KV (бесплатно до 100К операций/день)
```javascript
await KV.put(`premium_${userId}`, 'true');
const isPremium = await KV.get(`premium_${userId}`);
```

### Вариант 2: Supabase (бесплатно до 500MB)
```javascript
const { data } = await supabase
  .from('premium_users')
  .select('*')
  .eq('user_id', userId);
```

### Вариант 3: Google Sheets (самое простое)
Используйте Google Sheets API для хранения списка user_id

---

## 🆘 ЧАСТЫЕ ВОПРОСЫ

**Q: Можно ли сделать подписку (ежемесячную)?**
A: Да! Именно это и реализовано. Подписка на 1 месяц (30 дней).

**Q: Как продлить подписку?**
A: Пользователь должен снова нажать "Subscribe" в приложении. 
   Автоматическое списание пока не поддерживается Telegram Stars.

**Q: Что если подписка истекла?**
A: Приложение автоматически заблокирует premium режимы и покажет баннер покупки.

**Q: Как уведомить об истечении подписки?**
A: Используйте cron job на сервере + отправку сообщений через Bot API.

**Q: Как вернуть деньги?**
A: Telegram Stars не возвращаются автоматически. Нужно вручную через @BotSupport.

**Q: Сколько Telegram берёт комиссию?**
A: 0% для первых $1M, затем стандартная комиссия.

**Q: Можно ли без сервера?**
A: Нет, для безопасности и хранения дат подписок нужна серверная проверка.

---

## ✅ ПРОВЕРОЧНЫЙ СПИСОК

Перед запуском убедитесь:

- [ ] Платежи подключены в @BotFather
- [ ] Товар создан и настроен
- [ ] Сервер развёрнут и работает
- [ ] Webhook настроен
- [ ] Invoice создаётся корректно
- [ ] База данных работает
- [ ] Проверка подписки работает
- [ ] Тестовые покупки проходят
- [ ] UI обновляется после покупки

---

## 🎉 ГОТОВО!

Теперь ваше приложение готово принимать платежи через Telegram Stars!

**Следующий шаг:** Протестируйте покупку в Telegram и убедитесь, что всё работает.

**Нужна помощь?** Напишите, помогу настроить сервер и базу данных!
