export type Canto = {
  slug: string
  title: string
  tags: string[]
  lyrics: string
}

const rawModules = import.meta.glob('../../cantos/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const normalizeLyrics = (value: string) =>
  value.replace(/\r\n/g, '\n').replace(/<br\s*\/?>/gi, '\n').trim()

const slugFromPath = (path: string) =>
  path.split('/').pop()?.replace(/\.md$/, '') ?? path

const titleFromSlug = (slug: string) =>
  slug
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ')

const stripQuotes = (value: string) => {
  const trimmed = value.trim()
  const hasDouble = trimmed.startsWith('"') && trimmed.endsWith('"')
  const hasSingle = trimmed.startsWith("'") && trimmed.endsWith("'")
  if (hasDouble || hasSingle) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

const parseInlineTags = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return []
  }
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((tag) => stripQuotes(tag))
      .map((tag) => tag.trim())
      .filter(Boolean)
  }
  return [stripQuotes(trimmed)].filter(Boolean)
}

const parseFrontmatter = (raw: string) => {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/^\uFEFF/, '')
  if (!normalized.startsWith('---\n')) {
    return { data: {}, content: normalized.trim() }
  }
  const endMarker = '\n---'
  const endIndex = normalized.indexOf(endMarker, 4)
  if (endIndex === -1) {
    return { data: {}, content: normalized.trim() }
  }
  const header = normalized.slice(4, endIndex).trim()
  const content = normalized
    .slice(endIndex + endMarker.length)
    .replace(/^\n/, '')
  const data: Record<string, unknown> = {}
  let tags: string[] = []
  let currentKey = ''

  for (const line of header.split('\n')) {
    const match = line.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)$/)
    if (match) {
      const key = match[1]
      const value = match[2] ?? ''
      currentKey = key
      if (key === 'tags') {
        if (value.trim()) {
          tags = parseInlineTags(value)
        }
        continue
      }
      data[key] = stripQuotes(value)
      continue
    }
    if (currentKey === 'tags') {
      const tagMatch = line.match(/^\s*-\s*(.+)$/)
      if (tagMatch) {
        tags.push(stripQuotes(tagMatch[1]))
      }
    }
  }

  if (tags.length > 0) {
    data.tags = tags
  }

  return { data, content }
}

export const cantos: Canto[] = Object.entries(rawModules)
  .map(([path, raw]) => {
    const { data, content } = parseFrontmatter(raw)
    const slug = slugFromPath(path)
    const title = typeof data.title === 'string' ? data.title : titleFromSlug(slug)
    const tags = Array.isArray(data.tags) ? data.tags.map(String) : []
    return {
      slug,
      title,
      tags,
      lyrics: normalizeLyrics(content),
    }
  })
  .sort((a, b) => a.title.localeCompare(b.title, 'es-MX'))
