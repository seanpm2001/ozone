'use client'

import {
  BrowserOAuthClient,
  BrowserOAuthClientLoadOptions,
  BrowserOAuthClientOptions,
  LoginContinuedInParentWindowError,
  OAuthAgent,
  OAuthAuthorizeOptions,
  TokenSet,
} from '@atproto/oauth-client-browser'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useSignaledEffect } from './useSignaledEffect'

const CURRENT_AUTHENTICATED_SUB = 'CURRENT_AUTHENTICATED_SUB'

type Options = {
  onRestored?: (agent: OAuthAgent) => void
  onSignedIn?: (agent: OAuthAgent, state: null | string) => void
  onSignedOut?: () => void
}

export function useOAuth(
  config:
    | BrowserOAuthClientLoadOptions
    | BrowserOAuthClientOptions
    | BrowserOAuthClient,
  options?: Options,
) {
  const [client, setClient] = useState<null | BrowserOAuthClient>(() =>
    config instanceof BrowserOAuthClient ? config : null,
  )
  const [agent, setAgent] = useState<null | OAuthAgent>(null)
  const [loading, setLoading] = useState(true)

  const optionsRef = useRef(options)
  optionsRef.current = options

  useSignaledEffect(
    (signal) => {
      if (config instanceof BrowserOAuthClient) {
        setClient(config)
      } else if ('clientMetadata' in config) {
        setClient(new BrowserOAuthClient(config))
      } else {
        setClient(null)
        BrowserOAuthClient.load({ ...config, signal }).then(
          (client) => {
            if (!signal.aborted) setClient(client)
          },
          (err) => {
            if (!signal.aborted) throw err
          },
        )
      }
    },
    [config],
  )

  useEffect(() => {
    if (loading) return // Process after init is over

    if (agent) {
      localStorage.setItem(CURRENT_AUTHENTICATED_SUB, agent.sub)
    } else {
      localStorage.removeItem(CURRENT_AUTHENTICATED_SUB)
    }
  }, [loading, agent])

  const clientRef = useRef<typeof client>()
  useEffect(() => {
    // In strict mode, we don't want to reinitialize the client if it's the same
    if (clientRef.current === client) return
    clientRef.current = client

    setLoading(client != null)
    setAgent(null)

    client
      ?.init(localStorage.getItem(CURRENT_AUTHENTICATED_SUB) || undefined)
      .then(
        async (r) => {
          if (clientRef.current !== client) return

          if (r) {
            setAgent(r.agent)
            if ('state' in r) optionsRef.current?.onSignedIn?.(r.agent, r.state)
            else optionsRef.current?.onRestored?.(r.agent)
          }
        },
        (err) => {
          if (clientRef.current !== client) return
          if (err instanceof LoginContinuedInParentWindowError) return

          console.error('Failed to init:', err)

          localStorage.removeItem(CURRENT_AUTHENTICATED_SUB)
        },
      )
      .finally(() => {
        if (clientRef.current !== client) return

        setLoading(false)
      })
  }, [client])

  useSignaledEffect(
    (signal) => {
      if (!client) return
      if (!agent) return

      client.addEventListener(
        'deleted',
        ({ detail }) => {
          if (agent.sub === detail.sub) {
            setAgent(null)
            optionsRef.current?.onSignedOut?.()
          }
        },
        { signal },
      )

      void agent.refreshIfNeeded()
    },
    [client, agent],
  )

  return {
    client,
    agent,

    loading: client == null || loading,

    signIn: useCallback(
      async (input: string, options?: OAuthAuthorizeOptions) => {
        if (loading) throw new Error('Already loading')
        if (!client) throw new Error('Client not initialied')

        setLoading(true)

        try {
          const agent = await client.signIn(input, options)
          setAgent(agent)
          optionsRef.current?.onSignedIn?.(agent, options?.state ?? null)
        } catch (err) {
          console.error('Failed to sign in:', err)
          throw err
        } finally {
          setLoading(false)
        }
      },
      [loading, client, optionsRef],
    ),

    signOut: useCallback(async () => {
      if (loading) return
      if (!agent) return

      try {
        await agent.signOut()
      } catch (err) {
        console.error('Failed to clear credentials', err)

        setAgent(null)
        optionsRef.current?.onSignedOut?.()
      }
    }, [loading, agent, optionsRef]),
  }
}
