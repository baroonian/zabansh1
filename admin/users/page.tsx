'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile, Plan } from '@/types'

const Modal = ({ title, children, onClose, onSave, saving }: {
  title:string; children:React.ReactNode
  onClose:()=>void; onSave?:()=>void; saving?:boolean
}) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className="bg-ocean-800 border border-ocean-600 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-5 border-b border-ocean-600">
        <h3 className="font-semibold text-white">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
      </div>
      <div className="p-5">{children}</div>
      {onSave && (
        <div className="flex gap-3 justify-end p-5 border-t border-ocean-600">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 border border-ocean-600 rounded-lg hover:border-slate-400">لغو</button>
          <button onClick={onSave} disabled={saving}
            className="px-5 py-2 text-sm bg-amber-500 text-ocean-950 font-bold rounded-lg hover:bg-amber-400 disabled:opacity-50">
            {saving ? 'ذخیره...' : 'ذخیره'}
          </button>
        </div>
      )}
    </div>
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

function UserModal({ user, plans, onClose, onSaved }: {
  user:UserProfile; plans:Plan[]; onClose:()=>void; onSaved:()=>void
}) {
  const sb = createClient()
  const [subs, setSubs] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(user.is_admin)
  const [isBlocked, setIsBlocked] = useState(user.is_blocked)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [newSub, setNewSub] = useState({
    plan_id: plans[0]?.id ?? '',
    billing_cycle: 'monthly' as 'monthly'|'yearly',
    months: '1',
  })
  const [addingSub, setAddingSub] = useState(false)

  useEffect(() => {
    sb.from('user_subscriptions').select('*, plan:plans(*)').eq('user_id', user.id)
      .order('created_at', { ascending:false })
      .then(r => setSubs(r.data ?? []))
  }, [user.id])

  const save = async () => {
    setSaving(true); setErr('')
    const { error } = await sb.from('users').update({
      is_admin: isAdmin,
      is_blocked: isBlocked,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved(); onClose()
  }

  const addSubscription = async () => {
    if (!newSub.plan_id) return
    setAddingSub(true)
    const months = parseInt(newSub.months) || 1
    const now = new Date()
    const expires = new Date(now)
    if (newSub.billing_cycle === 'monthly') expires.setMonth(expires.getMonth() + months)
    else expires.setFullYear(expires.getFullYear() + months)

    const plan = plans.find(p => p.id === newSub.plan_id)
    const amount = newSub.billing_cycle === 'monthly'
      ? (plan?.price_monthly ?? 0) * months
      : (plan?.price_yearly ?? 0) * Math.ceil(months / 12)

    const { error } = await sb.from('user_subscriptions').insert({
      user_id: user.id,
      plan_id: newSub.plan_id,
      billing_cycle: newSub.billing_cycle,
      status: 'active',
      started_at: now.toISOString(),
      expires_at: expires.toISOString(),
      amount_paid: amount,
    })
    setAddingSub(false)
    if (error) { alert('خطا: ' + error.message); return }
    const r = await sb.from('user_subscriptions').select('*, plan:plans(*)').eq('user_id', user.id).order('created_at', { ascending:false })
    setSubs(r.data ?? [])
  }

  const cancelSub = async (id: string) => {
    const { error } = await sb.from('user_subscriptions').update({ status:'cancelled' }).eq('id', id)
    if (error) { alert(error.message); return }
    setSubs(ss => ss.map(s => s.id === id ? { ...s, status:'cancelled' } : s))
  }

  const statusColor: Record<string,string> = {
    active:'bg-green-900/40 text-green-400', expired:'bg-red-900/40 text-red-400',
    cancelled:'bg-slate-700 text-slate-400', trial:'bg-blue-900/40 text-blue-400'
  }
  const statusLabel: Record<string,string> = { active:'فعال', expired:'منقضی', cancelled:'لغوشده', trial:'آزمایشی' }

  return (
    <Modal title={`مدیریت: ${user.full_name || user.email}`} onClose={onClose} onSave={save} saving={saving}>
      <div className="flex items-center gap-3 mb-5 p-3 bg-ocean-900 rounded-xl">
        <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-ocean-950 font-bold">
          {(user.full_name || user.email || 'U')[0].toUpperCase()}
        </div>
        <div>
          <div className="text-white font-medium text-sm">{user.full_name || '—'}</div>
          <div className="text-slate-400 text-xs">{user.email}</div>
        </div>
      </div>

      <div className="space-y-3 mb-5 p-4 bg-ocean-900 rounded-xl">
        <p className="text-xs text-slate-400 font-medium mb-3">سطح دسترسی</p>
        <Toggle value={isAdmin} onChange={()=>setIsAdmin(v=>!v)} label="ادمین سیستم" />
        <Toggle value={isBlocked} onChange={()=>setIsBlocked(v=>!v)} label="مسدود شده" />
      </div>

      {err && <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-400 text-xs">{err}</div>}

      <div className="mb-4">
        <p className="text-xs text-slate-400 font-medium mb-3">اشتراک‌ها</p>
        {subs.length > 0 && (
          <div className="space-y-2 mb-3">
            {subs.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-ocean-900 rounded-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{s.plan?.name_fa}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[s.status]??''}`}>{statusLabel[s.status]}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {s.billing_cycle==='monthly'?'ماهیانه':'سالیانه'} · انقضا: {new Date(s.expires_at).toLocaleDateString('fa-IR')}
                  </div>
                  <div className="text-xs text-slate-600">{Number(s.amount_paid).toLocaleString()} تومان</div>
                </div>
                {s.status === 'active' && (
                  <button onClick={()=>cancelSub(s.id)}
                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1 bg-red-900/20 rounded-lg">لغو</button>
                )}
              </div>
            ))}
          </div>
        )}

        {plans.length > 0 && (
          <div className="p-3 border border-dashed border-ocean-500 rounded-xl">
            <p className="text-xs text-slate-500 mb-3">افزودن اشتراک جدید</p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <select value={newSub.plan_id} onChange={e=>setNewSub(s=>({...s,plan_id:e.target.value}))}
                className="col-span-1 px-2 py-2 bg-ocean-900 border border-ocean-500 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500">
                {plans.map(p => <option key={p.id} value={p.id}>{p.name_fa}</option>)}
              </select>
              <select value={newSub.billing_cycle} onChange={e=>setNewSub(s=>({...s,billing_cycle:e.target.value as 'monthly'|'yearly'}))}
                className="px-2 py-2 bg-ocean-900 border border-ocean-500 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500">
                <option value="monthly">ماهیانه</option>
                <option value="yearly">سالیانه</option>
              </select>
              <input type="number" min="1" value={newSub.months} onChange={e=>setNewSub(s=>({...s,months:e.target.value}))}
                placeholder={newSub.billing_cycle==='monthly'?'ماه':'سال'}
                className="px-2 py-2 bg-ocean-900 border border-ocean-500 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500" />
            </div>
            <button onClick={addSubscription} disabled={addingSub}
              className="w-full py-2 text-xs bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 disabled:opacity-50 transition-colors">
              {addingSub ? 'در حال افزودن...' : '+ افزودن اشتراک'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function UsersPage() {
  const sb = createClient()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState<UserProfile|null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const load = useCallback(async () => {
    setLoading(true)
    const from = (page - 1) * PAGE_SIZE
    let q = sb.from('users').select('*', { count:'exact' }).order('created_at', { ascending:false }).range(from, from + PAGE_SIZE - 1)
    if (search) q = q.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
    if (filter === 'admin')   q = q.eq('is_admin', true)
    if (filter === 'blocked') q = q.eq('is_blocked', true)
    const [uRes, pRes] = await Promise.all([q, sb.from('plans').select('*').eq('is_active', true)])
    setUsers(uRes.data ?? [])
    setPlans(pRes.data ?? [])
    setLoading(false)
  }, [search, filter, page])

  useEffect(() => { load() }, [load])

  const toggleBlock = async (u: UserProfile) => {
    const { error } = await sb.from('users').update({
      is_blocked: !u.is_blocked,
      updated_at: new Date().toISOString()
    }).eq('id', u.id)
    if (error) { alert(error.message); return }
    load()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">کاربران</h1>
          <p className="text-slate-400 text-sm mt-1">{users.length} کاربر</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}
          placeholder="جستجو ایمیل یا نام..."
          className="px-4 py-2 bg-ocean-800 border border-ocean-600 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 w-56" />
        {[['all','همه'],['admin','ادمین'],['blocked','مسدود']].map(([k,l]) => (
          <button key={k} onClick={()=>{setFilter(k);setPage(1)}}
            className={`px-4 py-2 rounded-xl text-sm transition-colors ${filter===k?'bg-amber-500 text-ocean-950 font-bold':'bg-ocean-800 text-slate-400 border border-ocean-600 hover:border-ocean-500'}`}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">در حال بارگذاری...</div>
      ) : (
        <div className="bg-ocean-800 border border-ocean-600 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ocean-600 text-slate-400 text-xs">
                <th className="text-right px-5 py-3 font-medium">کاربر</th>
                <th className="text-right px-4 py-3 font-medium">وضعیت</th>
                <th className="text-right px-4 py-3 font-medium">نقش</th>
                <th className="text-right px-4 py-3 font-medium">تاریخ عضویت</th>
                <th className="text-right px-4 py-3 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-500">کاربری پیدا نشد</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="border-b border-ocean-700 hover:bg-ocean-700 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                        {(u.full_name || u.email || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">{u.full_name || '—'}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs px-2 py-1 rounded-full ${u.is_blocked?'bg-red-900/40 text-red-400':'bg-green-900/40 text-green-400'}`}>
                      {u.is_blocked?'مسدود':'فعال'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {u.is_admin
                      ? <span className="text-xs px-2 py-1 rounded-full bg-amber-900/40 text-amber-400">ادمین</span>
                      : <span className="text-xs text-slate-500">کاربر</span>
                    }
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">
                    {new Date(u.created_at).toLocaleDateString('fa-IR')}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2">
                      <button onClick={()=>setModal(u)}
                        className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-ocean-700 rounded-lg transition-colors">
                        ✏️ مدیریت
                      </button>
                      <button onClick={()=>toggleBlock(u)}
                        className={`text-xs px-2 py-1 rounded-lg transition-colors ${u.is_blocked?'bg-green-900/30 text-green-400 hover:bg-green-900/50':'bg-red-900/20 text-red-400 hover:bg-red-900/40'}`}>
                        {u.is_blocked?'🔓':'🔒'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-5 py-3 border-t border-ocean-600">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
              className="text-xs text-slate-400 disabled:opacity-30 hover:text-white px-3 py-1.5 border border-ocean-600 rounded-lg">← قبلی</button>
            <span className="text-xs text-slate-500">صفحه {page}</span>
            <button onClick={()=>setPage(p=>p+1)} disabled={users.length < PAGE_SIZE}
              className="text-xs text-slate-400 disabled:opacity-30 hover:text-white px-3 py-1.5 border border-ocean-600 rounded-lg">بعدی →</button>
          </div>
        </div>
      )}

      {modal && (
        <UserModal user={modal} plans={plans} onClose={()=>setModal(null)} onSaved={load} />
      )}
    </div>
  )
}
