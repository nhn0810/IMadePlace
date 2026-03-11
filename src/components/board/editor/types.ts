export type BlockType = 'text' | 'vertical-image' | 'swipe-image' | 'poll'

export interface PollData {
  question: string
  options: { id: string; text: string }[]
  endDate: string
}

export interface BlockData {
  id: string
  type: BlockType
  content: string | string[] | PollData
}
