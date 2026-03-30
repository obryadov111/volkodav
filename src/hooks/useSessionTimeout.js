import { useEffect } from "react"
import { supabase } from "../supabase"

const TIMEOUT = (30 * 60 * 1000) * 2 // 60 минут

export function useSessionTimeout() {
  useEffect(() => {
    let timer

    const resetTimer = () => {
      clearTimeout(timer)

      timer = setTimeout(async () => {
        console.log("Session expired (idle)")
        await supabase.auth.signOut()
        window.location.href = "/login"
      }, TIMEOUT)
    }

    // события активности
    const events = ["mousemove", "keydown", "click", "scroll"]

    events.forEach(event => {
      window.addEventListener(event, resetTimer)
    })

    resetTimer()

    return () => {
      clearTimeout(timer)
      events.forEach(event => {
        window.removeEventListener(event, resetTimer)
      })
    }
  }, [])
}