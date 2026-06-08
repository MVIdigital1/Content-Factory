import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: campaigns } = await supabase
    .from('ad_campaigns')
    .select('*')
    .eq('status', 'active')

  if (!campaigns?.length) return NextResponse.json({ analyzed: 0 })

  const recs: any[] = []

  for (const c of campaigns) {
    // Low CTR alert
    if (c.ctr > 0 && c.ctr < 1) {
      recs.push({
        user_id: c.user_id,
        campaign_id: c.id,
        type: 'urgent',
        title: `Останови «${c.name}»`,
        description: `CTR ${c.ctr.toFixed(1)}% — слишком низкий. AI рекомендует остановить или заменить креативы.`,
        action_type: 'pause',
        status: 'pending',
      })
    }

    // High ROAS opportunity
    if (c.roas > 300 && c.budget_total && c.budget_spent && c.budget_spent / c.budget_total < 0.8) {
      recs.push({
        user_id: c.user_id,
        campaign_id: c.id,
        type: 'opportunity',
        title: `Увеличь бюджет «${c.name}»`,
        description: `ROAS ${Math.round(c.roas)}% и растёт. Бюджет использован на ${Math.round(c.budget_spent/c.budget_total*100)}%. Есть куда масштабировать.`,
        action_type: 'increase_budget',
        action_value: { multiplier: 1.4 },
        status: 'pending',
      })
    }

    // High CPL warning
    if (c.cpl > 500) {
      recs.push({
        user_id: c.user_id,
        campaign_id: c.id,
        type: 'idea',
        title: `CPL высокий в «${c.name}»`,
        description: `Стоимость заявки ₽${Math.round(c.cpl)}. Попробуй другую аудиторию или формат объявления.`,
        action_type: 'notify',
        status: 'pending',
      })
    }
  }

  if (recs.length > 0) {
    await supabase.from('ad_recommendations').insert(recs)
  }

  return NextResponse.json({ analyzed: campaigns.length, recommendations: recs.length })
}
