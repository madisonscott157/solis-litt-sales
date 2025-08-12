// Vercel Serverless Function for edit lock management (Solis/Litt version)
import { kv } from '@vercel/kv'

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { action, saleId, userId } = req.body

    if (!action) {
      return res.status(400).json({ error: 'Action is required' })
    }

    const lockKey = `solis_edit_lock:${saleId}`
    
    switch (action) {
      case 'acquire':
        if (!saleId || !userId) {
          return res.status(400).json({ error: 'saleId and userId are required for acquire' })
        }

        // Check if lock already exists
        const existingLock = await kv.get(lockKey)
        
        if (existingLock && existingLock.userId !== userId) {
          // Lock exists and is held by someone else
          const timeHeld = Date.now() - existingLock.timestamp
          const timeHeldMinutes = Math.floor(timeHeld / (1000 * 60))
          
          // Auto-release locks older than 5 minutes
          if (timeHeldMinutes >= 5) {
            await kv.del(lockKey)
          } else {
            return res.status(423).json({ 
              error: 'Sale is currently being edited by another user',
              lockedBy: existingLock.userId,
              timeHeld: timeHeldMinutes
            })
          }
        }

        // Acquire the lock
        const lockData = {
          userId,
          saleId,
          timestamp: Date.now()
        }
        
        await kv.set(lockKey, lockData, { ex: 300 }) // 5 minute expiration
        
        return res.status(200).json({ 
          success: true, 
          message: 'Edit lock acquired',
          lock: lockData
        })

      case 'release':
        if (!saleId) {
          return res.status(400).json({ error: 'saleId is required for release' })
        }

        // Remove the lock
        await kv.del(lockKey)
        
        return res.status(200).json({ 
          success: true, 
          message: 'Edit lock released'
        })

      case 'refresh':
        if (!saleId || !userId) {
          return res.status(400).json({ error: 'saleId and userId are required for refresh' })
        }

        const currentLock = await kv.get(lockKey)
        
        if (!currentLock || currentLock.userId !== userId) {
          return res.status(403).json({ 
            error: 'Lock not held by this user or expired'
          })
        }

        // Refresh the lock
        const refreshedLock = {
          ...currentLock,
          timestamp: Date.now()
        }
        
        await kv.set(lockKey, refreshedLock, { ex: 300 })
        
        return res.status(200).json({ 
          success: true, 
          message: 'Edit lock refreshed',
          lock: refreshedLock
        })

      case 'force_release':
        if (!saleId) {
          return res.status(400).json({ error: 'saleId is required for force_release' })
        }

        // Force remove the lock (admin action)
        await kv.del(lockKey)
        
        return res.status(200).json({ 
          success: true, 
          message: 'Edit lock force released'
        })

      default:
        return res.status(400).json({ error: 'Invalid action' })
    }

  } catch (error) {
    console.error('Edit lock error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}