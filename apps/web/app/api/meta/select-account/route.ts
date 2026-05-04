import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787'

export async function POST(req: Request) {
  const { getToken } = auth()
  const token = await getToken()
  const body = await req.json() as unknown
  const res = await fetch(`${API_URL}/api/v1/meta/select-account`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` }, body: JSON.stringify(body) })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}