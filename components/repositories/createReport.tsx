import Link from 'next/link'
import { useCallback } from 'react'
import { toast } from 'react-toastify'

import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { createSubjectFromId, isIdRecord } from '../reports/helpers/subject'
import { ReportFormValues } from '../reports/ReportPanel'

export function useCreateReport() {
  const labelerAgent = useLabelerAgent()

  return useCallback(
    async (vals: ReportFormValues) => {
      const createReportAsync = async () => {
        const { subject } = await createSubjectFromId(
          labelerAgent,
          vals.subject,
        )
        return labelerAgent.api.com.atproto.moderation.createReport(
          { ...vals, subject },
          { encoding: 'application/json' },
        )
      }

      await toast.promise(createReportAsync, {
        pending: 'Submitting report...',
        error: {
          render({ data }: any) {
            const errorMessage = data?.message ?? ''
            return `Report could not be created: ${errorMessage}`
          },
        },
        success: {
          render({ data }) {
            const newReport = data?.data
            const reportId = newReport?.id
            const isRecord = isIdRecord(vals.subject)
            const title = `${isRecord ? 'Record' : 'Repo'} has been reported`

            return (
              <div>
                {title} -{' '}
                <Link
                  href={`/reports/${reportId}`}
                  replace
                  className="text-indigo-600 hover:text-indigo-900 whitespace-nowrap"
                >
                  View #{reportId}
                </Link>
              </div>
            )
          },
        },
      })
    },
    [labelerAgent],
  )
}
