'use client'
import { useAuthContext } from '@/shell/AuthContext'
import { useRouter } from 'next/navigation'
import { Suspense, useEffect } from 'react'

export default function Home() {
  const { isLoggedIn } = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    if (isLoggedIn) {
      // TODO: use redirectUrl from query params
      router.push('/reports')
    }
  }, [isLoggedIn, router])

  return <Suspense fallback={<div></div>}></Suspense>
}
