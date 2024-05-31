'use client'

import { AppBskyActorDefs, BskyAgent } from '@atproto/api'
import { useQuery } from '@tanstack/react-query'
import { createContext, useContext, useMemo } from 'react'

import { PLC_DIRECTORY_URL, SOCIAL_APP_URL } from '@/lib/constants'
import { useOAuth } from '../../lib/useOAuth'

const OAUTH_CLIENT_OPTIONS = {
  plcDirectoryUrl: PLC_DIRECTORY_URL,
  handleResolver: SOCIAL_APP_URL,
}

export type Profile = AppBskyActorDefs.ProfileViewDetailed

type AuthContextData = {
  isLoggedIn: boolean
  isValidatingAuth: boolean

  did?: string
  pdsAgent?: BskyAgent

  signIn: (input: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextData | null>(null)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { client, agent, loading, signIn, signOut } =
    useOAuth(OAUTH_CLIENT_OPTIONS)

  const pdsAgent = useMemo(
    () => (agent ? new BskyAgent(agent) : undefined),
    [agent],
  )

  // Memoize the context value to avoid re-renders in consumers, when this
  // component re-renders with the same context value.

  const did = agent?.sub
  const isValidatingAuth = client != null && loading
  const isLoggedIn = agent != null

  const authContextData: AuthContextData = useMemo(
    () => ({
      isValidatingAuth,
      isLoggedIn,
      did,
      pdsAgent,
      signIn,
      signOut,
    }),
    [isValidatingAuth, isLoggedIn, did, pdsAgent, signIn, signOut],
  )

  return (
    <AuthContext.Provider value={authContextData}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = (): AuthContextData => {
  const context = useContext(AuthContext)
  if (!context) throw new Error(`useAuthContext() requires an AuthProvider`)
  return context
}

export function usePdsAgent(required?: true): BskyAgent
export function usePdsAgent(required: false): BskyAgent | undefined
export function usePdsAgent(required = true) {
  const { pdsAgent } = useAuthContext()
  if (required && !pdsAgent) throw new Error('User not authenticated')
  return pdsAgent
}

export const useAuthDid = () => {
  return useAuthContext().did
}

export const useAuthProfileQuery = () => {
  const pdsAgent = usePdsAgent(false)
  return useQuery({
    queryKey: ['profile', pdsAgent?.did],
    queryFn: async () =>
      pdsAgent?.getProfile({ actor: pdsAgent.getDid() }) ?? null,
  })
}

export const useAuthProfile = () => {
  const profileQuery = useAuthProfileQuery()
  return profileQuery.data?.data
}

export const useAuthHandle = () => {
  return useAuthProfile()?.handle
}

export const useAuthIdentifier = () => {
  const handle = useAuthHandle()
  const did = useAuthDid()
  return handle ?? did
}
