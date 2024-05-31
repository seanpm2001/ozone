'use client'

import {
  ArrowLeftOnRectangleIcon,
  ArrowRightCircleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/20/solid'
import { useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import { ComponentProps, ReactElement, cloneElement, useState } from 'react'

import { ErrorInfo } from '@/common/ErrorInfo'
import { Loading } from '@/common/Loader'
import { Checkbox, Input } from '@/common/forms'
import {
  OzoneConfigFull,
  getServiceUrlFromDoc,
  withDocAndMeta,
} from '@/lib/client-config'
import { BskyAgent } from '@atproto/api'
import {
  useAuthContext,
  useAuthDid,
  useAuthIdentifier,
  usePdsAgent,
} from './AuthContext'
import {
  ConfigurationState,
  useConfigurationContext,
} from './ConfigurationContext'

export function ConfigurationFlow() {
  const { signOut } = useAuthContext()
  const authDid = useAuthDid()
  const identifier = useAuthIdentifier()

  const { state, config } = useConfigurationContext()

  if (!authDid || state === ConfigurationState.Unavailable) {
    return (
      <>
        <ErrorInfo type="warn" className="mt-2">
          {`You're`} not logged-in. Please login using your Ozone service
          account in order to configure Ozone.
        </ErrorInfo>
        <Button
          className="w-full mt-2"
          icon={<ArrowLeftOnRectangleIcon />}
          onClick={() => window.location.reload()}
        >
          Restart
        </Button>
      </>
    )
  }

  if (!config) {
    return <Loading message="Loading configuration..." />
  }

  if (config.needs.key || config.needs.service) {
    if (authDid !== config.did) {
      return (
        <>
          <ErrorInfo type="warn" className="mt-2">
            {`You're`} logged in as {identifier}. Please login as{' '}
            {config.handle || 'your Ozone service account'} in order to
            configure Ozone.
          </ErrorInfo>
          <Button
            className="w-full mt-2"
            icon={<ArrowLeftOnRectangleIcon />}
            onClick={signOut}
          >
            Restart
          </Button>
        </>
      )
    }
    if (config.did.startsWith('did:web:')) {
      return (
        <>
          <ErrorInfo type="warn" className="mt-2">
            You must configure your identity on your own if {`you're`} using a
            did:web. You will need to add a service with id{' '}
            {`"atproto_labeler"`} and verification method with id{' '}
            {`"atproto_label"`}.
          </ErrorInfo>
          <Button
            className="w-full mt-2"
            icon={<ArrowLeftOnRectangleIcon />}
            onClick={signOut}
          >
            Restart
          </Button>
        </>
      )
    }
    if (!config.doc) {
      return (
        <>
          <ErrorInfo type="warn" className="mt-2">
            We could not find identity information for the account{' '}
            <b>{identifier}</b>. Are you sure this account has an identity on
            the network?
          </ErrorInfo>
          <Button
            className="w-full mt-2"
            icon={<ArrowLeftOnRectangleIcon />}
            onClick={signOut}
          >
            Restart
          </Button>
        </>
      )
    }
    if (!config.meta) {
      return (
        <>
          <ErrorInfo type="warn" className="mt-2">
            We could not find your Ozone service configuration. Please ensure
            {`you're`} currently on the domain where your Ozone service is
            running.
          </ErrorInfo>
          <Button
            className="w-full mt-2"
            icon={<ArrowLeftOnRectangleIcon />}
            onClick={signOut}
          >
            Restart
          </Button>
        </>
      )
    }
    return <IdentityConfigurationFlow />
  }

  if (
    (!config.matching.key || !config.matching.service) &&
    config.doc &&
    config.meta
  ) {
    return (
      <ErrorInfo type="warn" className="mt-2">
        {`There's`} a configuration issue: you will need to update your identity
        or your Ozone service.
        <br />
        <br />
        {!config.matching.service && (
          <>
            Your Ozone service is running at <b>{config.meta.url}</b>, but your
            identity points to{' '}
            <b>{getServiceUrlFromDoc(config.doc, 'atproto_labeler')}</b>.
          </>
        )}
        {!config.matching.service && !config.matching.key && (
          <>
            <br />
            <br />
          </>
        )}
        {!config.matching.key && (
          <>
            Your Ozone service is configured with a different key than the key
            associated with {config.handle}.
          </>
        )}
      </ErrorInfo>
    )
  }

  if (config.needs.record) {
    return <RecordConfigurationFlow />
  }

  return <Loading message="Logging in..." />
}

function IdentityConfigurationFlow() {
  const [token, setToken] = useState('')
  const { signOut } = useAuthContext()

  const { config, labelerAgent, reconfigure } = useConfigurationContext()
  if (!config || !labelerAgent) throw new Error('Missing configuration context')

  const pdsAgent = usePdsAgent()

  const requestPlcOperationSignature = useMutation({
    mutationFn: async () => {
      await labelerAgent.api.com.atproto.identity.requestPlcOperationSignature()
    },
  })
  const submitPlcOperation = useMutation({
    mutationFn: async () => {
      await updatePlcIdentity(pdsAgent, token, withDocAndMeta(config))
      reconfigure()
    },
  })

  return (
    <div className="text-gray-600 dark:text-gray-100 mt-4">
      <p className="mt-4">
        It looks like the network doesn&#39;t understand that{' '}
        <b>{config.handle}</b> is a moderation service yet. Let&#39;s get you
        setup!
      </p>
      <p className="mt-4">
        We will be associating your service running at <b>{config.meta?.url}</b>{' '}
        with your moderation account <b>{config.handle}</b>. It is highly{' '}
        recommended <i>not</i> to use a personal account for this.
      </p>
      {requestPlcOperationSignature.isError && (
        <ErrorInfo type="warn" className="mt-4">
          We weren&#39;t able to send a confirmation email. Try sending again,
          or seek support.
        </ErrorInfo>
      )}
      {!requestPlcOperationSignature.isSuccess && (
        <div className="flex mt-4">
          <Button
            disabled={requestPlcOperationSignature.isLoading}
            className="w-full mr-2"
            icon={<ArrowLeftOnRectangleIcon />}
            onClick={signOut}
          >
            Cancel
          </Button>
          <Button
            disabled={requestPlcOperationSignature.isLoading}
            className="w-full ml-2"
            icon={<ArrowRightCircleIcon />}
            onClick={() => requestPlcOperationSignature.mutate()}
          >
            Continue
          </Button>
        </div>
      )}
      {requestPlcOperationSignature.isSuccess && (
        <>
          <p className="mt-4">
            You should receive an email containing a confirmation code for a{' '}
            {'"PLC Update"'}. Please enter it below:
          </p>
          <Input
            type="text"
            placeholder="Confirmation Code"
            className="block w-full mt-2"
            value={token}
            onChange={(ev) => setToken(ev.target.value)}
          />
          {submitPlcOperation.isError && (
            <ErrorInfo type="warn" className="mt-4">
              Submitting your PLC operation failed:
              <br />
              {submitPlcOperation.error?.['message']}
            </ErrorInfo>
          )}
          <div className="flex mt-4">
            <Button
              disabled={
                submitPlcOperation.isLoading || submitPlcOperation.isSuccess
              }
              className="w-full mr-2"
              icon={<ArrowLeftOnRectangleIcon />}
              onClick={signOut}
            >
              Cancel
            </Button>
            <Button
              disabled={
                submitPlcOperation.isLoading ||
                submitPlcOperation.isSuccess ||
                !token
              }
              className="w-full ml-2"
              icon={<ArrowRightCircleIcon />}
              onClick={() => submitPlcOperation.mutate()}
            >
              Submit
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function RecordConfigurationFlow() {
  const [checked, setChecked] = useState(false)
  const authDid = useAuthDid()

  const { config, labelerAgent, reconfigure } = useConfigurationContext()
  if (!config || !labelerAgent) throw new Error('Missing configuration context')

  const identifier = useAuthIdentifier()

  const putServiceRecord = useMutation({
    mutationFn: async () => {
      await labelerAgent.api.com.atproto.repo.putRecord({
        repo: config.did,
        collection: 'app.bsky.labeler.service',
        rkey: 'self',
        record: {
          createdAt: new Date().toISOString(),
          policies: { labelValues: [] },
        },
      })
    },
  })
  return (
    <div className="text-gray-600 dark:text-gray-100 mt-4">
      <p className="mt-4">
        Your Ozone service configuration and your identity are in sync.
      </p>
      <p className="mt-4">
        The final step is to publish a record that will allow your account
        appear as a moderation service in the Bluesky application. Users of the
        app will be able to start using the labels you publish.
      </p>
      {config.needs.pds && (
        <ErrorInfo type="warn" className="mt-4">
          Your account {config.handle} needs to have a repository hosted on a
          PDS before we can create the record.
          <br />
          <br />
          You may skip this step and come back to it next time you login.
        </ErrorInfo>
      )}
      {authDid !== config.did && (
        <ErrorInfo type="warn" className="mt-4">
          {`You're`} logged in as {identifier}. Please login as{' '}
          {config.handle || 'your Ozone service account'} in order to configure
          Ozone.
          <br />
          <br />
          You may skip this step and come back to it next time you login.
        </ErrorInfo>
      )}
      {putServiceRecord.isError && (
        <ErrorInfo type="warn" className="mt-4">
          We {`weren't`} able to create the service record. Please try again, or
          seek support.
        </ErrorInfo>
      )}
      <div className="flex mt-4">
        <Button
          disabled={putServiceRecord.isLoading || putServiceRecord.isSuccess}
          className="w-full mr-2"
          icon={<ArrowRightOnRectangleIcon />}
          onClick={() => {
            reconfigure({ skipRecord: true })
          }}
        >
          Skip
        </Button>
        <Button
          disabled={
            putServiceRecord.isLoading ||
            putServiceRecord.isSuccess ||
            authDid !== config.did ||
            config.needs.pds ||
            !checked
          }
          className="w-full ml-2"
          icon={<ArrowRightCircleIcon />}
          onClick={async () => {
            await putServiceRecord.mutateAsync()
            reconfigure({ skipRecord: false })
          }}
        >
          Submit
        </Button>
      </div>
      <p className="text-center mt-2">
        <Checkbox
          checked={checked}
          onChange={(ev) => setChecked(ev.target.checked)}
          label={
            <>
              I have read the{' '}
              <Link
                href="https://bsky.social/about/support/community-guidelines#labeler"
                target="_blank"
                className="text-blue-500"
              >
                Bluesky Labeler Community Guidelines
              </Link>
            </>
          }
        />
      </p>
    </div>
  )
}

function Button({
  children,
  className = '',
  icon,
  ...others
}: ComponentProps<'button'> & { icon: ReactElement }) {
  return (
    <button
      type="button"
      className={`group relative flex justify-center rounded-md border border-transparent py-2 px-4 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-rose-500 dark:focus:ring-slate-500 focus:ring-offset-2 bg-rose-600 dark:bg-teal-600 hover:bg-rose-700 dark:hover:bg-teal-700 dark:disabled:bg-gray-500 disabled:bg-gray-500 ${className}`}
      {...others}
    >
      <span className="absolute inset-y-0 left-0 flex items-center pl-3">
        {cloneElement(icon, {
          className: `h-5 w-5 text-rose-500 dark:text-gray-50 group-hover:text-rose-400 dark:group-hover:text-gray-100`,
          'aria-hidden': 'true',
        })}
      </span>
      {children}
    </button>
  )
}

async function updatePlcIdentity(
  client: BskyAgent,
  token: string,
  config: OzoneConfigFull,
) {
  const services = config.needs.service ? { ...config.doc.services } : undefined
  if (services) {
    services['atproto_labeler'] = {
      type: 'AtprotoLabeler',
      endpoint: config.meta.url,
    }
  }
  const verificationMethods = config.needs.key
    ? { ...config.doc.verificationMethods }
    : undefined
  if (verificationMethods) {
    verificationMethods['atproto_label'] = config.meta.publicKey
  }
  const { data: signed } =
    await client.api.com.atproto.identity.signPlcOperation({
      token,
      verificationMethods,
      services,
    })
  await client.api.com.atproto.identity.submitPlcOperation({
    operation: signed.operation,
  })
  if (config.handle) {
    // @NOTE temp hack to push an identity op through
    await client.api.com.atproto.identity.updateHandle({
      handle: config.handle,
    })
  }
}
