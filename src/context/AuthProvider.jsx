import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './AuthContext'

const BASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(authUser, token) {
    if (!authUser || !token) {
      setProfile(null)
      setLoading(false)
      return
    }
    try {
      const res = await fetch(
        `${BASE_URL}/rest/v1/users?id=eq.${authUser.id}&select=*&limit=1`,
        {
          headers: {
            'apikey':        ANON_KEY,
            'Authorization': `Bearer ${token}`,
          }
        }
      )
      const data = await res.json()
      setProfile(Array.isArray(data) && data.length > 0 ? data[0] : null)
    } catch (e) {
      console.error('loadProducts error:', e.message)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        setSession(session)
        await loadProfile(session?.user ?? null, session?.access_token ?? null)
      }
    )

    const timeout = setTimeout(() => setLoading(false), 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}