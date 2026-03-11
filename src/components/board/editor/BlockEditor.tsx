'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { BlockData, BlockType } from './types'
import { SortableBlockItem } from './SortableBlockItem'
import { Plus, Type, Image as ImageIcon, LayoutTemplate, PieChart } from 'lucide-react'

export function BlockEditor({
  content,
  onChange,
}: {
  content: string
  onChange: (jsonString: string) => void
}) {
  const [blocks, setBlocks] = useState<BlockData[]>([])
  const [focusedId, setFocusedId] = useState<string | null>(null)

  // Initialization parsing
  useEffect(() => {
    if (content && typeof content === 'string' && content.startsWith('[')) {
      try {
        setBlocks(JSON.parse(content))
      } catch (e) {
        console.error("Failed to parse blocks", e)
      }
    }
    // If empty or HTML string, we just start empty. Legacy HTML editing is not requested.
  }, [content])

  // Sync to parent
  useEffect(() => {
    onChange(JSON.stringify(blocks))
  }, [blocks, onChange])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const addBlock = (type: BlockType) => {
    const newBlock: BlockData = {
      id: crypto.randomUUID(),
      type,
      content: type === 'text' ? '' : type === 'poll' ? { question: '', options: [], endDate: '' } : []
    }
    
    if (focusedId) {
      const idx = blocks.findIndex(b => b.id === focusedId)
      const newBlocks = [...blocks]
      newBlocks.splice(idx + 1, 0, newBlock)
      setBlocks(newBlocks)
    } else {
      setBlocks([...blocks, newBlock])
    }
    setFocusedId(newBlock.id)
  }

  const updateBlock = (id: string, newContent: any) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, content: newContent } : b))
  }

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id))
    if (focusedId === id) setFocusedId(null)
  }

  return (
    <div className="relative border border-slate-200 rounded-3xl bg-slate-50/50 p-6 sm:p-10 min-h-[500px]">
      
      {/* Floating Toolbar to spawn modules */}
      <div className="sticky top-20 z-40 bg-white/80 backdrop-blur-md shadow-sm border border-slate-200 p-2 rounded-2xl flex flex-wrap justify-center items-center gap-2 mb-8 mx-auto w-fit">
         <span className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-widest pl-2">블록 추가</span>
         <button type="button" onClick={() => addBlock('text')} className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-xl text-sm font-semibold transition-colors">
            <Type className="w-4 h-4" /> 텍스트
         </button>
         <button type="button" onClick={() => addBlock('vertical-image')} className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-xl text-sm font-semibold transition-colors">
            <LayoutTemplate className="w-4 h-4" /> 수직 이미지
         </button>
         <button type="button" onClick={() => addBlock('swipe-image')} className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-xl text-sm font-semibold transition-colors">
            <ImageIcon className="w-4 h-4" /> 스와이프 이미지
         </button>
         <button type="button" onClick={() => addBlock('poll')} className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-xl text-sm font-semibold transition-colors">
            <PieChart className="w-4 h-4" /> 투표
         </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
          <div className="mx-auto max-w-2xl px-8 ml-8 sm:ml-auto">
            {blocks.map(block => (
              <SortableBlockItem
                key={block.id}
                block={block}
                isFocused={focusedId === block.id}
                onFocus={() => setFocusedId(block.id)}
                onChange={(c) => updateBlock(block.id, c)}
                onDelete={() => deleteBlock(block.id)}
              />
            ))}
            
            {blocks.length === 0 && (
               <div className="flex flex-col items-center justify-center text-slate-400 gap-4 mt-20">
                 <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                    <Plus className="w-6 h-6 text-slate-300" />
                 </div>
                 <p className="text-sm font-medium">상단 메뉴에서 블록을 추가해 멋진 글을 작성해보세요!</p>
               </div>
            )}
            
            <div className="h-64" onClick={() => setFocusedId(null)}></div>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
