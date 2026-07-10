'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Plan, PlanType } from '@/types'

const PLAN_META: Record<PlanType, { icon:string; color:string; gradient:string }> = {
  free:   { icon:'🆓', color:'#6366f1', gradient:'from-indigo-900/40 to-indigo-800/20' },
  silver: { icon:'🥈', color:'#94a3b8', gradient:'from-slate-700/60 to-slate-800/30' },
  gold:   { icon:'🥇', color:'#f59e0b', gradient:'from-amber-900/40 to-amber-800/20' },
}

const DEFAULTS: Record<PlanType, Partial<PlanForm>> = {
  free:   { name_fa:'رایگان',  price_monthly:'0',      price_yearly:'0',      max_books:'3',  max_downloads:'0' },
  silver: { name_fa:'نقره‌ای', price_monthly:'49000',  price_yearly:'490000', max_books:'20', max_downloads:'5' },
  gold:   { name_fa:'طلایی',   price_monthly:'99000',  price_yearly:'990000', max_books:'0',  max_downloads:'0' },
}

interface PlanForm {
  name: PlanType; name_fa:string; description:string
  price_monthly:string; price_yearly:string
  features:string; max_books:string; max_downloads:string; is_active:boolean
}

const Inp = ({ label, value, onChange, placeholder, type='text' }: {
  label:string; value:string; onChange:(v:string)=>void; placeholder?:string; type?:string
}) => (
  <div className="mb-4">
    <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2.5 bg-ocean-900 border border-ocean-500 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors" />
  </div>
)

const Toggle = ({ value, onChange, label }: { value:boolean; onChange:()=>void; label:string }) => (
  <label className="flex items-center gap-3 cursor-pointer">
    <div onClick={onChange} className={`w-11 h-6 rounded-full relative transition-colors ${value?'bg-amber-500':'bg-ocean-600'}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${value?'left-6':'left-1'}`} />
    </div>
    <span className="text-sm text-slate-300">{label}</span>
  </label>
)

function PlanModal({ plan, onClose, onSaved }: { plan:Plan|null; onClose:()=>void; onSaved:()=>void }) {
  const sb = createClient()
  const isNew = !plan
  const [f, setF] = useState<PlanForm>({
    name:            plan?.name ?? 'free',
    name_fa:         plan?.name_fa ?? '',
    description:     plan?.description ?? '',
    price_monthly:   String(plan?.price_monthly ?? 0),
    price_yearly:    String(plan?.price_yearly ?? 0),
    features:        (plan?.features ?? []).join('\n'),
    max_books:       String(plan?.max_books ?? 0),
    max_downloads:   String(plan?.max_downloads ?? 0),
    is_active:       plan?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handlePlanType = (v: PlanType) => {
    setF(f => ({ ...f, name: v, ...DEFAULTS[v] }))
  }

  const save = async () => {
    if (!f.name_fa.trim()) { setErr('نام فارسی الزامی است'); return }
    setSaving(true); setErr('')
    const payload = {
      name:          f.name,
      name_fa:       f.name_fa,
      description:   f.description || null,
      price_monthly: parseFloat(f.price_monthly) || 0,
      price_yearly:  parseFloat(f.price_yearly)  || 0,
      features:      f.features.split('\n').map(s=>s.trim()).filter(Boolean),
      max_books:     f.max_books     ? parseInt(f.max_books)     : null,
      max_downloads: f.max_downloads ? parseInt(f.max_downloads) : null,
      is_active:     f.is_active,
      updated_at:    new Date().toISOString(),
    }
    const res = plan
      ? await sb.from('plans').update(payload).eq('id', plan.id)
      : await sb.from('plans').insert({ ...payload, created_at: new Date().toISOString() })
    setSaving(false)
    if (res.error) { setErr(res.error.message); return }
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-ocean-800 border border-ocean-600 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-ocean-600">
          <h3 className="font-semibold text-white">{plan ? 'ویرایش پلن' : 'پلن جدید'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>
        <div className="p-5">
          {isNew && (
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-2">نوع پلن</label>
              <div className="grid grid-cols-3 gap-2">
                {(['free','silver','gold'] as PlanType[]).map(t => (
                  <button key={t} onClick={()=>handlePlanType(t)}
                    className={`flex flex-col items-center p-3 rounded-xl border transition-all ${f.name===t?'border-amber-500 bg-amber-500/10':'border-ocean-600 bg-ocean-900 hover:border-ocean-500'}`}>
                    <span className="text-2xl mb-1">{PLAN_META[t].icon}</span>
                    <span className="text-xs text-slate-300">{DEFAULTS[t].name_fa}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Inp label="نام فارسی *" value={f.name_fa} onChange={v=>setF(x=>({...x,name_fa:v}))} placeholder="مثلاً: طلایی" />
          <Inp label="توضیحات"     value={f.description} onChange={v=>setF(x=>({...x,description:v}))} placeholder="توضیح کوتاه..." />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Inp label="قیمت ماهیانه (تومان)" value={f.price_monthly} onChange={v=>setF(x=>({...x,price_monthly:v}))} type="number" placeholder="0" />
              {Number(f.price_monthly) > 0 && (
                <p className="text-xs text-slate-500 -mt-3 mb-4">{Number(f.price_monthly).toLocaleString()} تومان</p>
              )}
            </div>
            <div>
              <Inp label="قیمت سالیانه (تومان)" value={f.price_yearly} onChange={v=>setF(x=>({...x,price_yearly:v}))} type="number" placeholder="0" />
              {Number(f.price_yearly) > 0 && (
                <p className="text-xs text-slate-500 -mt-3 mb-4">{Number(f.price_yearly).toLocaleString()} تومان/سال</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Inp label="حداکثر کتاب (0 = نامحدود)"    value={f.max_books}     onChange={v=>setF(x=>({...x,max_books:v}))}     type="number" />
            <Inp label="حداکثر دانلود (0 = نامحدود)"   value={f.max_downloads} onChange={v=>setF(x=>({...x,max_downloads:v}))} type="number" />
          </div>

          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1.5">ویژگی‌ها (هر خط یک مورد)</label>
            <textarea value={f.features} onChange={e=>setF(x=>({...x,features:e.target.value}))} rows={5}
              placeholder={"دسترسی به ۳ کتاب رایگان\nپشتیبانی ایمیل\nبدون نیاز به کارت اعتباری"}
              className="w-full px-3 py-2.5 bg-ocean-900 border border-ocean-500 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none" />
          </div>

          <Toggle value={f.is_active} onChange={()=>setF(x=>({...x,is_active:!x.is_active}))} label="پلن فعال" />

          {err && <div className="mt-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-400 text-xs">{err}</div>}
        </div>
        <div className="flex gap-3 justify-end p-5 border-t border-ocean-600">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 border border-ocean-600 rounded-lg hover:border-slate-400">لغو</button>
          <button onClick={save} disabled={saving}
            className="px-5 py-2 text-sm bg-amber-500 text-ocean-950 font-bold rounded-lg hover:bg-amber-400 disabled:opacity-50">
            {saving ? 'ذخیره...' : 'ذخیره'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PlansPage() {
  const sb = createClient()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Plan|null|'new'>(null)
  const [subsStats, setSubsStats] = useState<Record<string,number>>({})

  const load = async () => {
    const [pRes, sRes] = await Promise.all([
      sb.from('plans').select('*').order('created_at'),
      sb.from('user_subscriptions').select('plan_id,status'),
    ])
    setPlans(pRes.data ?? [])
    const stats: Record<string,number> = {}
    ;(sRes.data ?? []).filter(s=>s.status==='active').forEach(s => {
      stats[s.plan_id] = (stats[s.plan_id] ?? 0) + 1
    })
    setSubsStats(stats)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const del = async (id: string) => {
    if (!confirm('این پلن حذف شود؟')) return
    const { error } = await sb.from('plans').delete().eq('id', id)
    if (error) { alert(error.message); return }
    load()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">پلن‌های اشتراک</h1>
          <p className="text-slate-400 text-sm mt-1">مدیریت پلن‌های رایگان، نقره‌ای و طلایی</p>
        </div>
        <button onClick={()=>setModal('new')}
          className="px-4 py-2.5 bg-amber-500 text-ocean-950 font-bold rounded-xl hover:bg-amber-400 transition-colors text-sm">
          + پلن جدید
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">در حال بارگذاری...</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">💎</div>
          <p className="text-slate-400 mb-2">هنوز پلنی تعریف نشده</p>
          <button onClick={()=>setModal('new')}
            className="mt-4 px-6 py-2.5 bg-amber-500 text-ocean-950 font-bold rounded-xl text-sm hover:bg-amber-400">
            + افزودن اولین پلن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(p => {
            const meta = PLAN_META[p.name as PlanType] ?? PLAN_META.free
            const activeSubs = subsStats[p.id] ?? 0
            return (
              <div key={p.id} className={`bg-gradient-to-b ${meta.gradient} border rounded-2xl overflow-hidden`}
                style={{ borderColor: meta.color + '40' }}>
                <div className="p-5 border-b" style={{ borderColor: meta.color + '30' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl">{meta.icon}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${p.is_active?'bg-green-900/40 text-green-400':'bg-slate-700 text-slate-400'}`}>
                      {p.is_active?'فعال':'غیرفعال'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{p.name_fa}</h3>
                  {p.description && <p className="text-xs text-slate-400 mt-1">{p.description}</p>}
                  <div className="mt-4">
                    {p.price_monthly === 0 ? (
                      <div className="text-2xl font-bold" style={{ color: meta.color }}>رایگان</div>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold" style={{ color: meta.color }}>{p.price_monthly.toLocaleString()}</span>
                          <span className="text-xs text-slate-400">تومان / ماه</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {p.price_yearly.toLocaleString()} تومان / سال
                          {p.price_monthly > 0 && (
                            <span className="mr-1 text-green-400">
                              ({Math.round((1 - p.price_yearly / (p.price_monthly * 12)) * 100)}% تخفیف)
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  <div className="space-y-2 mb-4">
                    {(p.features ?? []).map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span style={{ color: meta.color }} className="text-xs mt-0.5 shrink-0">✓</span>
                        {feat}
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <span style={{ color: meta.color }} className="text-xs shrink-0">✓</span>
                      {p.max_books ? `دسترسی به ${p.max_books} کتاب` : 'دسترسی نامحدود به کتاب‌ها'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2.5 px-3 rounded-xl mb-4"
                    style={{ background: meta.color + '10' }}>
                    <span className="text-xs text-slate-400">اشتراک فعال</span>
                    <span className="text-sm font-bold" style={{ color: meta.color }}>{activeSubs} نفر</span>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={()=>setModal(p)}
                      className="flex-1 py-2 text-sm border rounded-xl hover:opacity-80 transition-colors"
                      style={{ borderColor: meta.color+'50', color: meta.color, background: meta.color+'10' }}>
                      ✏️ ویرایش
                    </button>
                    <button onClick={()=>del(p.id)}
                      className="px-3 py-2 text-sm bg-red-900/30 text-red-400 rounded-xl hover:bg-red-900/50 transition-colors">
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <PlanModal
          plan={modal === 'new' ? null : modal as Plan}
          onClose={()=>setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
