'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, Trash2, Download, Save, ArrowLeft, Image as ImageIcon, 
  Type, Square, Layers, Maximize2, Move, Layout, 
  ChevronRight, ChevronLeft, Type as TypeIcon,
  Trash, Copy, Eye, FileJson, Minus, Package
} from 'lucide-react'
import Link from 'next/link'
import { toPng, toJpeg } from 'html-to-image'

type ElementType = 'text' | 'image' | 'shape' | 'project' | 'skill_bar' | 'timeline'

interface CanvasElement {
  id: string
  type: ElementType
  x: number
  y: number
  w: number
  h: number
  content: any
  style: {
    fontSize?: number
    fontFamily?: string
    color?: string
    backgroundColor?: string
    opacity?: number
    zIndex: number
    borderRadius?: number
    textAlign?: 'left' | 'center' | 'right'
    fontWeight?: string
  }
}

export function PortfolioBuilder({ profile, userProjects }: { profile: any; userProjects: any[] }) {
  const [elements, setElements] = useState<CanvasElement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(0.7) // Default to fit better
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const fonts = ['Inter', 'Roboto', 'Gmarket Sans', 'NanumSquare', 'System']
  const selectedElement = elements.find(el => el.id === selectedId)

  // Auto-placement on load
  useEffect(() => {
    if (elements.length === 0) {
      const initialElements: CanvasElement[] = []
      
      // Bio
      if (profile.bio) {
        initialElements.push({
          id: 'bio-default',
          type: 'text',
          x: 50, y: 50, w: 700, h: 100,
          content: profile.bio,
          style: { zIndex: 1, opacity: 1, fontSize: 32, fontFamily: 'Inter', fontWeight: '800', textAlign: 'left', color: '#0f172a' }
        })
      }

      // Skills
      if (profile.skills && profile.skills.length > 0) {
        initialElements.push({
          id: 'skills-default',
          type: 'skill_bar',
          x: 50, y: 200, w: 340, h: 400,
          content: '',
          style: { zIndex: 2, opacity: 1 }
        })
      }

      // Timeline
      if (profile.work_history && profile.work_history.length > 0) {
        initialElements.push({
          id: 'timeline-default',
          type: 'timeline',
          x: 410, y: 200, w: 340, h: 400,
          content: '',
          style: { zIndex: 3, opacity: 1 }
        })
      }

      if (initialElements.length > 0) setElements(initialElements)
    }
  }, [profile])

  // 1. Add Element
  const addElement = (type: ElementType, customContent?: any) => {
    const id = Math.random().toString(36).substr(2, 9)
    let newElement: CanvasElement = {
      id,
      type,
      x: 100,
      y: 100,
      w: type === 'text' ? 200 : 300,
      h: type === 'text' ? 50 : 200,
      content: customContent || (type === 'text' ? '내용을 입력하세요' : ''),
      style: {
        zIndex: elements.length + 1,
        opacity: 1,
        color: '#1e293b',
        fontSize: 16,
        fontFamily: 'Inter',
        textAlign: 'left',
        backgroundColor: type === 'shape' ? '#10b981' : 'transparent'
      }
    }

    if (type === 'project' && customContent) {
      newElement.w = 500
      newElement.h = 350
    }

    setElements([...elements, newElement])
    setSelectedId(id)
  }

  // 2. Update Element
  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el))
  }

  const updateStyle = (id: string, styleUpdates: Partial<CanvasElement['style']>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, style: { ...el.style, ...styleUpdates } } : el))
  }

  // 3. Export
  const downloadImage = async (format: 'png' | 'jpg') => {
    if (!canvasRef.current) return
    setSelectedId(null) // Deselect for export
    
    // Wait for state update
    setTimeout(async () => {
      const func = format === 'png' ? toPng : toJpeg
      const dataUrl = await func(canvasRef.current!, { quality: 0.95, backgroundColor: '#ffffff' })
      const link = document.createElement('a')
      link.download = `portfolio-${Date.now()}.${format}`
      link.href = dataUrl
      link.click()
    }, 100)
  }

  const exportJson = () => {
    const data = JSON.stringify(elements)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `portfolio-template-${Date.now()}.json`
    link.href = url
    link.click()
  }

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        setElements(data)
      } catch (err) {
        alert('잘못된 템플릿 파일입니다.')
      }
    }
    reader.readAsText(file)
  }

  // 4. Drag Logic
  const onMouseDown = (id: string, e: React.MouseEvent) => {
    setSelectedId(id)
    setIsDragging(true)
    const el = elements.find(el => el.id === id)
    if (el) {
      setDragOffset({
        x: e.clientX / zoom - el.x,
        y: e.clientY / zoom - el.y
      })
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && selectedId) {
        updateElement(selectedId, {
          x: e.clientX / zoom - dragOffset.x,
          y: e.clientY / zoom - dragOffset.y
        })
      }
    }
    const handleMouseUp = () => setIsDragging(false)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedId && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (document.activeElement?.getAttribute('contenteditable') === 'true' || 
            document.activeElement?.tagName === 'INPUT' || 
            document.activeElement?.tagName === 'TEXTAREA') return
            
        setElements(prev => prev.filter(el => el.id !== selectedId))
        setSelectedId(null)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDragging, selectedId, dragOffset, zoom])

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[#0a0c10] select-none text-slate-300">
      {/* Top Bar - Clean & Integrated */}
      <div className="h-14 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 z-30">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <h1 className="text-lg font-black tracking-tighter text-white">Make Place.</h1>
          </Link>
          <div className="w-[1px] h-4 bg-white/10"></div>
          <div className="flex items-center gap-3">
            <Link href="/profile" className="p-2 hover:bg-white/5 rounded-xl transition-colors group">
              <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-white" />
            </Link>
            <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Portfolio Studio <span className="text-emerald-500 ml-2">V1.0</span></h1>
          </div>
        </div>

        <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/5">
           <button 
             onClick={() => setOrientation('portrait')}
             className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${orientation === 'portrait' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
           >
             PORTRAIT
           </button>
           <button 
             onClick={() => setOrientation('landscape')}
             className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${orientation === 'landscape' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
           >
             LANDSCAPE
           </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Floating Tools - Compact Left */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
          <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 p-2 rounded-2xl shadow-2xl flex flex-col gap-2">
            <button onClick={() => addElement('text')} title="Add Text" className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-emerald-500 hover:text-white rounded-xl transition-all group">
              <TypeIcon className="w-5 h-5" />
            </button>
            <button onClick={() => addElement('shape')} title="Add Shape" className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-emerald-500 hover:text-white rounded-xl transition-all group">
              <Square className="w-5 h-5" />
            </button>
            <button onClick={() => addElement('skill_bar')} title="Add Resume Skills" className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-emerald-500 hover:text-white rounded-xl transition-all group">
              <Layers className="w-5 h-5" />
            </button>
            <button onClick={() => addElement('timeline')} title="Add Resume Timeline" className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-emerald-500 hover:text-white rounded-xl transition-all group">
              <Layout className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 p-2 rounded-2xl shadow-2xl max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
            <div className="text-[8px] font-black text-slate-500 uppercase text-center py-1">Projects</div>
            {userProjects.map(p => (
              <button 
                key={p.id}
                onClick={() => addElement('project', p)}
                title={p.title}
                className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-violet-600 hover:text-white rounded-xl transition-all truncate group overflow-hidden"
              >
                {p.thumbnail_url ? <img src={p.thumbnail_url} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 opacity-40" />}
              </button>
            ))}
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 relative overflow-auto flex items-center justify-center dashboard-grid bg-[#0a0c10] pt-10 pb-20">
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-violet-500/5 pointer-events-none"></div>
          <div 
            ref={canvasRef}
            className="bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative shrink-0 overflow-hidden"
            style={{ 
              width: orientation === 'portrait' ? '800px' : '1131px', 
              height: orientation === 'portrait' ? '1131px' : '800px', 
              transform: `scale(${zoom})`,
              transition: isDragging ? 'none' : 'transform 0.2s, width 0.3s, height 0.3s'
            }}
          >
          {elements.map(el => (
            <div
              key={el.id}
              onMouseDown={(e) => onMouseDown(el.id, e)}
              className={`absolute cursor-move overflow-hidden transition-all duration-300 ${selectedId === el.id ? 'ring-[3px] ring-emerald-400 ring-offset-[3px] ring-offset-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-50 rounded-lg' : 'hover:ring-1 hover:ring-slate-300'}`}
              style={{
                left: `${el.x}px`,
                top: `${el.y}px`,
                width: `${el.w}px`,
                height: `${el.h}px`,
                zIndex: el.style.zIndex,
                opacity: el.style.opacity,
                backgroundColor: el.style.backgroundColor,
                transform: `translateZ(0) ${selectedId === el.id ? 'scale(1.02)' : 'scale(1)'}`,
                boxShadow: selectedId === el.id ? 'none' : '0 2px 10px rgba(0,0,0,0.02)'
              }}
            >
              {el.type === 'text' && (
                <div 
                  contentEditable 
                  suppressContentEditableWarning
                  onBlur={(e) => updateElement(el.id, { content: e.currentTarget.textContent })}
                  className="w-full h-full p-2 outline-none"
                  style={{
                    fontSize: `${el.style.fontSize}px`,
                    fontFamily: el.style.fontFamily,
                    color: el.style.color,
                    textAlign: el.style.textAlign,
                    fontWeight: el.style.fontWeight
                  }}
                >
                  {el.content}
                </div>
              )}

              {el.type === 'shape' && <div className="w-full h-full" />}

              {el.type === 'project' && (
                <div className="w-full h-full flex flex-col bg-white/95 backdrop-blur-sm border border-slate-100 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.1)] rounded-[32px] overflow-hidden group/card relative">
                  <div className="h-48 bg-slate-50 relative overflow-hidden">
                    {el.content.thumbnail_url ? (
                      <img src={el.content.thumbnail_url} className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700" alt="thumbnail" />
                    ) : (
                       <div className="w-full h-full flex items-center justify-center text-slate-200 bg-slate-50"><ImageIcon className="w-12 h-12" /></div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
                  </div>
                  <div className="p-7 flex-1 flex flex-col pt-0 transform -translate-y-4">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 px-3 py-1 bg-emerald-50 rounded-full w-fit">Featured Project</span>
                    <h4 className="font-extrabold text-slate-900 text-xl mb-3 tracking-tight">{el.content.title}</h4>
                    <p className="text-[12px] text-slate-500 line-clamp-4 leading-relaxed font-medium">{el.content.short_description || el.content.content}</p>
                    <div className="mt-auto pt-6 flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200"></div>
                       <span className="text-[10px] font-bold text-slate-400">View Presentation →</span>
                    </div>
                  </div>
                </div>
              )}

              {el.type === 'skill_bar' && (
                <div className="w-full p-8 space-y-5 bg-white shadow-xl rounded-[24px]">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b pb-4 border-slate-50">Technical Expertise</h3>
                  {(profile.skills || []).map((s: any, i: number) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-[11px] font-black text-slate-700">
                        <span className="tracking-tight">{s.name}</span>
                        <span className="text-emerald-500">{s.level}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-[1px]">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${s.level}%` }}></div>
                      </div>
                    </div>
                  ))}
                  {(!profile.skills || profile.skills.length === 0) && <div className="text-[11px] text-slate-400 italic text-center py-4">No skill data found.</div>}
                </div>
              )}

              {el.type === 'timeline' && (
                <div className="w-full p-4 space-y-4">
                  {(profile.work_history || []).map((h: any, i: number) => (
                    <div key={i} className="flex gap-4 border-l-2 border-emerald-200 pl-4 relative">
                      <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-emerald-500"></div>
                      <div>
                        <div className="text-xs font-black text-slate-800">{h.year}</div>
                        <div className="text-[11px] text-slate-500">{h.content}</div>
                      </div>
                    </div>
                  ))}
                   {(!profile.work_history || profile.work_history.length === 0) && <div className="text-[10px] text-slate-400 italic">이력 데이터가 없습니다.</div>}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-3xl px-8 py-4 rounded-[24px] flex items-center gap-10 border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] z-30 group/zoom">
          <button onClick={() => setZoom(Math.max(0.1, zoom - 0.1))} className="text-slate-500 hover:text-white p-2 transition-all hover:bg-white/5 rounded-xl"><Minus className="w-5 h-5" /></button>
          <div className="flex flex-col items-center">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Scale</span>
             <span className="text-[13px] font-black text-white w-14 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          </div>
          <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="text-slate-500 hover:text-white p-2 transition-all hover:bg-white/5 rounded-xl"><Plus className="w-5 h-5" /></button>
          <div className="w-[1px] h-8 bg-white/10 mx-2"></div>
          <button onClick={() => setZoom(1)} className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest">Reset</button>
        </div>
      </div>

      {/* Right Properties Panel */}
      <div className="w-80 bg-slate-900/60 backdrop-blur-2xl border-l border-white/5 flex flex-col z-20 overflow-y-auto shadow-2xl">
        {selectedElement ? (
          <div className="p-8 space-y-10">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <h3 className="font-black text-white tracking-widest text-[10px] uppercase mb-1">Properties</h3>
                <span className="text-[11px] text-slate-500 font-bold capitalize">{selectedElement.type} Element</span>
              </div>
              <button 
                onClick={() => { setElements(elements.filter(el => el.id !== selectedId)); setSelectedId(null); }} 
                className="p-3 text-slate-500 hover:text-white hover:bg-rose-500/20 rounded-2xl transition-all border border-transparent hover:border-rose-500/30"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-8">
              {/* Common: Opacity & Z-Index */}
              <div className="space-y-5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                   <Layers className="w-3.5 h-3.5" /> Arrangement
                </label>
                <div className="bg-slate-800/50 p-5 rounded-[24px] border border-white/5 space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-bold text-slate-400">Opacity</span>
                       <span className="text-[11px] font-black text-emerald-400">{Math.round((selectedElement.style.opacity || 1) * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.1" 
                      value={selectedElement.style.opacity} 
                      onChange={(e) => selectedId && updateStyle(selectedId, { opacity: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-500 h-1.5 rounded-full bg-slate-700 appearance-none cursor-pointer"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => selectedId && updateStyle(selectedId, { zIndex: (selectedElement.style.zIndex || 0) + 1 })} className="flex-1 py-3 bg-slate-700/50 hover:bg-slate-700 border border-white/5 hover:border-white/10 rounded-xl text-[10px] font-black text-slate-200 transition-all active:scale-95">MOVE FRONT</button>
                    <button onClick={() => selectedId && updateStyle(selectedId, { zIndex: Math.max(0, (selectedElement.style.zIndex || 0) - 1) })} className="flex-1 py-3 bg-slate-700/50 hover:bg-slate-700 border border-white/5 hover:border-white/10 rounded-xl text-[10px] font-black text-slate-200 transition-all active:scale-95">MOVE BACK</button>
                  </div>
                </div>
              </div>

              {/* Text Properties */}
              {selectedElement.type === 'text' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase">글꼴</label>
                     <select 
                       value={selectedElement.style.fontFamily || 'Inter'} 
                       onChange={(e) => updateStyle(selectedId!, { fontFamily: e.target.value })}
                       className="w-full bg-slate-900 border-none text-xs text-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500"
                     >
                       {fonts.map(f => <option key={f} value={f}>{f}</option>)}
                     </select>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase">크기</label>
                      <input 
                        type="number" 
                        value={selectedElement.style.fontSize || 16}
                        onChange={(e) => updateStyle(selectedId!, { fontSize: parseInt(e.target.value) })}
                        className="w-full bg-slate-900 border-none text-xs text-slate-300 rounded-lg p-2"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase">색상</label>
                       <input 
                         type="color" 
                         value={selectedElement.style.color || '#000000'}
                         onChange={(e) => updateStyle(selectedId!, { color: e.target.value })}
                         className="w-full h-8 bg-transparent border-none cursor-pointer"
                       />
                    </div>
                  </div>
                </div>
              )}

              {/* Shape Properties */}
              {selectedElement.type === 'shape' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">배경색</label>
                    <input 
                       type="color" 
                       value={selectedElement.style.backgroundColor || '#ffffff'}
                       onChange={(e) => updateStyle(selectedId!, { backgroundColor: e.target.value })}
                       className="w-full h-10 bg-transparent border-none cursor-pointer"
                     />
                  </div>
                </div>
              )}

              {/* Resize Controls */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">크기 조절</label>
                <div className="grid grid-cols-2 gap-2">
                   <div className="space-y-1">
                     <span className="text-[9px] text-slate-500">너비</span>
                     <input type="number" value={Math.round(selectedElement.w)} onChange={(e) => updateElement(selectedId!, { w: parseInt(e.target.value) })} className="w-full bg-slate-900 text-xs p-2 rounded-lg text-slate-300" />
                   </div>
                   <div className="space-y-1">
                     <span className="text-[9px] text-slate-500">높이</span>
                     <input type="number" value={Math.round(selectedElement.h)} onChange={(e) => updateElement(selectedId!, { h: parseInt(e.target.value) })} className="w-full bg-slate-900 text-xs p-2 rounded-lg text-slate-300" />
                   </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <Maximize2 className="w-10 h-10 mb-4 opacity-20" />
            <p className="text-xs font-medium">요소를 선택하여<br/>스타일을 편집하세요</p>
          </div>
        )}

        {/* Save/Export Panel */}
        <div className="mt-auto p-8 border-t border-white/5 bg-slate-900/80 backdrop-blur-xl space-y-4 shadow-[0_-20px_40px_rgba(0,0,0,0.2)]">
          <button onClick={exportJson} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 rounded-[20px] text-[11px] font-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95">
             <Save className="w-4 h-4 text-emerald-400" /> Save Template
          </button>
          <div className="flex gap-2">
            <button onClick={() => downloadImage('png')} className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-[20px] text-[11px] font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 uppercase tracking-tighter">
              <Download className="w-4 h-4" /> PNG Export
            </button>
            <button onClick={() => downloadImage('jpg')} className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white rounded-[20px] text-[11px] font-black transition-all flex items-center justify-center gap-2 active:scale-95 uppercase tracking-tighter">
               JPG
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .dashboard-grid {
          background-image: 
            linear-gradient(#1a1d23 1px, transparent 1px),
            linear-gradient(90deg, #1a1d23 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.4);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.4);
        }
      `}</style>
      </div>
    </div>
  )
}
