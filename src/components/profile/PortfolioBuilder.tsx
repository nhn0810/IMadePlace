'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Plus, Trash2, ArrowLeft, Image as ImageIcon, 
  Square, Layers, Maximize2, Move, Layout, 
  Trash, Copy, Package, Minus, Type as TypeIcon
} from 'lucide-react'
import Link from 'next/link'
import { toPng, toJpeg } from 'html-to-image'

type ElementType = 'text' | 'image' | 'shape' | 'project' | 'skill_bar' | 'timeline'

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
  
  // --- Resizing State ---
  const [resizingId, setResizingId] = useState<string | null>(null)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null) // 'tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r'
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0, elX: 0, elY: 0 })

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

  const onResizeStart = (id: string, handle: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const el = elements.find(el => el.id === id)
    if (!el) return
    setResizingId(id)
    setResizeHandle(handle)
    setResizeStart({
      x: e.clientX / zoom,
      y: e.clientY / zoom,
      w: el.w,
      h: el.h,
      elX: el.x,
      elY: el.y
    })
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
      
      if (resizingId && resizeHandle) {
        const dx = e.clientX / zoom - resizeStart.x
        const dy = e.clientY / zoom - resizeStart.y
        const el = elements.find(el => el.id === resizingId)
        if (!el) return

        let newX = el.x
        let newY = el.y
        let newW = el.w
        let newH = el.h

        if (resizeHandle.includes('r')) newW = Math.max(20, resizeStart.w + dx)
        if (resizeHandle.includes('b')) newH = Math.max(20, resizeStart.h + dy)
        
        if (resizeHandle.includes('l')) {
          const w = Math.max(20, resizeStart.w - dx)
          if (w !== 20) {
            newW = w
            newX = resizeStart.elX + dx
          }
        }
        
        if (resizeHandle.includes('t')) {
          const h = Math.max(20, resizeStart.h - dy)
          if (h !== 20) {
            newH = h
            newY = resizeStart.elY + dy
          }
        }

        updateElement(resizingId, { x: newX, y: newY, w: newW, h: newH })
      }
    }
    const handleMouseUp = () => {
       setIsDragging(false)
       setResizingId(null)
       setResizeHandle(null)
    }
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
    const { selectedProjectIds } = wizardConfig
    const newElements: CanvasElement[] = []
    const newPages: { id: string }[] = [{ id: 'page-1' }]
    
    // Decompose Profile Template
    const p = profile
    // Header
    newElements.push({
      id: 'profile-name', pageId: 'page-1', type: 'text', x: 48, y: 48, w: 1035, h: 60,
      content: p.display_name, style: { zIndex: 1, color: '#0f172a', fontSize: 48, fontWeight: '900', textAlign: 'left', fontFamily: 'Inter' }
    })
    newElements.push({
      id: 'profile-bio', pageId: 'page-1', type: 'text', x: 48, y: 110, w: 1035, h: 30,
      content: p.bio || '사용자 경험을 설계하는 개발자', style: { zIndex: 2, color: '#64748b', fontSize: 18, fontWeight: '500', textAlign: 'left', fontFamily: 'Inter' }
    })
    newElements.push({
      id: 'profile-line', pageId: 'page-1', type: 'shape', x: 48, y: 155, w: 1035, h: 2,
      content: '', style: { zIndex: 3, backgroundColor: '#0f172a', opacity: 1 }
    })
    
    // Left Column
    newElements.push({
      id: 'profile-avatar', pageId: 'page-1', type: 'image', x: 120, y: 200, w: 220, h: 290,
      content: { url: p.avatar_url || '', focus: { x: 50, y: 50 } }, style: { zIndex: 4, borderRadius: 16 }
    })
    newElements.push({
      id: 'profile-info-label', pageId: 'page-1', type: 'text', x: 80, y: 520, w: 300, h: 20,
      content: 'INFORMATION', style: { zIndex: 5, color: '#94a3b8', fontSize: 10, fontWeight: '900', textAlign: 'left', fontFamily: 'Inter' }
    })
    newElements.push({
      id: 'profile-email', pageId: 'page-1', type: 'text', x: 80, y: 545, w: 300, h: 20,
      content: `Email: ${p.email}`, style: { zIndex: 6, color: '#334155', fontSize: 12, fontWeight: '700', textAlign: 'left', fontFamily: 'Inter' }
    })

    // Core Values
    newElements.push({
      id: 'profile-cv-label', pageId: 'page-1', type: 'text', x: 450, y: 170, w: 600, h: 20,
      content: 'CORE VALUES', style: { zIndex: 10, color: '#94a3b8', fontSize: 10, fontWeight: '900', textAlign: 'left', fontFamily: 'Inter' }
    })
    
    const coreValues = p.core_values || []
    coreValues.slice(0, 4).forEach((cv: any, i: number) => {
      const row = Math.floor(i / 2)
      const col = i % 2
      newElements.push({
        id: `profile-cv-${i}`, pageId: 'page-1', type: 'text', x: 450 + col * 310, y: 200 + row * 110, w: 290, h: 90,
        content: `${cv.title}\n${cv.content}`, style: { zIndex: 11 + i, fontSize: 10, backgroundColor: '#f8fafc', borderRadius: 16, color: '#334155', fontWeight: '500' }
      })
    })

    // Skills
    newElements.push({
      id: 'profile-skills-label', pageId: 'page-1', type: 'text', x: 450, y: 440, w: 600, h: 20,
      content: 'TECHNICAL SKILLS', style: { zIndex: 20, color: '#94a3b8', fontSize: 10, fontWeight: '900', textAlign: 'left', fontFamily: 'Inter' }
    })
    
    const skills = p.skills || []
    skills.slice(0, 6).forEach((s: any, i: number) => {
      newElements.push({
        id: `profile-skill-${i}`, pageId: 'page-1', type: 'text', x: 450, y: 470 + i * 35, w: 600, h: 30,
        content: `${s.name} - ${s.level}%`, style: { zIndex: 21 + i, fontSize: 12, color: '#10b981', fontWeight: '900', textAlign: 'left' }
      })
    })

    // Timeline
    newElements.push({
      id: 'profile-timeline-label', pageId: 'page-1', type: 'text', x: 80, y: 580, w: 300, h: 20,
      content: 'TIMELINE', style: { zIndex: 30, color: '#94a3b8', fontSize: 10, fontWeight: '900', textAlign: 'left', fontFamily: 'Inter' }
    })
    
    const timeline = p.work_history || []
    timeline.slice(0, 3).forEach((h: any, i: number) => {
      newElements.push({
        id: `profile-tl-${i}`, pageId: 'page-1', type: 'text', x: 80, y: 610 + i * 50, w: 300, h: 45,
        content: `${h.year}: ${h.content}`, style: { zIndex: 31 + i, fontSize: 10, color: '#64748b', fontWeight: '500', textAlign: 'left' }
      })
    })

    const selectedProjectsData = userProjects.filter(p => selectedProjectIds.includes(p.id))
    selectedProjectsData.forEach((project, idx) => {
      const pageId = `page-${newPages.length + 1}`
      newPages.push({ id: pageId })
      
      const parsed = parseProjectContent(project.content)
      const sections = {
        background: project.overrides?.background || parsed.background,
        problem: project.overrides?.problem || parsed.problem,
        solution: project.overrides?.solution || parsed.solution,
        period: project.overrides?.period || parsed.period,
        tech: project.overrides?.tech ? project.overrides.tech.split(',') : (project.tech_stack || parsed.tech)
      }

      // Decompose Project Detail
      // Title & Period
      newElements.push({
        id: `proj-title-${project.id}`, pageId, type: 'text', x: 48, y: 48, w: 700, h: 50,
        content: `Project: ${project.title}`, style: { zIndex: 10, color: '#0f172a', fontSize: 32, fontWeight: '900', textAlign: 'left' }
      })
      newElements.push({
        id: `proj-period-${project.id}`, pageId, type: 'text', x: 48, y: 100, w: 300, h: 20,
        content: sections.period, style: { zIndex: 11, color: '#94a3b8', fontSize: 12, fontWeight: '700', textAlign: 'left' }
      })
      newElements.push({
        id: `proj-line-${project.id}`, pageId, type: 'shape', x: 48, y: 135, w: 1035, h: 2,
        content: '', style: { zIndex: 12, backgroundColor: '#0f172a' }
      })

      // Main Media & Overview
      newElements.push({
        id: `proj-img-${project.id}`, pageId, type: 'image', x: 70, y: 170, w: 480, h: 320,
        content: { url: project.thumbnail_url || (project.images?.[0]) || '', focus: { x: 50, y: 50 } }, style: { zIndex: 13, borderRadius: 20 }
      })
      
      newElements.push({
        id: `proj-overview-label-${project.id}`, pageId, type: 'text', x: 600, y: 170, w: 450, h: 20,
        content: 'OVERVIEW', style: { zIndex: 14, color: '#94a3b8', fontSize: 10, fontWeight: '900', textAlign: 'left' }
      })
      newElements.push({
        id: `proj-desc-${project.id}`, pageId, type: 'text', x: 600, y: 200, w: 450, h: 290,
        content: project.short_description || project.content?.substring(0, 300), style: { zIndex: 15, fontSize: 14, color: '#475569', fontWeight: '500' }
      })

      // Bottom Cards
      const cardY = 540
      const cardW = 320
      const cardH = 200
      
      newElements.push({
        id: `proj-card-bg-${project.id}`, pageId, type: 'text', x: 60, y: cardY, w: cardW, h: cardH,
        content: `BACKGROUND\n\n${sections.background}`, style: { zIndex: 16, fontSize: 11, backgroundColor: '#f8fafc', borderRadius: 16, color: '#334155' }
      })
      newElements.push({
        id: `proj-card-prob-${project.id}`, pageId, type: 'text', x: 405, y: cardY, w: cardW, h: cardH,
        content: `PROBLEM\n\n${sections.problem}`, style: { zIndex: 17, fontSize: 11, backgroundColor: '#f8fafc', borderRadius: 16, color: '#334155' }
      })
      newElements.push({
        id: `proj-card-sol-${project.id}`, pageId, type: 'text', x: 750, y: cardY, w: cardW, h: cardH,
        content: `SOLUTION & RESULT\n\n${sections.solution}`, style: { zIndex: 18, fontSize: 11, backgroundColor: '#f8fafc', borderRadius: 16, color: '#334155' }
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
              <p className="text-xs text-slate-500 font-bold uppercase mt-1">Select projects to include</p>
            </div>
          </div>
          <div className="p-10 min-h-[400px]">
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
                      </div>
                    )
                  })}
                </div>
              </div>
          </div>
          <div className="p-8 border-t border-white/5">
            <button onClick={handleInitialize} className="w-full py-4 bg-emerald-500 text-white rounded-xl font-black shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">Generate Portfolio</button>
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
              <div key={el.id} onMouseDown={(e) => onMouseDown(el.id, e)} className={`absolute cursor-move group/el ${selectedId === el.id ? 'ring-2 ring-emerald-500' : ''}`}
                style={{ left: el.x, top: el.y, width: el.w, height: el.h, zIndex: el.style.zIndex, opacity: el.style.opacity, backgroundColor: el.style.backgroundColor, borderRadius: el.style.borderRadius }}>
                
                {selectedId === el.id && (
                  <>
                    <div onMouseDown={(e) => onResizeStart(el.id, 'tl', e)} className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-white border-2 border-emerald-500 rounded-full z-[60] cursor-nwse-resize" />
                    <div onMouseDown={(e) => onResizeStart(el.id, 'tr', e)} className="absolute -right-1.5 -top-1.5 w-3 h-3 bg-white border-2 border-emerald-500 rounded-full z-[60] cursor-nesw-resize" />
                    <div onMouseDown={(e) => onResizeStart(el.id, 'bl', e)} className="absolute -left-1.5 -bottom-1.5 w-3 h-3 bg-white border-2 border-emerald-500 rounded-full z-[60] cursor-nesw-resize" />
                    <div onMouseDown={(e) => onResizeStart(el.id, 'br', e)} className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-white border-2 border-emerald-500 rounded-full z-[60] cursor-nwse-resize" />
                    <div onMouseDown={(e) => onResizeStart(el.id, 't', e)} className="absolute left-1/2 -top-1.5 -translate-x-1/2 w-6 h-1.5 bg-emerald-500 rounded-full z-[60] cursor-ns-resize" />
                    <div onMouseDown={(e) => onResizeStart(el.id, 'b', e)} className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-6 h-1.5 bg-emerald-500 rounded-full z-[60] cursor-ns-resize" />
                    <div onMouseDown={(e) => onResizeStart(el.id, 'l', e)} className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-emerald-500 rounded-full z-[60] cursor-ew-resize" />
                    <div onMouseDown={(e) => onResizeStart(el.id, 'r', e)} className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-emerald-500 rounded-full z-[60] cursor-ew-resize" />
                  </>
                )}

                {el.type === 'text' && <div contentEditable suppressContentEditableWarning onBlur={(e) => updateElement(el.id, { content: e.currentTarget.textContent })} className="w-full h-full p-2 outline-none whitespace-pre-wrap" style={{ fontSize: el.style.fontSize, fontFamily: el.style.fontFamily, color: el.style.color, textAlign: el.style.textAlign, fontWeight: el.style.fontWeight }}>{el.content}</div>}
                
                {el.type === 'image' && (
                  <div 
                    className="w-full h-full relative group cursor-pointer overflow-hidden" 
                    style={{ borderRadius: el.style.borderRadius }}
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
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-black uppercase tracking-widest">Change Photo</div>
                  </div>
                )}
                
                {/* Fallback for other types if any */}
                {el.type === 'shape' && <div className="w-full h-full" style={{ borderRadius: el.style.borderRadius, backgroundColor: el.style.backgroundColor }}></div>}
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
                 <button onClick={() => deleteElement(selectedId!)} className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar pb-24">
                 <div className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500">Opacity</label>
                      <input type="range" min="0" max="1" step="0.1" value={selectedElement.style.opacity} onChange={(e) => updateStyle(selectedId!, { opacity: parseFloat(e.target.value) })} className="w-full" />
                   </div>
                   
                   {selectedElement.type === 'text' && (
                     <div className="space-y-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500">Font Size</label>
                           <input type="number" value={selectedElement.style.fontSize} onChange={(e) => updateStyle(selectedId!, { fontSize: parseInt(e.target.value) })} className="w-full bg-slate-800 p-2 rounded-lg text-white" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500">Color</label>
                           <input type="color" value={selectedElement.style.color} onChange={(e) => updateStyle(selectedId!, { color: e.target.value })} className="w-full h-10 bg-transparent cursor-pointer border-0" />
                        </div>
                     </div>
                   )}

                   {selectedElement.type === 'image' && (
                     <div className="space-y-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500">Corner Radius</label>
                           <input type="range" min="0" max="100" step="1" value={selectedElement.style.borderRadius} onChange={(e) => updateStyle(selectedId!, { borderRadius: parseInt(e.target.value) })} className="w-full" />
                        </div>
                     </div>
                   )}
                 </div>
               </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 grayscale opacity-40">
               <Maximize2 className="w-8 h-8 mb-4" />
               <p className="text-[10px] font-bold uppercase tracking-widest">Select element to Edit</p>
            </div>
          )}
          <div className="mt-auto p-8 border-t border-white/5 space-y-3">
            <button onClick={exportJson} className="w-full py-3 bg-slate-800 text-white rounded-xl text-xs font-bold">Save Template</button>
            <div className="flex gap-2">
               <button onClick={() => downloadImage('png')} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase">PNG</button>
               <button onClick={() => downloadImage('jpg')} className="flex-1 py-3 bg-white/10 text-white rounded-xl text-xs font-bold uppercase">JPG</button>
            </div>
          </div>
        </div>
      </div>

      {renderWizard()}
      
      {isImagePickerOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[32px] overflow-hidden flex flex-col">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-black text-white">Select Project Photo</h2>
              <div className="flex gap-3">
                 <label className="px-4 py-2 bg-emerald-500 text-white text-xs font-black rounded-xl cursor-pointer hover:bg-emerald-600 transition-all">
                    UP FROM PC
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          const dataUrl = event.target?.result as string
                          updateElement(isImagePickerOpen.elementId, { content: { ...elements.find(el => el.id === isImagePickerOpen.elementId)?.content, url: dataUrl } })
                          setIsImagePickerOpen(null)
                        }
                        reader.readAsDataURL(file)
                      }
                    }} />
                 </label>
                 <button onClick={() => setIsImagePickerOpen(null)} className="p-2 text-slate-500 hover:text-white transition-all"><ArrowLeft className="w-6 h-6" /></button>
              </div>
            </div>
            <div className="p-8 grid grid-cols-3 gap-4 max-h-[500px] overflow-y-auto custom-scrollbar">
               {isImagePickerOpen.projectPhotos.map((url, i) => (
                 <button key={i} onClick={() => {
                               updateElement(isImagePickerOpen.elementId, { 
                                 content: { ...elements.find(el => el.id === isImagePickerOpen.elementId)?.content, url: url } 
                               })
                               setIsImagePickerOpen(null)
                               setFocusingPhoto({ elementId: isImagePickerOpen.elementId, imageUrl: url, focus: { x: 50, y: 50 } })
                             }} className="aspect-video rounded-xl overflow-hidden border-2 border-transparent hover:border-emerald-500 transition-all shadow-lg active:scale-95 group relative">
                                <img src={url} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                             </button>
                           ))}
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
