'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, Trash2, Download, Save, ArrowLeft, Image as ImageIcon, 
  Type, Square, Layers, Maximize2, Move, Layout, 
  ChevronRight, ChevronLeft, Type as TypeIcon,
  Trash, Copy, Eye, FileJson, Minus
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
  const [zoom, setZoom] = useState(1)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const fonts = ['Inter', 'Roboto', 'Gmarket Sans', 'NanumSquare', 'System']

  const selectedElement = elements.find(el => el.id === selectedId)

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

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, selectedId, dragOffset, zoom])

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-900 select-none">
      {/* Sidebar - Assets */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col p-4 gap-6 overflow-y-auto z-20">
        <div>
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">기본 요소</h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => addElement('text')} className="flex flex-col items-center gap-2 p-3 bg-slate-700 hover:bg-emerald-600 rounded-xl transition-all text-slate-300">
              <TypeIcon className="w-5 h-5" />
              <span className="text-[10px] font-bold">텍스트</span>
            </button>
            <button onClick={() => addElement('shape')} className="flex flex-col items-center gap-2 p-3 bg-slate-700 hover:bg-emerald-600 rounded-xl transition-all text-slate-300">
              <Square className="w-5 h-5" />
              <span className="text-[10px] font-bold">도형</span>
            </button>
            <button onClick={() => addElement('skill_bar')} className="flex flex-col items-center gap-2 p-3 bg-slate-700 hover:bg-emerald-600 rounded-xl transition-all text-slate-300">
              <Layers className="w-5 h-5" />
              <span className="text-[10px] font-bold">스킬 바</span>
            </button>
            <button onClick={() => addElement('timeline')} className="flex flex-col items-center gap-2 p-3 bg-slate-700 hover:bg-emerald-600 rounded-xl transition-all text-slate-300">
              <Layout className="w-5 h-5" />
              <span className="text-[10px] font-bold">연혁</span>
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">내 프로젝트</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {userProjects.map(p => (
              <button 
                key={p.id}
                onClick={() => addElement('project', p)}
                className="w-full text-left p-3 bg-slate-700/50 hover:bg-emerald-600 rounded-xl text-xs text-slate-300 transition-all truncate font-medium"
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          <label className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold cursor-pointer shadow-lg transition-all">
            <FileJson className="w-4 h-4" />
            템플릿 불러오기
            <input type="file" accept=".json" onChange={handleJsonUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative overflow-auto bg-slate-950 flex items-center justify-center dashboard-grid">
        <div 
          ref={canvasRef}
          className="bg-white shadow-2xl relative shrink-0 overflow-hidden"
          style={{ 
            width: '800px', 
            height: '1131px', // A4 Aspect Ratio 
            transform: `scale(${zoom})`,
            transition: isDragging ? 'none' : 'transform 0.2s'
          }}
        >
          {elements.map(el => (
            <div
              key={el.id}
              onMouseDown={(e) => onMouseDown(el.id, e)}
              className={`absolute cursor-move overflow-hidden transition-shadow ${selectedId === el.id ? 'ring-2 ring-emerald-400 shadow-xl z-50' : ''}`}
              style={{
                left: `${el.x}px`,
                top: `${el.y}px`,
                width: `${el.w}px`,
                height: `${el.h}px`,
                zIndex: el.style.zIndex,
                opacity: el.style.opacity,
                backgroundColor: el.style.backgroundColor,
                transform: 'translateZ(0)'
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
                <div className="w-full h-full flex flex-col bg-white border border-slate-100 shadow-sm rounded-lg overflow-hidden">
                  <div className="h-40 bg-slate-100 relative">
                    {el.content.thumbnail_url ? (
                      <img src={el.content.thumbnail_url} className="w-full h-full object-cover" />
                    ) : (
                       <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon /></div>
                    )}
                  </div>
                  <div className="p-4 flex-1">
                    <h4 className="font-bold text-slate-800 mb-1">{el.content.title}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-3">{el.content.short_description || el.content.content}</p>
                  </div>
                </div>
              )}

              {el.type === 'skill_bar' && (
                <div className="w-full p-4 space-y-3">
                  {(profile.skills || []).map((s: any, i: number) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-700">
                        <span>{s.name}</span>
                        <span>{s.level}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${s.level}%` }}></div>
                      </div>
                    </div>
                  ))}
                  {(!profile.skills || profile.skills.length === 0) && <div className="text-[10px] text-slate-400 italic">스킬 데이터가 없습니다.</div>}
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
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800/80 backdrop-blur-md px-6 py-3 rounded-2xl flex items-center gap-6 border border-slate-700 shadow-2xl z-30">
          <button onClick={() => setZoom(Math.max(0.1, zoom - 0.1))} className="text-slate-400 hover:text-white p-1 transition-colors"><Minus className="w-4 h-4" /></button>
          <span className="text-xs font-black text-slate-300 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="text-slate-400 hover:text-white p-1 transition-colors"><Plus className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Right Properties Panel */}
      <div className="w-72 bg-slate-800 border-l border-slate-700 flex flex-col z-20 overflow-y-auto">
        {selectedElement ? (
          <div className="p-6 space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-200">스타일 편집</h3>
              <button onClick={() => { setElements(elements.filter(el => el.id !== selectedId)); setSelectedId(null); }} className="p-1.5 text-slate-500 hover:text-rose-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Common: Opacity & Z-Index */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">배치 & 투명도</label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input 
                      type="range" min="0" max="1" step="0.1" 
                      value={selectedElement.style.opacity} 
                      onChange={(e) => selectedId && updateStyle(selectedId, { opacity: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  <span className="text-xs text-slate-400">{Math.round((selectedElement.style.opacity || 1) * 100)}%</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => selectedId && updateStyle(selectedId, { zIndex: (selectedElement.style.zIndex || 0) + 1 })} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] font-bold text-slate-300">앞으로</button>
                  <button onClick={() => selectedId && updateStyle(selectedId, { zIndex: Math.max(0, (selectedElement.style.zIndex || 0) - 1) })} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] font-bold text-slate-300">뒤로</button>
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
        <div className="mt-auto p-6 border-t border-slate-700 bg-slate-800/50 space-y-3">
          <button onClick={exportJson} className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
             <Save className="w-4 h-4" /> 템플릿 파일 저장
          </button>
          <div className="flex gap-2">
            <button onClick={() => downloadImage('png')} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-2">
              <Download className="w-3.5 h-3.5" /> PNG
            </button>
            <button onClick={() => downloadImage('jpg')} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-2">
               JPG
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .dashboard-grid {
          background-image: radial-gradient(#334155 1px, transparent 1px);
          background-size: 20px 20px;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e293b;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 10px;
        }
      `}</style>
    </div>
  )
}
