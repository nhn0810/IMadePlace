'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Plus, Trash2, ArrowLeft, Image as ImageIcon, 
  Square, Layers, Maximize2, Move, Layout, 
  Trash, Copy, Package, Minus, Type as TypeIcon
} from 'lucide-react'
import Link from 'next/link'
import { toPng, toJpeg } from 'html-to-image'

type ElementType = 'text' | 'image' | 'shape' | 'project' | 'skill_bar' | 'timeline' | 'profile_page' | 'project_detail_page'

interface CanvasElement {
  id: string
  pageId: string
  type: ElementType
  x: number
  y: number
  w: number
  h: number
  content: any
  layoutConfig?: {
    mediaWidth?: number; // percentage
  }
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

  // --- History & Undo ---
  const [history, setHistory] = useState<CanvasElement[][]>([])
  
  const saveHistory = useCallback(() => {
    setHistory(prev => {
      const newHistory = [...prev, JSON.parse(JSON.stringify(elements))]
      if (newHistory.length > 30) return newHistory.slice(1) // Limit stack size
      return newHistory
    })
  }, [elements])

  const handleUndo = useCallback(() => {
    if (history.length === 0) return
    const prevElements = history[history.length - 1]
    setElements(prevElements)
    setHistory(prev => prev.slice(0, -1))
  }, [history])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo])

  // --- Multi-page State ---
  const [pages, setPages] = useState<{ id: string }[]>([{ id: 'page-1' }])
  const [activePageId, setActivePageId] = useState<string>('page-1')

  const addPage = () => {
    const newPageId = `page-${pages.length + 1}`
    setPages([...pages, { id: newPageId }])
    setActivePageId(newPageId)
  }

  const deletePage = (id: string) => {
    if (pages.length === 1) return
    setPages(pages.filter(p => p.id !== id))
    setElements(elements.filter(el => el.pageId !== id))
    if (activePageId === id) setActivePageId(pages[0].id)
  }

  // --- Photo Focus / Picker State ---
  const [focusingPhoto, setFocusingPhoto] = useState<{ elementId: string; imageUrl: string; focus: { x: number; y: number } } | null>(null)
  const [isImagePickerOpen, setIsImagePickerOpen] = useState<{ elementId: string; projectPhotos: string[] } | null>(null)

  const fonts = ['Inter', 'Roboto', 'Gmarket Sans', 'NanumSquare', 'System']
  const selectedElement = elements.find(el => el.id === selectedId)

  const extractProjectImages = useCallback((content: string) => {
    if (!content || !content.trim().startsWith('[')) return []
    try {
      const blocks = JSON.parse(content)
      const urls: string[] = []
      blocks.forEach((b: any) => {
        if (b.type === 'vertical-image' || b.type === 'swipe-image') {
          const data = b.content
          if (Array.isArray(data)) {
            data.forEach(item => {
              if (typeof item === 'string') urls.push(item)
              else if (item.url) urls.push(item.url)
            })
          } else if (data.urls && Array.isArray(data.urls)) {
            urls.push(...data.urls)
          } else if (data.url) {
            urls.push(data.url)
          }
        }
      })
      return Array.from(new Set(urls))
    } catch (e) {
      return []
    }
  }, [])

  const addElement = useCallback((type: ElementType, customContent?: any) => {
    saveHistory() // Mark for undo
    // Math.random is used here inside an event handler context (indirectly), 
    // but we use useCallback to stabilize the function itself.
    const id = Math.random().toString(36).substring(2, 9)
    const maxZ = elements.length > 0 ? Math.max(...elements.map(el => el.style.zIndex)) : 0
    const newElement: CanvasElement = {
      id,
      pageId: activePageId,
      type,
      x: 300 + Math.random() * 200, 
      y: 200 + Math.random() * 200,
      w: type === 'text' ? 200 : 300,
      h: type === 'text' ? 50 : 200,
      content: customContent || (type === 'text' ? '내용을 입력하세요' : ''),
      style: {
        zIndex: maxZ + 1,
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
    if (type === 'image' && !customContent) {
       const allPhotos = Array.from(new Set(userProjects.flatMap(p => extractProjectImages(p.content))))
       newElement.content = { url: allPhotos[0] || '', thumbnail_url: allPhotos[0] || '' }
    }
    setElements(prev => [...prev, newElement])
    setSelectedId(id)
  }, [activePageId, elements, userProjects, extractProjectImages])

  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    saveHistory()
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el))
  }

  const updateStyle = (id: string, styleUpdates: Partial<CanvasElement['style']>) => {
    saveHistory()
    setElements(prev => prev.map(el => el.id === id ? { ...el, style: { ...el.style, ...styleUpdates } } : el))
  }

  const deleteElement = (id: string) => {
    saveHistory()
    setElements(prev => prev.filter(el => el.id !== id))
    setSelectedId(null)
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

  const parseProjectContent = (content: string) => {
    const sections = {
      background: '데이터를 입력해주세요.',
      problem: '데이터를 입력해주세요.',
      solution: '데이터를 입력해주세요.',
      period: '기간 정보가 없습니다.',
      tech: [] as string[]
    }
    
    if (!content) return sections

    let plainText = content
    if (content.trim().startsWith('[')) {
      try {
        const blocks = JSON.parse(content)
        plainText = blocks
          .filter((b: any) => b.type === 'text')
          .map((b: any) => b.content)
          .join('\n\n')
          .replace(/<[^>]*>/g, '') 
      } catch (e) {}
    } else {
      plainText = content.replace(/<[^>]*>/g, '') 
    }

    const bgMatch = plainText.match(/(?:Background|배경|동기)[\s:]*([\s\S]*?)(?=(?:Problem|문제|난관|Solution|해결|성과|$))/i)
    const probMatch = plainText.match(/(?:Problem|문제|난관|이슈)[\s:]*([\s\S]*?)(?=(?:Solution|해결|성과|Background|배경|$))/i)
    const solMatch = plainText.match(/(?:Solution|해결|성과|결과)[\s:]*([\s\S]*?)(?=(?:Background|배경|Problem|문제|$))/i)
    const periodMatch = plainText.match(/(?:Period|기간|날짜)[\s:]*([^\n]*)/i)
    const techMatch = plainText.match(/(?:Tech|Stack|기술|스택)[\s:]*([^\n]*)/i)

    if (bgMatch) sections.background = bgMatch[1].trim()
    if (probMatch) sections.problem = probMatch[1].trim()
    if (solMatch) sections.solution = solMatch[1].trim()
    if (periodMatch) sections.period = periodMatch[1].trim()
    if (techMatch) {
      sections.tech = techMatch[1].split(/[,/]/).map(s => s.trim().toUpperCase()).filter(Boolean)
    }

    if (!bgMatch && !probMatch && !solMatch) {
      sections.background = plainText.substring(0, 500).trim() + (plainText.length > 500 ? '...' : '')
    }

    return sections
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
        deleteElement(selectedId)
      }
      
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.getAttribute('contenteditable') !== 'true') {
        const currentIndex = pages.findIndex(p => p.id === activePageId)
        if (e.key === 'ArrowUp' && currentIndex > 0) {
          setActivePageId(pages[currentIndex - 1].id)
        } else if (e.key === 'ArrowDown' && currentIndex < pages.length - 1) {
          setActivePageId(pages[currentIndex + 1].id)
        }
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
  }, [isDragging, selectedId, dragOffset, zoom, activePageId, pages, deleteElement, updateElement])

  const handleInitialize = () => {
    const { useTemplate, selectedProjectIds } = wizardConfig
    const newElements: CanvasElement[] = []
    const newPages: { id: string }[] = [{ id: 'page-1' }]
    
    if (!useTemplate) {
      setPages(newPages)
      setActivePageId('page-1')
      setElements([])
      setShowWizard(false)
      return
    }

    newElements.push({
      id: 'profile-page-root',
      pageId: 'page-1',
      type: 'profile_page',
      x: 0, y: 0, w: 1131, h: 800,
      content: { profile },
      style: { zIndex: 1, opacity: 1 }
    })

    const selectedProjectsData = userProjects.filter(p => selectedProjectIds.includes(p.id))
    selectedProjectsData.forEach((project, idx) => {
      const pageId = `page-${newPages.length + 1}`
      newPages.push({ id: pageId })
      
      newElements.push({
        id: `project-detail-${project.id}`, 
        pageId,
        type: 'project_detail_page', 
        x: 0, y: 0, w: 1131, h: 800,
        content: project,
        layoutConfig: { mediaWidth: 50 },
        style: { zIndex: 10 + idx, opacity: 1 }
      })
    })

    setPages(newPages)
    setElements(newElements)
    setActivePageId('page-1')
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
                <p className="text-sm font-bold text-slate-400">Select projects to include:</p>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {userProjects.map(p => {
                    const isSelected = wizardConfig.selectedProjectIds.includes(p.id)
                    return (
                      <div key={p.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isSelected ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-white/5 border-white/5'}`}>
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={(e) => {
                              const ids = e.target.checked ? [...wizardConfig.selectedProjectIds, p.id] : wizardConfig.selectedProjectIds.filter(id => id !== p.id)
                              setWizardConfig({...wizardConfig, selectedProjectIds: ids})
                            }}
                            className="w-4 h-4 rounded accent-emerald-500"
                          />
                          <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-400'}`}>{p.title}</span>
                        </div>
                        
                        {isSelected && (
                          <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                            <input 
                              type="checkbox" 
                              id={`full-${p.id}`}
                              checked={wizardConfig.fullPageProjects[p.id] || false}
                              onChange={(e) => setWizardConfig({
                                ...wizardConfig, 
                                fullPageProjects: { ...wizardConfig.fullPageProjects, [p.id]: e.target.checked }
                              })}
                              className="w-3.5 h-3.5 accent-violet-500"
                            />
                            <label htmlFor={`full-${p.id}`} className="text-[10px] font-black text-slate-300 uppercase tracking-wider cursor-pointer">Full Page</label>
                          </div>
                        )}
                      </div>
                    )
                  })}
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
      <div className="h-14 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 z-30">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-black text-white">Make Place.</Link>
          <div className="flex items-center gap-3">
            <Link href="/profile" className="p-2 hover:bg-white/5 rounded-xl transition-colors"><ArrowLeft className="w-4 h-4" /></Link>
            <h1 className="text-[10px] font-black uppercase text-slate-400">Portfolio Studio <span className="text-emerald-500">V1.0</span></h1>
          </div>
        </div>
        <div className="flex bg-slate-800/10 px-4 py-1.5 rounded-xl border border-white/5">
           <h1 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Fixed Landscape A4 Editing Mode</h1>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <div className="w-48 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col z-20 overflow-y-auto custom-scrollbar">
          <div className="p-4 space-y-4">
             {pages.map((p, i) => (
               <div key={p.id} className="relative group">
                 <button 
                   onClick={() => setActivePageId(p.id)}
                   className={`w-full aspect-[1/1.41] rounded-xl border-2 transition-all flex items-center justify-center overflow-hidden bg-white/5 ${activePageId === p.id ? 'border-emerald-500 shadow-lg shadow-emerald-500/20' : 'border-white/5 hover:border-white/20'}`}
                 >
                   <span className="text-[10px] font-black text-slate-500">PAGE {i + 1}</span>
                 </button>
                 {pages.length > 1 && (
                   <button 
                     onClick={(e) => { e.stopPropagation(); deletePage(p.id); }}
                     className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
                   >
                     <Trash className="w-3 h-3" />
                   </button>
                 )}
               </div>
             ))}
             <button 
               onClick={addPage}
               className="w-full aspect-[1/1.41] rounded-xl border-2 border-dashed border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 flex flex-col items-center justify-center gap-2 transition-all group"
             >
               <Plus className="w-5 h-5 text-slate-500 group-hover:text-emerald-500" />
               <span className="text-[8px] font-black text-slate-500 group-hover:text-emerald-500 uppercase">Add Page</span>
             </button>
          </div>
        </div>

        <div className="absolute left-[200px] top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
          <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 p-2 rounded-2xl shadow-2xl flex flex-col gap-2">
            {/* Simplified Toolbar: Only Text and Image */}
            <button onClick={() => addElement('text')} className="p-4 rounded-2xl bg-slate-800/80 hover:bg-emerald-600 text-white transition-all shadow-xl group relative">
              <TypeIcon className="w-6 h-6" />
              <span className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">텍스트 배치 박스</span>
            </button>
            <button onClick={() => addElement('image')} className="p-4 rounded-2xl bg-slate-800/80 hover:bg-emerald-600 text-white transition-all shadow-xl group relative">
              <ImageIcon className="w-6 h-6" />
              <span className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">사진 배치 박스</span>
            </button>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 p-2 rounded-2xl shadow-2xl max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
            {userProjects.map(p => (
              <button key={p.id} onClick={() => addElement('project', p)} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-violet-600 rounded-xl transition-all overflow-hidden">
                {p.thumbnail_url ? <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <Package className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 relative overflow-auto flex items-center justify-center bg-[#0a0c10] dashboard-grid pt-10 pb-20">
          <div 
            ref={canvasRef} 
            className="bg-white shadow-2xl relative shrink-0 overflow-hidden" 
            style={{ 
              width: '1131px', 
              height: '800px', 
              transform: `scale(${zoom})`,
              transition: isDragging ? 'none' : 'transform 0.2s'
            }}>
            {elements.filter(el => el.pageId === activePageId).map(el => (
              <div key={el.id} onMouseDown={(e) => onMouseDown(el.id, e)} className={`absolute cursor-move ${selectedId === el.id ? 'ring-2 ring-emerald-500' : ''}`}
                style={{ left: el.x, top: el.y, width: el.w, height: el.h, zIndex: el.style.zIndex, opacity: el.style.opacity, backgroundColor: el.style.backgroundColor }}>
                {el.type === 'profile_page' && (() => {
                  const p = el.content.profile || profile
                  return (
                    <div className="w-full h-full flex flex-col p-12 bg-white text-slate-900 border border-slate-100" style={{ WebkitPrintColorAdjust: 'exact' } as any}>
                      <div className="flex-shrink-0 border-b-2 border-slate-900 pb-6 mb-8">
                         <h1 
                           contentEditable 
                           suppressContentEditableWarning
                           onBlur={(e) => updateElement(el.id, { content: { ...el.content, profile: { ...p, display_name: e.currentTarget.textContent } } })}
                           className="text-5xl font-black mb-2 uppercase tracking-tight outline-none focus:ring-2 ring-emerald-500/20 px-1 rounded"
                         >
                           {p.display_name}
                         </h1>
                         <p 
                           contentEditable 
                           suppressContentEditableWarning
                           onBlur={(e) => updateElement(el.id, { content: { ...el.content, profile: { ...p, bio: e.currentTarget.textContent } } })}
                           className="text-xl text-slate-500 font-medium outline-none focus:ring-2 ring-emerald-500/20 px-1 rounded"
                         >
                           {p.bio || '사용자 경험을 설계하는 개발자'}
                         </p>
                      </div>
                      <div className="flex flex-1 gap-12 overflow-hidden">
                         <div className="w-[35%] flex flex-col gap-8">
                            <div 
                               className="w-48 h-64 rounded-2xl border-4 border-slate-100 shadow-2xl overflow-hidden self-center cursor-pointer relative group bg-slate-50"
                               title="사진 변경"
                               onClick={() => {
                                  const allPhotos = Array.from(new Set(userProjects.flatMap(proj => extractProjectImages(proj.content))))
                                  setIsImagePickerOpen({ elementId: el.id, projectPhotos: allPhotos })
                               }}
                             >
                               <img src={p.avatar_url || ''} alt="" className="w-full h-full object-cover" />
                               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <span className="text-[10px] font-black text-white uppercase tracking-widest bg-white/20 backdrop-blur px-3 py-1.5 rounded-full border border-white/20">Change Photo</span>
                               </div>
                            </div>
                            <div className="space-y-4">
                               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Information</h3>
                               <div className="space-y-2 text-xs font-bold text-slate-700">
                                  <div>Email: {p.email}</div>
                                  {p.work_history?.[0] && <div>Edu/Main: {p.work_history[0].content}</div>}
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden">
                               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-4">Timeline</h3>
                               <div className="space-y-4 overflow-y-auto h-full pr-2 custom-scrollbar">
                                  {(p.work_history || []).map((h: any, i: number) => (
                                    <div key={i} className="border-l-2 border-emerald-500 pl-4 relative pb-2">
                                      <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-emerald-500"></div>
                                      <div className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{h.year} {h.duration && `| ${h.duration}`}</div>
                                      <div className="text-[10px] text-slate-500 font-medium leading-relaxed">{h.content}</div>
                                    </div>
                                  ))}
                               </div>
                            </div>
                         </div>
                         <div className="flex-1 flex flex-col gap-10">
                            <div className="space-y-6">
                               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Core Values</h3>
                               <div className="grid grid-cols-2 gap-4">
                                  {(p.core_values || []).slice(0, 4).map((cv: any, i: number) => (
                                    <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                                      <h4 className="text-xs font-black text-slate-800 mb-1">{cv.title}</h4>
                                      <p className="text-[10px] text-slate-500 leading-relaxed truncate-2-lines">{cv.content}</p>
                                    </div>
                                  ))}
                               </div>
                            </div>
                            <div className="flex-1 flex flex-col min-h-0">
                               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-6">Technical Skills</h3>
                               <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-4 custom-scrollbar">
                                  {(p.skills || []).map((s: any, i: number) => (
                                    <div key={i} className="space-y-1.5">
                                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-600"><span>{s.name}</span><span>{s.level}%</span></div>
                                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                         <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000" style={{ width: `${s.level}%` }}></div>
                                      </div>
                                    </div>
                                  ))}
                               </div>
                            </div>
                         </div>
                      </div>
                    </div>
                  )
                })()}

                {el.type === 'project_detail_page' && (() => {
                  const p = el.content
                  const parsed = parseProjectContent(p.content)
                  const sections = {
                    background: p.overrides?.background || parsed.background,
                    problem: p.overrides?.problem || parsed.problem,
                    solution: p.overrides?.solution || parsed.solution,
                    period: p.overrides?.period || parsed.period,
                    tech: p.overrides?.tech ? p.overrides.tech.split(',') : (p.tech_stack || parsed.tech)
                  }
                  const mediaWidth = el.layoutConfig?.mediaWidth || 50
                  
                  return (
                    <div className="w-full h-full flex flex-col p-12 bg-white text-slate-900 border border-slate-100" style={{ WebkitPrintColorAdjust: 'exact' } as any}>
                      <div className="flex-shrink-0 border-b-2 border-slate-900 pb-4 mb-6 flex items-center justify-between">
                        <div>
                          <h2 
                            contentEditable 
                            suppressContentEditableWarning
                            onBlur={(e) => updateElement(el.id, { content: { ...el.content, title: e.currentTarget.textContent } })}
                            className="text-3xl font-black uppercase tracking-tight outline-none focus:ring-2 ring-emerald-500/20 px-1 rounded"
                          >
                             Project: {p.title}
                          </h2>
                          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{sections.period}</p>
                        </div>
                        <div className="flex gap-2">
                           {(sections.tech || []).slice(0, 4).map((tech: string, i: number) => (
                             <span key={i} className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black rounded-full uppercase tracking-widest">{tech.trim()}</span>
                           ))}
                        </div>
                      </div>

                      <div className="flex flex-1 gap-10 min-h-0 mb-8 items-start">
                        <div className="flex-shrink-0 relative group h-full max-h-[350px]" style={{ width: `${mediaWidth}%` }}>
                          <div className="w-full h-full bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 shadow-inner group-hover:ring-2 ring-emerald-500/50 transition-all cursor-pointer"
                            onClick={() => {
                              const projectImages = extractProjectImages(p.content)
                              setIsImagePickerOpen({ elementId: el.id, projectPhotos: projectImages })
                            }}>
                            <img src={p.thumbnail_url || (p.images?.[0]) || ''} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${p.focus?.x || 50}% ${p.focus?.y || 50}%` }} />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="text-[10px] font-black text-white bg-white/20 backdrop-blur px-3 py-1.5 rounded-full border border-white/20 uppercase tracking-widest">Select Image</span>
                            </div>
                          </div>
                          <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-2 h-12 bg-slate-200 rounded-full cursor-col-resize hover:bg-emerald-400 transition-colors z-30"
                            onMouseDown={(e) => {
                              e.stopPropagation()
                              const startX = e.clientX
                              const startWidth = mediaWidth
                              const moveHandler = (mmE: MouseEvent) => {
                                const diff = (mmE.clientX - startX) / zoom / 11.31
                                updateElement(el.id, { layoutConfig: { mediaWidth: Math.min(80, Math.max(20, startWidth + diff)) } })
                              }
                              const upHandler = () => {
                                window.removeEventListener('mousemove', moveHandler)
                                window.removeEventListener('mouseup', upHandler)
                              }
                              window.addEventListener('mousemove', moveHandler)
                              window.addEventListener('mouseup', upHandler)
                            }}></div>
                        </div>
                        <div className="flex-1 min-w-0 pr-4 flex flex-col h-full">
                           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-4">Overview</h3>
                           <p 
                             contentEditable 
                             suppressContentEditableWarning
                             onBlur={(e) => updateElement(el.id, { content: { ...el.content, short_description: e.currentTarget.textContent } })}
                             className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap flex-1 overflow-y-auto custom-scrollbar outline-none focus:ring-2 ring-emerald-500/20 p-1 rounded"
                           >
                              {p.short_description || p.content?.substring(0, 500) || '프로젝트의 전반적인 의도와 핵심 기능을 설명하는 영역입니다.'}
                           </p>
                        </div>
                      </div>

                      <div className="flex-shrink-0 grid grid-cols-3 gap-6 h-[180px] mt-auto">
                        {[
                          { label: 'BACKGROUND', content: sections.background },
                          { label: 'PROBLEM', content: sections.problem },
                          { label: 'SOLUTION & RESULT', content: sections.solution }
                        ].map((card, i) => (
                          <div key={i} className="bg-slate-50 p-5 border-t-[3px] border-slate-900 flex flex-col rounded-b-xl shadow-sm overflow-hidden">
                            <span className="text-[10px] font-black text-slate-400 mb-3 tracking-widest">{card.label}</span>
                            <div className="text-[11px] font-semibold text-slate-700 leading-relaxed overflow-y-auto pr-1 flex-1 custom-scrollbar whitespace-pre-wrap">
                              {card.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {el.type === 'text' && <div contentEditable suppressContentEditableWarning onBlur={(e) => updateElement(el.id, { content: e.currentTarget.textContent })} className="w-full h-full p-2 outline-none" style={{ fontSize: el.style.fontSize, fontFamily: el.style.fontFamily, color: el.style.color, textAlign: el.style.textAlign }}>{el.content}</div>}
                
                {el.type === 'image' && (
                  <div 
                    className="w-full h-full relative group cursor-pointer" 
                    style={{ 
                        borderRadius: el.style.borderRadius, 
                        overflow: 'hidden',
                        border: el.id === 'profile-img' ? '10px solid white' : 'none',
                        boxShadow: el.id === 'profile-img' ? '0 20px 50px rgba(0,0,0,0.15)' : 'none'
                    }}
                    onClick={() => {
                        const allPhotos = Array.from(new Set(userProjects.flatMap(proj => extractProjectImages(proj.content))))
                        setIsImagePickerOpen({ elementId: el.id, projectPhotos: allPhotos })
                    }}
                  >
                    <img 
                      src={el.content.url} 
                      alt=""
                      className="w-full h-full object-cover" 
                      style={{ objectPosition: `${el.content.focus?.x || 50}% ${el.content.focus?.y || 50}%` }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                       <span className="text-[10px] font-black text-white bg-white/20 backdrop-blur px-3 py-1.5 rounded-full border border-white/20 uppercase tracking-widest">Change Photo</span>
                    </div>
                  </div>
                )}
                
                {el.type === 'shape' && (
                  <div 
                    className="w-full h-full" 
                    style={{ 
                      borderRadius: el.style.borderRadius,
                      backgroundImage: el.id === 'header-banner' 
                        ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%)' 
                        : undefined 
                    }}
                  ></div>
                )}

                {el.type === 'project' && (
                  <div className="w-full h-full flex flex-col bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-lg group">
                    <div 
                      className="h-40 bg-slate-50 flex items-center justify-center relative cursor-pointer"
                      onClick={() => setIsImagePickerOpen({ 
                        elementId: el.id, 
                        projectPhotos: extractProjectImages(el.content.content)
                      })}
                    >
                       {el.content.thumbnail_url ? (
                         <img 
                           src={el.content.thumbnail_url} 
                           alt=""
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
              </div>
            ))}
          </div>
        </div>

        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-3xl px-8 py-4 rounded-full flex items-center gap-6 border border-white/10 shadow-2xl z-30">
          <button onClick={() => setZoom(Math.max(0.1, zoom - 0.1))} className="text-slate-500 hover:text-white"><Minus className="w-4 h-4" /></button>
          <span className="text-xs font-bold text-white tabular-nums">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="text-slate-500 hover:text-white"><Plus className="w-4 h-4" /></button>
        </div>

        <div className="w-[380px] bg-slate-900/90 backdrop-blur-3xl border-l border-white/10 flex flex-col z-20 shadow-[-20px_0_50px_rgba(0,0,0,0.3)]">
          {selectedElement ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
               <div className="flex justify-between items-center p-8 pb-4 border-b border-white/5">
                 <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Element Properties</h3>
                 <button 
                   onClick={() => deleteElement(selectedId!)} 
                   className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                   title="Delete Element"
                 >
                   <Trash2 className="w-5 h-5" />
                 </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar pb-24">
                 <div className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500">Opacity</label>
                      <input type="range" min="0" max="1" step="0.1" value={selectedElement.style.opacity} onChange={(e) => updateStyle(selectedId!, { opacity: parseFloat(e.target.value) })} className="w-full" />
                   </div>
                   
                   {selectedElement.type === 'project_detail_page' && (
                     <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Period</label>
                           <input type="text" value={selectedElement.content.overrides?.period || parseProjectContent(selectedElement.content.content).period} 
                             onChange={(e) => updateElement(selectedId!, { content: { ...selectedElement.content, overrides: { ...(selectedElement.content.overrides || {}), period: e.target.value } } })} 
                             className="w-full bg-slate-800 text-[10px] p-2 rounded-lg text-white" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tech Stack (comma separated)</label>
                           <input type="text" value={selectedElement.content.overrides?.tech || (selectedElement.content.tech_stack || parseProjectContent(selectedElement.content.content).tech).join(', ')} 
                             onChange={(e) => updateElement(selectedId!, { content: { ...selectedElement.content, overrides: { ...(selectedElement.content.overrides || {}), tech: e.target.value } } })} 
                             className="w-full bg-slate-800 text-[10px] p-2 rounded-lg text-white" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Background</label>
                           <textarea value={selectedElement.content.overrides?.background || parseProjectContent(selectedElement.content.content).background} 
                             onChange={(e) => updateElement(selectedId!, { content: { ...selectedElement.content, overrides: { ...(selectedElement.content.overrides || {}), background: e.target.value } } })} 
                             className="w-full h-24 bg-slate-800 text-[10px] p-2 rounded-lg text-white resize-none" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Problem</label>
                           <textarea value={selectedElement.content.overrides?.problem || parseProjectContent(selectedElement.content.content).problem} 
                             onChange={(e) => updateElement(selectedId!, { content: { ...selectedElement.content, overrides: { ...(selectedElement.content.overrides || {}), problem: e.target.value } } })} 
                             className="w-full h-24 bg-slate-800 text-[10px] p-2 rounded-lg text-white resize-none" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Solution</label>
                           <textarea value={selectedElement.content.overrides?.solution || parseProjectContent(selectedElement.content.content).solution} 
                             onChange={(e) => updateElement(selectedId!, { content: { ...selectedElement.content, overrides: { ...(selectedElement.content.overrides || {}), solution: e.target.value } } })} 
                             className="w-full h-24 bg-slate-800 text-[10px] p-2 rounded-lg text-white resize-none" />
                        </div>
                        
                        <div className="pt-4 flex flex-col gap-2">
                          <button 
                            onClick={() => {
                              const pageRoot = elements.find(er => er.pageId === activePageId && (er.type === 'project_detail_page' || er.type === 'profile_page'))
                              if (pageRoot) {
                                let allPhotos = []
                                if (pageRoot.type === 'project_detail_page') {
                                   allPhotos = extractProjectImages(pageRoot.content.content)
                                } else {
                                   allPhotos = Array.from(new Set(userProjects.flatMap(proj => extractProjectImages(proj.content))))
                                }
                                addElement('image', { url: allPhotos[0] || '', thumbnail_url: allPhotos[0] || '' })
                              } else {
                                addElement('image')
                              }
                            }}
                            className="w-full py-2 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all text-center"
                          >
                             + Add Image to Slide
                          </button>
                          <button 
                            onClick={() => updateElement(selectedId!, { content: { ...selectedElement.content, overrides: {} } })} 
                            className="w-full py-2 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/5 hover:text-white transition-all text-center"
                          >
                             Reset to Auto-Parse
                          </button>
                        </div>
                     </div>
                   )}

                   {selectedElement.type === 'text' && (
                     <div className="space-y-4">
                       <select value={selectedElement.style.fontFamily} onChange={(e) => updateStyle(selectedId!, { fontFamily: e.target.value })} className="w-full bg-slate-800 text-xs rounded p-2 text-white border-0">
                         {fonts.map(f => <option key={f} value={f}>{f}</option>)}
                       </select>
                       <div className="flex items-center gap-2">
                          <label className="text-[10px] font-black text-slate-500">Size</label>
                          <input type="number" value={selectedElement.style.fontSize} onChange={(e) => updateStyle(selectedId!, { fontSize: parseInt(e.target.value) })} className="flex-1 bg-slate-800 text-xs rounded p-2 text-white border-0" />
                       </div>
                       <div className="flex items-center gap-2">
                          <label className="text-[10px] font-black text-slate-500">Color</label>
                          <input type="color" value={selectedElement.style.color} onChange={(e) => updateStyle(selectedId!, { color: e.target.value })} className="w-full h-10 bg-transparent border-0 cursor-pointer" />
                       </div>
                     </div>
                   )}

                   {selectedElement.type === 'image' && (
                     <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500">Corner Radius</label>
                          <input type="range" min="0" max="200" step="10" value={selectedElement.style.borderRadius} onChange={(e) => updateStyle(selectedId!, { borderRadius: parseInt(e.target.value) })} className="w-full" />
                        </div>
                     </div>
                   )}
                 </div>
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
      
      {isImagePickerOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-[32px] overflow-hidden">
                <div className="flex items-center justify-between mb-8 p-8 border-b border-white/5">
                  <h2 className="text-2xl font-black text-white tracking-tight">SELECT IMAGE</h2>
                  <div className="flex items-center gap-4">
                    <label className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl cursor-pointer transition-all shadow-lg active:scale-95">
                      내 PC에서 업로드
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onload = (event) => {
                              const dataUrl = event.target?.result as string
                              const currentElement = elements.find(e => e.id === isImagePickerOpen.elementId)
                              
                              if (currentElement?.type === 'profile_page') {
                                updateElement(isImagePickerOpen.elementId, { 
                                  content: { 
                                    ...currentElement.content, 
                                    profile: { 
                                      ...(currentElement.content.profile || profile), 
                                      avatar_url: dataUrl 
                                    } 
                                  } 
                                })
                              } else {
                                updateElement(isImagePickerOpen.elementId, { 
                                  content: { ...currentElement?.content, url: dataUrl, thumbnail_url: dataUrl } 
                                })
                              }
                              setIsImagePickerOpen(null)
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                      />
                    </label>
                    <button onClick={() => setIsImagePickerOpen(null)} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all">
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="p-8 grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {isImagePickerOpen.projectPhotos.map((url, i) => (
                <button 
                  key={i} 
                  onClick={() => {
                    const el = elements.find(e => e.id === isImagePickerOpen.elementId)
                    if (el?.type === 'profile_page') {
                      updateElement(isImagePickerOpen.elementId, { 
                        content: { ...el.content, profile: { ...el.content.profile, avatar_url: url } } 
                      })
                    } else {
                      updateElement(isImagePickerOpen.elementId, { 
                        content: { ...elements.find(e => e.id === isImagePickerOpen.elementId)?.content, url: url, thumbnail_url: url } 
                      })
                    }
                    setIsImagePickerOpen(null)
                    setFocusingPhoto({ elementId: isImagePickerOpen.elementId, imageUrl: url, focus: { x: 50, y: 50 } })
                  }}
                  className="aspect-video rounded-2xl overflow-hidden border-2 border-transparent hover:border-emerald-500 transition-all"
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
              {isImagePickerOpen.projectPhotos.length === 0 && <div className="col-span-2 py-10 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">No images available</div>}
            </div>
          </div>
        </div>
      )}

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
              <img src={focusingPhoto.imageUrl} alt="" className="max-w-full max-h-[60vh] object-contain" />
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
