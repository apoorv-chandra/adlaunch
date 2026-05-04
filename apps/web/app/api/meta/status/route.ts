import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787'

export async function GET() {
  const { getToken } = auth()
  const token = await getToken()
  const res = await fetch(`${API_URL}/api/v1/meta/status`, { headers: { Authorization: `Bearer ${token ?? ''}` } })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}