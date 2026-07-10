'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ImageUpload from '@/components/ui/ImageUpload'
import type { Category } from '@/types'

const COLORS = ['#6366f1','#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#f472b6','#14b8a6','#0ea5e9','#a78bfa']

const Inp = ({ label,value,onChange,placeholder,type='text' }:{ label:string;value:string;onChange:(v:string)=>void;placeholder?:string;type?:string }) => (
  <div className="mb-4">
    <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2.5 bg-ocean-900 border border-ocean-500 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500" />
  </div>
)

interface CatForm {
  name:string;name_fa:string;description:string;color:string
  icon:string;sort_order:string;is_active:boolean;image_url:string
}
const EMPTY:CatForm = { name:'',name_fa:'',description:'',color:'#6366f1',icon:'',sort_order:'0',is_active:true,image_url:'' }

export default function CategoriesPage() {
  const sb = createClient()
  const [cats, setCats]   = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null|'new'|Category>(null)
  const [form, setForm]   = useState<CatForm>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [err, setErr]     = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await sb.from('categories').select('*').order('sort_order')
    setCats(data??[]); setLoading(false)
  }
  useEffect(()=>{ load() },[])

  const openNew = () => { setForm(EMPTY); setErr(''); setModal('new') }
  const openEdit = (c:Category) => {
    setErr('')
    setForm({ name:c.name,name_fa:c.name_fa,description:c.description??'',color:c.color,
      icon:c.icon??'',sort_order:String(c.sort_order),is_active:c.is_active,image_url:c.image_url??'' })
    setModal(c)
  }

  const save = async () => {
    if (!form.name_fa.trim()) { setErr('نام فارسی الزامی است'); return }
    setSaving(true); setErr('')
    const payload = {
      name:form.name||form.name_fa, name_fa:form.name_fa,
      description:form.description||null, color:form.color,
      icon:form.icon||null, sort_order:parseInt(form.sort_order)||0,
      is_active:form.is_active, image_url:form.image_url||null,
    }
    const res = modal==='new'
      ? await sb.from('categories').insert(payload)
      : await sb.from('categories').update(payload).eq('id',(modal as Category).id)
    setSaving(false)
    if (res.error) { setErr(res.error.message); return }
    setModal(null); load()
  }

  const del = async (id:string) => {
    if (!confirm('این دسته‌بندی حذف شود؟')) return
    const {error} = await sb.from('categories').delete().eq('id',id)
    if (error) { alert(error.message); return }
    load()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">دسته‌بندی‌ها</h1>
          <p className="text-slate-400 text-sm mt-1">{cats.length} دسته‌بندی</p>
        </div>
        <button onClick={openNew} className="px-4 py-2.5 bg-amber-500 text-ocean-950 font-bold rounded-xl hover:bg-amber-400 text-sm">+ دسته جدید</button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">در حال بارگذاری...</div>
      ) : cats.length===0 ? (
        <div className="text-center py-20 text-slate-500">
          <div className="text-4xl mb-3">🗂️</div>
          <p className="mb-4">هنوز دسته‌بندی‌ای وجود ندارد</p>
          <button onClick={openNew} className="px-5 py-2 bg-amber-500 text-ocean-950 font-bold rounded-xl text-sm hover:bg-amber-400">+ دسته جدید</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cats.map(c=>(
            <div key={c.id} className="bg-ocean-800 border border-ocean-600 rounded-2xl overflow-hidden hover:border-ocean-500 transition-all hover:-translate-y-0.5 group">
              {/* Cover */}
              <div className="h-32 relative overflow-hidden" style={{background:c.image_url?undefined:`${c.color}22`}}>
                {c.image_url
                  ? <img src={c.image_url} alt={c.name_fa} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <span className="text-5xl">{c.icon||'📁'}</span>
                    </div>
                }
                {/* Color dot */}
                <div className="absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-white/30" style={{background:c.color}} />
                {!c.is_active && <span className="absolute top-2 left-2 bg-red-900/80 text-red-300 text-xs px-2 py-0.5 rounded-full">غیرفعال</span>}
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-ocean-900/60 to-transparent" />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-white text-sm mb-0.5">{c.name_fa}</h3>
                <p className="text-xs text-slate-500 mb-1">{c.name}</p>
                {c.description && <p className="text-xs text-slate-400 line-clamp-2 mb-3">{c.description}</p>}
                <div className="flex gap-2">
                  <button onClick={()=>openEdit(c)} className="flex-1 py-1.5 text-xs bg-ocean-700 hover:bg-ocean-600 text-slate-300 rounded-lg transition-colors">✏️ ویرایش</button>
                  <button onClick={()=>del(c.id)} className="px-3 py-1.5 text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors">🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-ocean-800 border border-ocean-600 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-ocean-600">
              <h3 className="font-semibold text-white">{modal==='new'?'دسته‌بندی جدید':'ویرایش دسته‌بندی'}</h3>
              <button onClick={()=>setModal(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                <Inp label="نام فارسی *" value={form.name_fa} onChange={v=>setForm(f=>({...f,name_fa:v}))} placeholder="مثلاً: سطح ساده" />
                <Inp label="نام انگلیسی" value={form.name}    onChange={v=>setForm(f=>({...f,name:v}))}    placeholder="Beginner" />
              </div>
              <div className="mb-4">
                <label className="block text-xs text-slate-400 mb-1.5">توضیحات</label>
                <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2} placeholder="توضیح کوتاه..."
                  className="w-full px-3 py-2.5 bg-ocean-900 border border-ocean-500 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none" />
              </div>

              {/* Image upload */}
              <ImageUpload
                value={form.image_url}
                onChange={v=>setForm(f=>({...f,image_url:v}))}
                bucket="covers"
                folder="categories"
                label="تصویر دسته‌بندی"
              />

              {/* Color */}
              <div className="mb-4">
                <label className="block text-xs text-slate-400 mb-2">رنگ</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c=>(
                    <button key={c} onClick={()=>setForm(f=>({...f,color:c}))} className="w-7 h-7 rounded-full transition-all"
                      style={{background:c, outline:form.color===c?`3px solid ${c}`:'none', outlineOffset:2}} />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <Inp label="آیکون (emoji)" value={form.icon}       onChange={v=>setForm(f=>({...f,icon:v}))}       placeholder="📚" />
                <Inp label="ترتیب"         value={form.sort_order} onChange={v=>setForm(f=>({...f,sort_order:v}))} type="number" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <div onClick={()=>setForm(f=>({...f,is_active:!f.is_active}))}
                  className={`w-10 h-5 rounded-full relative transition-colors ${form.is_active?'bg-amber-500':'bg-ocean-600'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${form.is_active?'left-5':'left-0.5'}`} />
                </div>
                <span className="text-sm text-slate-300">فعال</span>
              </label>

              {err && <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-400 text-xs">{err}</div>}
            </div>
            <div className="flex gap-3 justify-end p-5 border-t border-ocean-600">
              <button onClick={()=>setModal(null)} className="px-4 py-2 text-sm text-slate-400 border border-ocean-600 rounded-lg hover:border-slate-400">لغو</button>
              <button onClick={save} disabled={saving} className="px-5 py-2 text-sm bg-amber-500 text-ocean-950 font-bold rounded-lg hover:bg-amber-400 disabled:opacity-50">
                {saving?'ذخیره...':'ذخیره'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
