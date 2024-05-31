'use client'

import { BskyAgent } from '@atproto/api'
import { useQuery } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

import { OzoneConfig, getConfig } from '@/lib/client-config'
import { OZONE_SERVICE_DID } from '@/lib/constants'
import { globalAgent } from '@/lib/client'
import { useAuthDid, usePdsAgent } from './AuthContext'
export enum ConfigurationState {
  Unavailable,
  Pending,
  Ready,
  Unconfigured,
  Unauthorized,
}

export type ReconfigureOptions = {
  skipRecord?: boolean
}

export type ConfigurationContextData = {
  serviceDid?: string
  state: ConfigurationState
  config?: OzoneConfig
  error?: Error
  labelerAgent?: BskyAgent
  reconfigure: (options?: ReconfigureOptions) => void
}

const ConfigurationContext = createContext<ConfigurationContextData | null>(
  null,
)

// {
//   serviceDid: OZONE_SERVICE_DID,
//   state: ConfigurationState.Unavailable,
//   reconfigure: () => {},
// }

export const ConfigurationProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const {
    data: config,
    error: configError,
    refetch: configRefetch,
  } = useQuery<OzoneConfig, Error>({
    queryKey: ['labeler-config'],
    queryFn: async () => getConfig(OZONE_SERVICE_DID),
  })
  const serviceDid = config ? config.did : OZONE_SERVICE_DID

  const [skipRecord, setSkipRecord] = useState(false)

  const pdsAgent = usePdsAgent(false)
  const labelerAgent: BskyAgent | undefined = useMemo(() => {
    if (!pdsAgent) return undefined
    if (!serviceDid) return undefined

    setSkipRecord(false)

    const [did, id = 'atproto_labeler'] = serviceDid.split('#')
    return pdsAgent.withProxy(id, did)
  }, [pdsAgent, serviceDid])

  const authDid = useAuthDid()
  const { data: state = ConfigurationState.Pending } =
    useQuery<ConfigurationState>({
      queryKey: ['labeler-config-state', { authDid, serviceDid }],
      queryFn: async () => {
        // User is not authenticated
        if (!authDid) return ConfigurationState.Unavailable

        // config is loading
        if (!config) return ConfigurationState.Pending
        if (!labelerAgent) return ConfigurationState.Pending

        try {
          await labelerAgent.api.tools.ozone.moderation.getRepo({
            did: authDid,
          })

          if (
            config.needs.key ||
            config.needs.service ||
            (!skipRecord && config.needs.record && config.did === authDid)
          ) {
            return ConfigurationState.Unconfigured
          }

          return ConfigurationState.Ready
        } catch (err) {
          if (err?.['status'] === 401) return ConfigurationState.Unauthorized
          throw err // retry
        }
      },
    })

  const stateError = useMemo(() => {
    if (state === ConfigurationState.Unauthorized) {
      return new Error(
        "Account does not have access to this Ozone service. If this seems in error, check Ozone's access configuration.",
      )
    }
    return undefined
  }, [state])

  const reconfigure = useCallback(
    (options?: ReconfigureOptions) => {
      if (options?.skipRecord != null) setSkipRecord(options.skipRecord)
      configRefetch()
    },
    [configRefetch],
  )

  const error = configError ?? stateError

  const configurationContextData: ConfigurationContextData = useMemo(
    () => ({ state, config, error, labelerAgent, reconfigure }),
    [state, config, error, labelerAgent, reconfigure],
  )

  return (
    <ConfigurationContext.Provider value={configurationContextData}>
      {children}
    </ConfigurationContext.Provider>
  )
}

export const useConfigurationContext = (): ConfigurationContextData => {
  const context = useContext(ConfigurationContext)
  if (!context) throw new Error(`a ConfigurationProvider is required`)
  return context
}

export function useLabelerAgent(required?: true): BskyAgent
export function useLabelerAgent(required: false): BskyAgent | undefined
export function useLabelerAgent(required = true) {
  const { labelerAgent } = useConfigurationContext()
  if (required && !labelerAgent) console.error('Configuration not ready')
  // if (required && !labelerAgent) throw new Error('Configuration not ready')
  return labelerAgent || globalAgent
}
