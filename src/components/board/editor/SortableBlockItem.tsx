'use client'

import { useState } from 'react'
import { BlockData } from './types'
import { Plus, GripVertical, X, Image as ImageIcon, Type, LayoutTemplate, PieChart, Upload, Calendar } from 'lucide-react'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { uploadImage } from '@/lib/supabase/storage'
import { format } from 'date-fns'

// Individual Block Wrappers
export function SortableBlockItem({
  block,
  isFocused,
  onFocus,
  onDelete,
  onChange,
}: {
  block: BlockData
  isFocused: boolean
  onFocus: () => void
  onDelete: () => void
  onChange: (newContent: any) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        // Only focus if not clicking interactive elements inside
        onFocus()
      }}
      className={`relative group bg-white border rounded-2xl mb-4 transition-all ${
        isFocused ? 'border-emerald-500 shadow-md' : 'border-slate-200 shadow-sm hover:border-emerald-300'
      }`}
    >
      {/* Drag Handle & Delete */}
      <div className="absolute -left-12 top-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          {...attributes}
          {...listeners}
          className="p-2 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm cursor-grab active:cursor-grabbing"
          title="드래그해서 이동"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className={`absolute -right-3 -top-3 p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full shadow-sm transition-all z-10 ${
          isFocused ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
        }`}
        title="블록 삭제"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Block Content Renderers */}
      <div className="p-5">
        {block.type === 'text' && <TextBlock content={block.content as string} onChange={onChange} />}
        {block.type === 'vertical-image' && <VerticalImageBlock content={block.content as string[]} onChange={onChange} />}
        {block.type === 'swipe-image' && <SwipeImageBlock content={block.content as string[]} onChange={onChange} />}
        {block.type === 'poll' && <PollBlock content={block.content as any} onChange={onChange} />}
      </div>
    </div>
  )
}

function TextBlock({ content, onChange }: { content: string, onChange: (v: string) => void }) {
  return (
    <textarea
      value={content}
      onChange={(e) => {
        onChange(e.target.value)
        // Auto-expand
        e.target.style.height = 'auto'
        e.target.style.height = e.target.scrollHeight + 'px'
      }}
      placeholder="내용을 입력하세요..."
      className="w-full bg-transparent border-none focus:ring-0 resize-none outline-none text-lg text-slate-800 leading-relaxed min-h-[60px]"
      rows={1}
    />
  )
}

function VerticalImageBlock({ content, onChange }: { content: string[], onChange: (v: string[]) => void }) {
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const urls = [...content]
    
    for (let i = 0; i < files.length; i++) {
        if (files[i].size > 5 * 1024 * 1024) continue
        const url = await uploadImage(files[i])
        if (url) urls.push(url)
    }
    onChange(urls)
  }

  const removeImage = (index: number) => {
    onChange(content.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-4">
       <div className="flex items-center justify-between">
           <span className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><LayoutTemplate className="w-4 h-4" /> 수직 이미지</span>
           <label className="cursor-pointer bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2">
              <Upload className="w-4 h-4" />
              이미지 추가
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload}/>
           </label>
       </div>
       <div className="flex flex-col gap-4">
           {content.map((url, i) => (
             <div key={i} className="relative group/img rounded-xl overflow-hidden border border-slate-200">
               <img src={url} alt={`img-${i}`} className="w-full object-cover" />
               <button onClick={() => removeImage(i)} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity"><X className="w-4 h-4"/></button>
             </div>
           ))}
           {content.length === 0 && (
             <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                <ImageIcon className="w-8 h-8 opacity-50" />
                <span className="text-sm">버튼을 눌러 이미지를 추가하세요</span>
             </div>
           )}
       </div>
    </div>
  )
}

function SwipeImageBlock({ content, onChange }: { content: string[], onChange: (v: string[]) => void }) {
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const urls = [...content]
    for (let i = 0; i < files.length; i++) {
        if (files[i].size > 5 * 1024 * 1024) continue
        const url = await uploadImage(files[i])
        if (url) urls.push(url)
    }
    onChange(urls)
  }

  const removeImage = (index: number) => {
    onChange(content.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-4">
       <div className="flex items-center justify-between">
           <span className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><ImageIcon className="w-4 h-4" /> 스와이프 이미지</span>
           <label className="cursor-pointer bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2">
              <Upload className="w-4 h-4" />
              이미지 추가
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload}/>
           </label>
       </div>
       <div className="flex flex-nowrap overflow-x-auto gap-4 snap-x pb-4">
           {content.map((url, i) => (
             <div key={i} className="relative group/img rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 w-[80%] snap-center">
               <img src={url} alt={`img-${i}`} className="w-full h-auto object-cover" />
               <button onClick={() => removeImage(i)} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity"><X className="w-4 h-4"/></button>
             </div>
           ))}
           {content.length === 0 && (
             <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                <ImageIcon className="w-8 h-8 opacity-50" />
                <span className="text-sm">버튼을 눌러 스와이프될 이미지를 추가하세요</span>
             </div>
           )}
       </div>
    </div>
  )
}

function PollBlock({ content, onChange }: { content: any, onChange: (v: any) => void }) {
  const addOption = () => {
    onChange({ ...content, options: [...content.options, { id: crypto.randomUUID(), text: '' }] })
  }
  
  const updateOption = (id: string, text: string) => {
    onChange({ ...content, options: content.options.map((o: any) => o.id === id ? { ...o, text } : o) })
  }

  const removeOption = (id: string) => {
    onChange({ ...content, options: content.options.filter((o: any) => o.id !== id) })
  }

  return (
    <div className="flex flex-col gap-5 p-2">
       <div className="flex items-center justify-between">
           <span className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><PieChart className="w-4 h-4" /> 투표 기능</span>
           <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <input type="date" value={content.endDate || ''} onChange={(e) => onChange({...content, endDate: e.target.value})} className="text-sm border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-emerald-500" />
           </div>
       </div>

       <input
         type="text"
         placeholder="투표 질문을 입력하세요..."
         value={content.question || ''}
         onChange={(e) => onChange({...content, question: e.target.value})}
         className="w-full text-xl font-bold bg-transparent border-none focus:ring-0 outline-none placeholder:text-slate-300"
       />

       <div className="flex flex-col gap-3">
         {content.options?.map((opt: any, i: number) => (
            <div key={opt.id} className="flex items-center gap-3">
              <input
                type="text"
                placeholder={`선택지 ${i + 1}`}
                value={opt.text}
                onChange={(e) => updateOption(opt.id, e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button onClick={() => removeOption(opt.id)} className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl"><X className="w-4 h-4"/></button>
            </div>
         ))}
         <button onClick={addOption} className="mt-2 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600 rounded-xl transition-all font-medium text-sm">
           <Plus className="w-4 h-4" /> 선택지 추가
         </button>
       </div>
    </div>
  )
}
