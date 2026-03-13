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
  const [zoom, setZoom] = useState(0.7)
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [showWizard, setShowWizard] = useState(true)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardConfig, setWizardConfig] = useState({
    useTemplate: true,
    selectedProjectIds: [] as string[],
    fullPageProjects: {} as Record<string, boolean>
  })

  // --- Photo Focus / Picker State ---
  const [focusingPhoto, setFocusingPhoto] = useState<{ elementId: string; imageUrl: string; focus: { x: number; y: number } } | null>(null)
  const [isImagePickerOpen, setIsImagePickerOpen] = useState<{ elementId: string; projectPhotos: string[] } | null>(null)

  const fonts = ['Inter', 'Roboto', 'Gmarket Sans', 'NanumSquare', 'System']
  const selectedElement = elements.find(el => el.id === selectedId)

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

  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el))
  }

  const updateStyle = (id: string, styleUpdates: Partial<CanvasElement['style']>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, style: { ...el.style, ...styleUpdates } } : el))
  }

  const downloadImage = async (format: 'png' | 'jpg') => {
    if (!canvasRef.current) return
    setSelectedId(null)
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

  const handleInitialize = () => {
    const { useTemplate, selectedProjectIds, fullPageProjects } = wizardConfig
    const newElements: CanvasElement[] = []
    let currentY = 50
    let currentPage = 0
    const pageGap = orientation === 'portrait' ? 1131 : 800

    const addPageBreak = () => {
      currentPage++
      currentY = currentPage * pageGap + 50
    }

    if (!useTemplate) {
      if (profile.bio) {
        newElements.push({
          id: 'bio-simple', type: 'text', x: 50, y: 50, w: 700, h: 100,
          content: profile.bio, style: { zIndex: 1, fontSize: 32, fontFamily: 'Inter', fontWeight: '800', textAlign: 'left', color: '#0f172a', opacity: 1 }
        })
      }
      setElements(newElements)
      setShowWizard(false)
      return
    }

    // Page 1: Bio
    newElements.push({
      id: 'profile-img', type: 'image', x: 50, y: 50, w: 200, h: 200,
      content: { url: profile.avatar_url || '', focus: { x: 50, y: 50 } },
      style: { zIndex: 10, borderRadius: 20, opacity: 1 }
    })
    newElements.push({
      id: 'profile-name', type: 'text', x: 280, y: 50, w: 500, h: 60,
      content: profile.display_name,
      style: { zIndex: 11, fontSize: 48, fontWeight: '900', color: '#1e293b', opacity: 1 }
    })
    newElements.push({
      id: 'profile-bio', type: 'text', x: 280, y: 120, w: 450, h: 100,
      content: profile.bio || 'Short Bio Here',
      style: { zIndex: 12, fontSize: 20, fontWeight: '500', color: '#64748b', opacity: 1 }
    })

    // Page 2: Core Values
    const cvs = profile.core_values || []
    if (cvs.length > 0) {
      addPageBreak()
      newElements.push({
        id: 'cv-title', type: 'text', x: 50, y: currentY, w: 300, h: 40,
        content: 'CORE VALUES',
        style: { zIndex: 20, fontSize: 24, fontWeight: '900', color: '#10b981', opacity: 1 }
      })
      cvs.forEach((cv: any, i: number) => {
        newElements.push({
          id: `cv-${i}`, type: 'text', x: 50 + (i * 240), y: currentY + 60, w: 220, h: 180,
          content: `**${cv.title}**\n${cv.content}`,
          style: { zIndex: 21 + i, fontSize: 13, backgroundColor: '#f9fafb', borderRadius: 20, opacity: 1, color: '#374151' }
        })
      })
    }

    // Page 3: Projects
    const selectedProjectsData = userProjects.filter(p => wizardConfig.selectedProjectIds.includes(p.id))
    selectedProjectsData.forEach((project, idx) => {
      addPageBreak()
      newElements.push({
        id: `project-${project.id}`, type: 'project', x: 50, y: currentY, w: 700, h: 500,
        content: project,
        style: { zIndex: 50 + idx, opacity: 1 }
      })
    })

    setElements(newElements)
    setShowWizard(false)
  }

  const renderWizard = () => {
    if (!showWizard) return null
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Portfolio Setup Wizard</h2>
              <p className="text-xs text-slate-500 font-bold uppercase mt-1">Step {wizardStep} of 2</p>
            </div>
          </div>
          <div className="p-10 min-h-[400px]">
            {wizardStep === 1 ? (
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setWizardConfig({...wizardConfig, useTemplate: true})} className={`p-6 rounded-2xl border-2 transition-all text-left ${wizardConfig.useTemplate ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-white/5'}`}>
                   <Layout className="w-8 h-8 mb-3" />
                   <div className="font-black text-white">Use Template</div>
                </button>
                <button onClick={() => setWizardConfig({...wizardConfig, useTemplate: false})} className={`p-6 rounded-2xl border-2 transition-all text-left ${!wizardConfig.useTemplate ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-white/5'}`}>
                   <Square className="w-8 h-8 mb-3" />
                   <div className="font-black text-white">Blank Canvas</div>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-400">Select projects to include (Max 4):</p>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {userProjects.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5">
                      <input 
                        type="checkbox" 
                        checked={wizardConfig.selectedProjectIds.includes(p.id)}
                        onChange={(e) => {
                          const ids = e.target.checked ? [...wizardConfig.selectedProjectIds, p.id] : wizardConfig.selectedProjectIds.filter(id => id !== p.id)
                          setWizardConfig({...wizardConfig, selectedProjectIds: ids.slice(0, 4)})
                        }}
                      />
                      <span className="text-sm text-white font-bold">{p.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="p-8 border-t border-white/5 flex gap-3">
            {wizardStep > 1 && <button onClick={() => setWizardStep(1)} className="px-6 py-3 bg-white/5 text-white rounded-xl font-bold">Back</button>}
            <button onClick={() => wizardStep === 1 ? setWizardStep(2) : handleInitialize()} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-black">{wizardStep === 1 ? 'Next' : 'Generate'}</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[#0a0c10] select-none text-slate-300">
      {/* Top Bar */}
      <div className="h-14 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 z-30">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-black text-white">Make Place.</Link>
          <div className="flex items-center gap-3">
            <Link href="/profile" className="p-2 hover:bg-white/5 rounded-xl transition-colors"><ArrowLeft className="w-4 h-4" /></Link>
            <h1 className="text-[10px] font-black uppercase text-slate-400">Portfolio Studio <span className="text-emerald-500">V1.0</span></h1>
          </div>
        </div>
        <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/5">
           <button onClick={() => setOrientation('portrait')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black ${orientation === 'portrait' ? 'bg-emerald-500 text-white' : ''}`}>PORTRAIT</button>
           <button onClick={() => setOrientation('landscape')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black ${orientation === 'landscape' ? 'bg-emerald-500 text-white' : ''}`}>LANDSCAPE</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Floating Tools */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
          <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 p-2 rounded-2xl shadow-2xl flex flex-col gap-2">
            <button onClick={() => addElement('text')} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-emerald-500 rounded-xl transition-all"><TypeIcon className="w-5 h-5" /></button>
            <button onClick={() => addElement('shape')} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-emerald-500 rounded-xl transition-all"><Square className="w-5 h-5" /></button>
            <button onClick={() => addElement('skill_bar')} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-emerald-500 rounded-xl transition-all"><Layers className="w-5 h-5" /></button>
            <button onClick={() => addElement('timeline')} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-emerald-500 rounded-xl transition-all"><Layout className="w-5 h-5" /></button>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 p-2 rounded-2xl shadow-2xl max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
            {userProjects.map(p => (
              <button key={p.id} onClick={() => addElement('project', p)} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-violet-600 rounded-xl transition-all overflow-hidden">
                {p.thumbnail_url ? <img src={p.thumbnail_url} className="w-full h-full object-cover" /> : <Package className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-auto flex items-center justify-center bg-[#0a0c10] dashboard-grid pt-10 pb-20">
          <div ref={canvasRef} className="bg-white shadow-2xl relative shrink-0 overflow-hidden" 
            style={{ 
              width: orientation === 'portrait' ? '800px' : '1131px', 
              height: orientation === 'portrait' ? '1131px' : '800px', 
              transform: `scale(${zoom})`,
              transition: isDragging ? 'none' : 'transform 0.2s'
            }}>
            {elements.map(el => (
              <div key={el.id} onMouseDown={(e) => onMouseDown(el.id, e)} className={`absolute cursor-move ${selectedId === el.id ? 'ring-2 ring-emerald-500' : ''}`}
                style={{ left: el.x, top: el.y, width: el.w, height: el.h, zIndex: el.style.zIndex, opacity: el.style.opacity, backgroundColor: el.style.backgroundColor }}>
                {el.type === 'text' && <div contentEditable onBlur={(e) => updateElement(el.id, { content: e.currentTarget.textContent })} className="w-full h-full p-2 outline-none" style={{ fontSize: el.style.fontSize, fontFamily: el.style.fontFamily, color: el.style.color, textAlign: el.style.textAlign }}>{el.content}</div>}
                {el.type === 'project' && (
                  <div className="w-full h-full flex flex-col bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-lg group">
                    <div 
                      className="h-40 bg-slate-50 flex items-center justify-center relative cursor-pointer"
                      onClick={() => setIsImagePickerOpen({ 
                        elementId: el.id, 
                        projectPhotos: el.content.images || [] 
                      })}
                    >
                       {el.content.thumbnail_url ? (
                         <img 
                           src={el.content.thumbnail_url} 
                           className="w-full h-full object-cover" 
                           style={{ objectPosition: `${el.content.focus?.x || 50}% ${el.content.focus?.y || 50}%` }}
                         />
                       ) : <ImageIcon className="w-10 h-10 text-slate-200" />}
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                         <span className="text-[10px] font-black text-white bg-white/20 backdrop-blur px-3 py-1.5 rounded-full border border-white/20 uppercase tracking-widest">Change Image</span>
                       </div>
                    </div>
                    <div className="p-6">
                       <h4 className="font-bold text-slate-900 text-lg">{el.content.title}</h4>
                       <p className="text-xs text-slate-500 line-clamp-3 mt-2">{el.content.short_description || el.content.content}</p>
                    </div>
                  </div>
                )}
                {el.type === 'skill_bar' && (
                  <div className="w-full p-6 space-y-4 bg-white shadow-md rounded-2xl">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Skills</h3>
                    {(profile.skills || []).map((s: any, i: number) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-700"><span>{s.name}</span><span>{s.level}%</span></div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${s.level}%` }}></div></div>
                      </div>
                    ))}
                  </div>
                )}
                {el.type === 'timeline' && (
                  <div className="w-full p-4 space-y-3">
                    {(profile.work_history || []).map((h: any, i: number) => (
                      <div key={i} className="border-l-2 border-emerald-200 pl-4 relative">
                        <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                        <div className="text-[10px] font-bold text-slate-800">{h.year}</div>
                        <div className="text-[10px] text-slate-500">{h.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-3xl px-8 py-4 rounded-full flex items-center gap-6 border border-white/10 shadow-2xl z-30">
          <button onClick={() => setZoom(Math.max(0.1, zoom - 0.1))} className="text-slate-500 hover:text-white"><Minus className="w-4 h-4" /></button>
          <span className="text-xs font-bold text-white tabular-nums">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="text-slate-500 hover:text-white"><Plus className="w-4 h-4" /></button>
        </div>

        {/* Right Panel */}
        <div className="w-80 bg-slate-900/80 backdrop-blur-2xl border-l border-white/5 flex flex-col z-20 shadow-2xl">
          {selectedElement ? (
            <div className="p-8 space-y-8">
               <div className="flex justify-between items-center">
                 <h3 className="text-[10px] font-black uppercase text-slate-500">Properties</h3>
                 <button onClick={() => { setElements(elements.filter(el => el.id !== selectedId)); setSelectedId(null); }} className="text-slate-500 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
               </div>
               <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500">Opacity</label>
                    <input type="range" min="0" max="1" step="0.1" value={selectedElement.style.opacity} onChange={(e) => updateStyle(selectedId!, { opacity: parseFloat(e.target.value) })} className="w-full" />
                 </div>
                 {selectedElement.type === 'text' && (
                   <div className="space-y-4">
                     <select value={selectedElement.style.fontFamily} onChange={(e) => updateStyle(selectedId!, { fontFamily: e.target.value })} className="w-full bg-slate-800 text-xs rounded p-2">
                       {fonts.map(f => <option key={f} value={f}>{f}</option>)}
                     </select>
                     <input type="number" value={selectedElement.style.fontSize} onChange={(e) => updateStyle(selectedId!, { fontSize: parseInt(e.target.value) })} className="w-full bg-slate-800 text-xs rounded p-2" />
                     <input type="color" value={selectedElement.style.color} onChange={(e) => updateStyle(selectedId!, { color: e.target.value })} className="w-full h-8 bg-transparent" />
                   </div>
                 )}
               </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 grayscale opacity-40">
               <Maximize2 className="w-8 h-8 mb-4" />
               <p className="text-[10px] font-bold">Select element to Edit</p>
            </div>
          )}
          <div className="mt-auto p-8 border-t border-white/5 space-y-3">
            <button onClick={exportJson} className="w-full py-3 bg-slate-800 text-white rounded-xl text-xs font-bold">Save Template</button>
            <div className="flex gap-2">
               <button onClick={() => downloadImage('png')} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-xs font-bold">PNG</button>
               <button onClick={() => downloadImage('jpg')} className="flex-1 py-3 bg-white/10 text-white rounded-xl text-xs font-bold">JPG</button>
            </div>
          </div>
        </div>
      </div>

      {renderWizard()}
      
      {/* Image Picker Modal */}
      {isImagePickerOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-[32px] overflow-hidden">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-black text-white text-sm uppercase tracking-widest">Select Project Image</h3>
              <button onClick={() => setIsImagePickerOpen(null)} className="p-2 text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4" /></button>
            </div>
            <div className="p-8 grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {isImagePickerOpen.projectPhotos.map((url, i) => (
                <button 
                  key={i} 
                  onClick={() => {
                    updateElement(isImagePickerOpen.elementId, { 
                      content: { ...selectedElement?.content, thumbnail_url: url } 
                    })
                    setIsImagePickerOpen(null)
                    setFocusingPhoto({ elementId: isImagePickerOpen.elementId, imageUrl: url, focus: { x: 50, y: 50 } })
                  }}
                  className="aspect-video rounded-2xl overflow-hidden border-2 border-transparent hover:border-emerald-500 transition-all"
                >
                  <img src={url} className="w-full h-full object-cover" />
                </button>
              ))}
              {isImagePickerOpen.projectPhotos.length === 0 && <div className="col-span-2 py-10 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">No images available</div>}
            </div>
          </div>
        </div>
      )}

      {/* Photo Focus Tool */}
      {focusingPhoto && (
        <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-3xl flex items-center justify-center p-6">
          <div className="w-full max-w-2xl flex flex-col items-center gap-8">
            <div className="text-center">
              <h3 className="text-xl font-black text-white tracking-widest uppercase mb-2">Adjust Image Focus</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em]">Click on the image to set the crop center</p>
            </div>
            
            <div 
              className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl cursor-crosshair group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = ((e.clientX - rect.left) / rect.width) * 100
                const y = ((e.clientY - rect.top) / rect.height) * 100
                setFocusingPhoto({ ...focusingPhoto, focus: { x, y } })
              }}
            >
              <img src={focusingPhoto.imageUrl} className="max-w-full max-h-[60vh] object-contain" />
              <div 
                className="absolute w-12 h-12 border-2 border-emerald-500 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] pointer-events-none transition-all duration-300 flex items-center justify-center"
                style={{ left: `${focusingPhoto.focus.x}%`, top: `${focusingPhoto.focus.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => {
                  updateElement(focusingPhoto.elementId, { 
                    content: { ...elements.find(el => el.id === focusingPhoto.elementId)?.content, focus: focusingPhoto.focus } 
                  })
                  setFocusingPhoto(null)
                }}
                className="px-12 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
              >
                Save Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx global>{`
        .dashboard-grid { background-image: linear-gradient(#1a1d23 1px, transparent 1px), linear-gradient(90deg, #1a1d23 1px, transparent 1px); background-size: 40px 40px; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  )
}
