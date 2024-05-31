'use client'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Posts } from '../posts/Posts'
import { useState } from 'react'
import { useRepoAndProfile } from '@/repositories/useRepoAndProfile'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

export function AuthorFeed({
  id,
  onReport,
}: {
  id: string
  onReport: (uri: string) => void
}) {
  const [query, setQuery] = useState('')
  const { data: repoData } = useRepoAndProfile({ id })
  const client = useLabelerAgent()

  const { data, fetchNextPage, hasNextPage, isFetching } = useInfiniteQuery({
    queryKey: ['authorFeed', { id, query }],
    queryFn: async ({ pageParam }) => {
      const searchPosts = query.length && repoData?.repo.handle
      if (searchPosts) {
        const { data } = await client.api.app.bsky.feed.searchPosts({
          q: `from:${repoData?.repo.handle} ${query}`,
          limit: 30,
          cursor: pageParam,
        })
        return { ...data, feed: data.posts.map((post) => ({ post })) }
      } else {
        const { data } = await client.api.app.bsky.feed.getAuthorFeed({
          actor: id,
          limit: 30,
          cursor: pageParam,
        })
        return data
      }
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
  const items = data?.pages.flatMap((page) => page.feed) ?? []

  return (
    <Posts
      items={items}
      setSearchQuery={setQuery}
      onReport={onReport}
      isFetching={isFetching}
      onLoadMore={hasNextPage ? () => fetchNextPage() : undefined}
    />
  )
}
