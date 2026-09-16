/*
|--------------------------------------------------------------------------
| Scheduler
|--------------------------------------------------------------------------
|
| Zamanlanmış işler. Yalnızca `node ace serve` altında (adonisrc.ts'te bu dosya
| environment: ['web'] olarak preload edilir) — `node ace queue:work` de ayrıca
| çalışır durumda olmalı, kuyruk işçisi bu zamanlanmış işleri gerçekten yürütür.
|
*/

import SweepDueWebhooks from '#jobs/sweep_due_webhooks'
import SweepMatching from '#jobs/sweep_matching'

// 09-API-SOZLESMESI: 1/5/30/120 dk tekrar denemesi, her dakika kontrol edilir
await SweepDueWebhooks.schedule({}).id('sweep-due-webhooks').cron('* * * * *').timezone('UTC').run()

// Süresi dolan teklifleri serbest bırak, eşleşmemiş talepleri yeniden dene
await SweepMatching.schedule({}).id('sweep-matching').cron('*/2 * * * *').timezone('UTC').run()
