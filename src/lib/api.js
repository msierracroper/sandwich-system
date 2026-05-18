// src/lib/api.js
// Helper para hacer queries a Supabase via fetch directo
// Evita el problema del cliente de Supabase bloqueandose en refresh

const BASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function headers(token) {
  return {
    'apikey':        ANON_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation',
  }
}

// GET — select con filtros opcionales
// params: objeto con parametros de query string
// ej: { 'status': 'eq.abierto', 'order': 'created_at.desc' }
export async function apiGet(token, table, params = {}) {
  const query = new URLSearchParams({ select: '*', ...params }).toString()
  const res = await fetch(`${BASE_URL}/rest/v1/${table}?${query}`, {
    headers: headers(token),
  })
  if (!res.ok) throw new Error(`GET ${table} failed: ${res.status}`)
  return res.json()
}

// POST — insert
export async function apiPost(token, table, body) {
  const res = await fetch(`${BASE_URL}/rest/v1/${table}`, {
    method:  'POST',
    headers: headers(token),
    body:    JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${table} failed: ${res.status}`)
  return res.json()
}

// PATCH — update con filtro
// filter: string tipo 'id=eq.uuid'
export async function apiPatch(token, table, filter, body) {
  const res = await fetch(`${BASE_URL}/rest/v1/${table}?${filter}`, {
    method:  'PATCH',
    headers: headers(token),
    body:    JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH ${table} failed: ${res.status}`)
  // PATCH puede devolver 204 sin body
  const text = await res.text()
  return text ? JSON.parse(text) : []
}

// DELETE — eliminar con filtro
export async function apiDelete(token, table, filter) {
  const res = await fetch(`${BASE_URL}/rest/v1/${table}?${filter}`, {
    method:  'DELETE',
    headers: headers(token),
  })
  if (!res.ok) throw new Error(`DELETE ${table} failed: ${res.status}`)
  return true
}

// RPC — llamar funcion de Supabase
export async function apiRpc(token, fn, body = {}) {
  const res = await fetch(`${BASE_URL}/rest/v1/rpc/${fn}`, {
    method:  'POST',
    headers: headers(token),
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? `RPC ${fn} failed`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}