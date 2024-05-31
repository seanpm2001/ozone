'use client'

import {
  AppBskyFeedGetPostThread as GetPostThread,
  ToolsOzoneModerationEmitEvent,
} from '@atproto/api'
import { useQuery } from '@tanstack/react-query'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useTitle } from 'react-use'

import { Loading, LoadingFailed } from '@/common/Loader'
import { getDidFromHandle } from '@/lib/identity'
import { createAtUri } from '@/lib/util'
import { useEmitEvent } from '@/mod-event/helpers/emitEvent'
import { ReportPanel } from '@/reports/ReportPanel'
import { CollectionId } from '@/reports/helpers/subject'
import { RecordView } from '@/repositories/RecordView'
import { useCreateReport } from '@/repositories/createReport'
import { usePdsAgent } from '@/shell/AuthContext'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { ModActionPanelQuick } from 'app/actions/ModActionPanel/QuickAction'

const buildPageTitle = ({
  handle,
  collection,
  rkey,
}: {
  handle?: string
  collection?: string
  rkey?: string
}) => {
  let title = `Record Details`

  if (collection) {
    const titleFromCollection = collection.split('.').pop()
    if (titleFromCollection) {
      title =
        titleFromCollection[0].toUpperCase() + titleFromCollection.slice(1)
    }
  }

  if (handle) {
    title += ` - ${handle}`
  }

  if (rkey) {
    title += ` - ${rkey}`
  }
  return title
}

export default function RecordViewPageContent({
  params,
}: {
  params: { id: string; record: string[] }
}) {
  const labelerAgent = useLabelerAgent()
  const pdsAgent = usePdsAgent()
  const emitEvent = useEmitEvent()
  const createReport = useCreateReport()
  const id = decodeURIComponent(params.id)
  const collection = params.record[0] && decodeURIComponent(params.record[0])
  const rkey = params.record[1] && decodeURIComponent(params.record[1])
  const {
    data,
    error,
    refetch,
    isLoading: isInitialLoading,
  } = useQuery({
    queryKey: ['record', { id, collection, rkey }],
    queryFn: async () => {
      let did: string | null
      if (id.startsWith('did:')) {
        did = id
      } else {
        did = await getDidFromHandle(id)
      }
      if (!did) {
        throw new Error('Failed to resolve DID for the record')
      }

      const uri = createAtUri({ did, collection, rkey })
      const getRecord = async () => {
        const { data: record } =
          await labelerAgent.api.tools.ozone.moderation.getRecord({ uri })
        return record
      }
      const getThread = async () => {
        if (collection !== CollectionId.Post) {
          return undefined
        }
        try {
          const { data: thread } =
            await labelerAgent.api.app.bsky.feed.getPostThread({ uri })
          return thread
        } catch (err) {
          if (err instanceof GetPostThread.NotFoundError) {
            return undefined
          }
          throw err
        }
      }
      const getListProfiles = async () => {
        if (collection !== CollectionId.List) {
          return undefined
        }
        // TODO: We need pagination here, right? how come getPostThread doesn't need it?
        const { data: listData } = await pdsAgent.api.app.bsky.graph.getList({
          list: uri,
        })
        return listData.items.map(({ subject }) => subject)
      }
      const [record, profiles, thread] = await Promise.all([
        getRecord(),
        getListProfiles(),
        getThread(),
      ])
      return { record, thread, profiles }
    },
  })

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const quickOpenParam = searchParams.get('quickOpen') ?? ''
  const reportUri = searchParams.get('reportUri') || undefined
  const setQuickActionPanelSubject = (subject?: string) => {
    // This route should not have any search params but in case it does, let's make sure original params are maintained
    const newParams = new URLSearchParams(searchParams)
    if (!subject) {
      newParams.delete('quickOpen')
    } else {
      newParams.set('quickOpen', subject)
    }
    router.push((pathname ?? '') + '?' + newParams.toString())
  }
  const setReportUri = (uri?: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (uri) {
      newParams.set('reportUri', uri)
    } else {
      newParams.delete('reportUri')
    }
    router.push((pathname ?? '') + '?' + newParams.toString())
  }

  useEffect(() => {
    if (reportUri === 'default' && data?.record) {
      setReportUri(data?.record.uri)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, reportUri])

  const pageTitle = buildPageTitle({
    handle: data?.record?.repo.handle,
    rkey,
    collection,
  })
  useTitle(pageTitle)

  if (error) {
    return <LoadingFailed error={error} />
  }
  if (!data) {
    return <Loading />
  }
  return (
    <>
      <ModActionPanelQuick
        open={!!quickOpenParam}
        onClose={() => setQuickActionPanelSubject()}
        setSubject={setQuickActionPanelSubject}
        subject={quickOpenParam} // select first subject if there are multiple
        subjectOptions={[quickOpenParam]}
        isInitialLoading={isInitialLoading}
        onSubmit={async (vals: ToolsOzoneModerationEmitEvent.InputSchema) => {
          await emitEvent(vals)
          refetch()
        }}
      />
      <ReportPanel
        open={!!reportUri}
        onClose={() => setReportUri(undefined)}
        subject={reportUri}
        onSubmit={async (vals) => {
          await createReport(vals)
          refetch()
        }}
      />
      <RecordView
        record={data.record}
        thread={data.thread}
        profiles={data.profiles}
        onReport={setReportUri}
        onShowActionPanel={(subject) => setQuickActionPanelSubject(subject)}
      />
    </>
  )
}
