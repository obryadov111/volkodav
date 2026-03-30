import { useState } from 'react'
import { supabase } from '../supabase'

export default function AdminCreateUser() {
  const [email, setEmail] = useState('')
  const [password, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [message, setMessage] = useState('')

  async function createUser(e) {
    e.preventDefault()
    
    // Создаём через Admin API (нужен service_role ключ!)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Авто-подтверждение
      user_metadata: { full_name: fullName }
    })

    if (error) {
      setMessage(`Ошибка: ${error.message}`)
    } else {
      setMessage(`Пользователь ${email} создан!`)
      setEmail('')
      setPassword('')
      setFullName('')
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl text-white mb-4">Создание пользователя (Админ)</h1>
      <form onSubmit={createUser} className="space-y-4 max-w-md">
        <input
          type="text"
          placeholder="Полное имя"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-4 py-2 bg-slate-800 text-white rounded"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 bg-slate-800 text-white rounded"
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 bg-slate-800 text-white rounded"
        />
        <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded">
          Создать
        </button>
      </form>
      {message && <p className="mt-4 text-white">{message}</p>}
    </div>
  )
}