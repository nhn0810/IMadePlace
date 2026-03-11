import { BlockData } from './types'

export function BlockRenderer({ content }: { content: string }) {
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
            <div key={block.id} className="text-lg text-slate-800 leading-relaxed whitespace-pre-wrap">
              {block.content as string}
            </div>
          )
        }

        if (block.type === 'vertical-image') {
          const urls = block.content as string[]
          return (
            <div key={block.id} className="flex flex-col gap-4">
              {urls.map((url, i) => (
                <img key={i} src={url} alt={`img-${i}`} className="w-full rounded-2xl object-cover shadow-sm border border-slate-100" />
              ))}
            </div>
          )
        }

        if (block.type === 'swipe-image') {
          const urls = block.content as string[]
          return (
            <div key={block.id} className="flex flex-nowrap overflow-x-auto gap-4 snap-x pb-4">
              {urls.map((url, i) => (
                <div key={i} className="flex-shrink-0 w-[85%] sm:w-[70%] snap-center first:ml-0">
                  <img src={url} alt={`img-${i}`} className="w-full h-auto rounded-2xl object-cover shadow-sm border border-slate-100" />
                </div>
              ))}
            </div>
          )
        }

        if (block.type === 'poll') {
          const poll = block.content as any
          return (
            <div key={block.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8">
               <div className="flex items-center justify-between mb-6">
                 <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">투표</span>
                 {poll.endDate && (
                   <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
                     마감: {new Date(poll.endDate).toLocaleDateString()}
                   </span>
                 )}
               </div>
               <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-8">{poll.question}</h3>
               <div className="flex flex-col gap-3">
                 {poll.options?.map((opt: any) => (
                   <button key={opt.id} className="text-left px-5 py-4 bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md rounded-xl transition-all font-medium text-slate-700">
                     {opt.text}
                   </button>
                 ))}
               </div>
               <p className="text-center text-xs text-slate-400 mt-6 mt-4">항목을 클릭하여 투표하세요 (구현 예정)</p>
            </div>
          )
        }

        return null
      })}
    </div>
  )
}
