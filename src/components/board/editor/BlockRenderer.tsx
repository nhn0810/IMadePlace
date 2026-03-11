import { BlockData } from './types'
import { PollWidget } from '../PollWidget'

export function BlockRenderer({ content, postId }: { content: string, postId?: string }) {
  let blocks: BlockData[] = []
  let isBlocks = false

  try {
    if (content.trim().startsWith('[')) {
      blocks = JSON.parse(content)
      isBlocks = true
    }
  } catch (e) {}

  if (!isBlocks) {
    // Legacy HTML from Tiptap
    return <div className="prose prose-slate prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">
      {blocks.map((block) => {
        if (block.type === 'text') {
          return (
            <div
              key={block.id}
              className="prose prose-slate prose-lg max-w-none mb-8"
              dangerouslySetInnerHTML={{ __html: block.content as string }}
            />
          )
        }

        if (block.type === 'vertical-image') {
          const items = block.content as any
          const normalized = Array.isArray(items) && (items.length === 0 || typeof items[0] === 'string')
            ? items.map(url => ({ url, caption: '' }))
            : items || []
            
          return (
            <div key={block.id} className="flex flex-col gap-6">
              {normalized.map((item: any, i: number) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <img src={item.url} alt={`img-${i}`} className="w-full rounded-2xl object-cover shadow-sm" />
                  {item.caption && (
                    <p className="text-sm text-slate-500 font-medium">{item.caption}</p>
                  )}
                </div>
              ))}
            </div>
          )
        }

        if (block.type === 'swipe-image') {
          const data = block.content as any
          const normalized = Array.isArray(data)
            ? { urls: data, caption: '' }
            : data || { urls: [], caption: '' }
            
          return (
            <div key={block.id} className="flex flex-col gap-3">
              <div className="flex flex-nowrap overflow-x-auto gap-4 snap-x pb-4">
                {normalized.urls.map((url: string, i: number) => (
                  <div key={i} className="flex-shrink-0 w-[85%] sm:w-[70%] snap-center first:ml-0">
                    <img src={url} alt={`img-${i}`} className="w-full h-auto rounded-2xl object-cover shadow-sm" />
                  </div>
                ))}
              </div>
              {normalized.caption && (
                <p className="text-center text-sm text-slate-500 font-medium">{normalized.caption}</p>
              )}
            </div>
          )
        }

        if (block.type === 'poll') {
          const poll = block.content as any
          if (!postId) {
            // Probably in edit mode or somewhere without postId, fallback to static render
            return (
              <div key={block.id} className="p-6 sm:p-8 rounded-3xl bg-slate-50/50 opacity-60 pointer-events-none">
                 <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-8">{poll.question} (미리보기)</h3>
                 <div className="flex flex-col gap-3">
                   {poll.options?.map((opt: any) => (
                     <button key={opt.id} className="text-left px-5 py-4 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 shadow-sm">
                       {opt.text}
                     </button>
                   ))}
                 </div>
              </div>
            )
          }
          
          return <PollWidget key={block.id} postId={postId} blockId={block.id} poll={poll} />
        }

        return null
      })}
    </div>
  )
}
