'use client'

import { useEffect } from 'react'

export function ViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
    const handleView = async () => {
      const viewedKey = `viewed_post_${postId}`
      const hasViewed = localStorage.getItem(viewedKey)

      if (!hasViewed) {
        // Optimistically mark as viewed
        localStorage.setItem(viewedKey, 'true')
        
        // Call our API route to securely increment without triggering RLS issues for guests
        try {
          await fetch(`/api/views`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId })
          })
        } catch (e) {
          // Silent error for view tracking
        }
      }
    }

    handleView()
  }, [postId])

  return null
}
