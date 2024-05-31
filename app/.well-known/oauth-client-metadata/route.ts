import { OAuthClientMetadata } from '@atproto/oauth-client'
import { OZONE_SERVICE_ORIGIN } from '@/lib/constants'

export async function GET(request: Request) {
  const originUri = new URL('/', OZONE_SERVICE_ORIGIN ?? request.url)

  // Loopback Client URIs must use "http://localhost/" (with no port) as origin
  const clientUri = isLoopback(originUri.hostname)
    ? new URL(originUri.pathname, 'http://localhost/')
    : new URL(originUri)

  // Loopback Redirect URIs must not use "localhost" as the hostname
  const redirectOriginUri = isLoopback(originUri.hostname)
    ? Object.assign(new URL(originUri), { hostname: toIp(originUri.hostname) })
    : originUri

  return Response.json({
    client_id: clientUri.href,
    client_uri: clientUri.href,
    redirect_uris: [redirectOriginUri.href],
    response_types: ['code id_token', 'code'],
    grant_types: ['authorization_code'],
    application_type: 'web',
    client_name: 'Ozone Service',
    logo_uri: new URL(
      `/_next/image?url=${encodeURIComponent(
        '/img/logo-colorful.png',
      )}&w=1080&q=75`,
      originUri,
    ).href,
    // tos_uri: 'https://example.com/tos',
    // policy_uri: 'https://example.com/policy',
    // jwks_uri: 'https://example.com/jwks',
  } satisfies OAuthClientMetadata)
}

function isLoopback(hostname: string) {
  return (
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
  )
}

function toIp(hostname: string) {
  if (hostname === 'localhost') return '127.0.0.1'
  return hostname
}
