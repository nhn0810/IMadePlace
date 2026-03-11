export type BlockType = 'text' | 'vertical-image' | 'swipe-image' | 'poll'

export interface PollData {
  question: string
  options: { id: string; text: string }[]
  endDate: string
}

export type VerticalImageData = string[] | { url: string; caption: string }[]
export type SwipeImageData = string[] | { urls: string[]; caption: string }

export interface BlockData {
  id: string
  type: BlockType
  content: string | VerticalImageData | SwipeImageData | PollData | any
}
