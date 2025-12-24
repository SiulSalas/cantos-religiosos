import { Box, Button, Chip, Container, Divider, Paper, Stack, Typography } from '@mui/material'
import useMediaQuery from '@mui/material/useMediaQuery'
import ArrowBack from '@mui/icons-material/ArrowBack'
import Add from '@mui/icons-material/Add'
import Remove from '@mui/icons-material/Remove'
import FormatBold from '@mui/icons-material/FormatBold'
import Fullscreen from '@mui/icons-material/Fullscreen'
import FullscreenExit from '@mui/icons-material/FullscreenExit'
import RestartAlt from '@mui/icons-material/RestartAlt'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { UIEvent } from 'react'
import { cantos, type Canto } from './data/cantos'

const MIN_FONT_SIZE = 16
const MAX_FONT_SIZE = 220
const ICON_SIZE = { xs: 24, sm: 30, md: 36, lg: 42 }
const LETTER_SPACING_EM = 0.03
const INDEX_TITLE_MIN = 28
const INDEX_TITLE_MAX = 180
const INDEX_TITLE_LETTER_SPACING_EM = 0.02
const STORAGE_FONT_SIZE_KEY = 'cantos.preferredFontSize'
const STORAGE_BOLD_KEY = 'cantos.preferredBold'
const FONT_FAMILY =
  '"Atkinson Hyperlegible Next", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'

const CONTROL_BUTTON_SX = {
  color: '#ffffff',
  borderColor: '#6b6b6b',
  fontWeight: 600,
  display: 'flex',
  flexDirection: 'column',
  gap: { xs: 0.2, sm: 0.35, md: 0.5 },
  textTransform: 'none',
  fontSize: { xs: '0.6rem', sm: '0.8rem', md: '0.95rem', lg: '1.05rem' },
  lineHeight: 1.05,
  px: { xs: 0.75, sm: 1, md: 1.25 },
  py: { xs: 0.45, sm: 0.65, md: 0.85 },
  minWidth: { xs: 64, sm: 90, md: 110 },
  flex: '0 1 auto',
  '& span': {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}

type Route =
  | { kind: 'home' }
  | { kind: 'tags' }
  | { kind: 'canto'; slug: string }

type TagCount = {
  tag: string
  count: number
}

const isFullscreenActive = () => {
  if (typeof document === 'undefined') {
    return false
  }
  const doc = document as Document & { webkitFullscreenElement?: Element }
  return Boolean(document.fullscreenElement || doc.webkitFullscreenElement)
}

const requestFullscreen = () => {
  if (typeof document === 'undefined') {
    return Promise.resolve()
  }
  const element = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => void
  }
  if (element.requestFullscreen) {
    return element.requestFullscreen()
  }
  if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen()
  }
  return Promise.resolve()
}

const exitFullscreen = () => {
  if (typeof document === 'undefined') {
    return Promise.resolve()
  }
  const doc = document as Document & { webkitExitFullscreen?: () => void }
  if (document.exitFullscreen) {
    return document.exitFullscreen()
  }
  if (doc.webkitExitFullscreen) {
    doc.webkitExitFullscreen()
  }
  return Promise.resolve()
}

const measureTextWidth = (() => {
  let canvas: HTMLCanvasElement | null = null
  return (text: string, fontSize: number, fontWeight: number) => {
    if (!canvas) {
      canvas = document.createElement('canvas')
    }
    const context = canvas.getContext('2d')
    if (!context) {
      return text.length * fontSize * 0.6
    }
    context.font = `${fontWeight} ${fontSize}px ${FONT_FAMILY}`
    return context.measureText(text).width
  }
})()

const measureLineWidth = (
  text: string,
  fontSize: number,
  fontWeight: number,
  letterSpacingEm: number
) => {
  const baseWidth = measureTextWidth(text, fontSize, fontWeight)
  if (text.length < 2) {
    return baseWidth
  }
  return baseWidth + (text.length - 1) * fontSize * letterSpacingEm
}

const fitFontSize = (
  text: string,
  width: number,
  fontWeight: number,
  options: {
    min?: number
    max?: number
    letterSpacingEm?: number
  } = {}
) => {
  if (!text || width <= 0) {
    return options.min ?? MIN_FONT_SIZE
  }
  const min = options.min ?? MIN_FONT_SIZE
  const max = options.max ?? MAX_FONT_SIZE
  const letterSpacingEm = options.letterSpacingEm ?? LETTER_SPACING_EM
  const minWidth = measureLineWidth(text, min, fontWeight, letterSpacingEm)
  if (minWidth > width) {
    const scaled = Math.floor((width / minWidth) * min)
    return Math.max(12, scaled)
  }
  let low = min
  let high = Math.max(max, Math.floor(width))
  let best = min
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const measured = measureLineWidth(text, mid, fontWeight, letterSpacingEm)
    if (measured <= width) {
      best = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return best
}

const getRouteFromHash = (): Route => {
  if (typeof window === 'undefined') {
    return { kind: 'home' }
  }
  const raw = decodeURIComponent(window.location.hash.replace('#', '').trim())
  if (!raw) {
    return { kind: 'home' }
  }
  if (raw === 'tags') {
    return { kind: 'tags' }
  }
  return { kind: 'canto', slug: raw }
}

const updateHash = (value: string) => {
  if (typeof window === 'undefined') {
    return
  }
  window.location.hash = value
}

const clearHash = () => {
  if (typeof window === 'undefined') {
    return
  }
  window.history.pushState(
    '',
    document.title,
    window.location.pathname + window.location.search
  )
}

const findLongestLine = (lines: string[]) => {
  let longest = ''
  for (const line of lines) {
    const trimmed = line.trimEnd()
    if (trimmed.length > longest.length) {
      longest = trimmed
    }
  }
  return longest
}

const loadPreferredFontSize = () => {
  if (typeof window === 'undefined') {
    return null
  }
  const raw = window.localStorage.getItem(STORAGE_FONT_SIZE_KEY)
  if (!raw) {
    return null
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    return null
  }
  return Math.max(MIN_FONT_SIZE, parsed)
}

const savePreferredFontSize = (value: number | null) => {
  if (typeof window === 'undefined') {
    return
  }
  if (value === null) {
    window.localStorage.removeItem(STORAGE_FONT_SIZE_KEY)
    return
  }
  window.localStorage.setItem(STORAGE_FONT_SIZE_KEY, String(value))
}

const loadPreferredBold = () => {
  if (typeof window === 'undefined') {
    return false
  }
  return window.localStorage.getItem(STORAGE_BOLD_KEY) === 'true'
}

const savePreferredBold = (value: boolean) => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(STORAGE_BOLD_KEY, value ? 'true' : 'false')
}

const clampValue = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const getIndexSizes = (baseSize: number) => ({
  title: clampValue(baseSize, INDEX_TITLE_MIN, INDEX_TITLE_MAX),
  section: clampValue(Math.round(baseSize * 0.45), 18, 120),
  cardTitle: clampValue(Math.round(baseSize * 0.6), 20, 140),
  body: clampValue(Math.round(baseSize * 0.32), 14, 72),
  chip: clampValue(Math.round(baseSize * 0.28), 12, 60),
  button: clampValue(Math.round(baseSize * 0.3), 14, 72),
})

const useFittedTextScale = (
  lines: string[],
  options: {
    min: number
    max: number
    weight: number
    letterSpacingEm: number
  }
) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const longestLine = useMemo(() => findLongestLine(lines), [lines])
  const [size, setSize] = useState(options.min)

  useEffect(() => {
    const element = ref.current
    if (!element) {
      return
    }
    const updateSize = () => {
      const width = element.clientWidth
      if (!width) {
        return
      }
      setSize(
        fitFontSize(longestLine, width, options.weight, {
          min: options.min,
          max: options.max,
          letterSpacingEm: options.letterSpacingEm,
        })
      )
    }
    updateSize()
    if (document.fonts?.ready) {
      document.fonts.ready.then(updateSize).catch(() => {})
    }
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [longestLine, options.letterSpacingEm, options.max, options.min, options.weight])

  return { ref, size }
}

const getTagCounts = (items: Canto[]): TagCount[] => {
  const counts = new Map<string, number>()
  for (const canto of items) {
    for (const tag of canto.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'es-MX'))
}

const ListaCantos = ({
  cantos,
  totalCount,
  selectedTag,
  onSelect,
  onSelectTag,
  onClearTag,
  topTags,
  onViewTags,
}: {
  cantos: Canto[]
  totalCount: number
  selectedTag: string
  onSelect: (slug: string) => void
  onSelectTag: (tag: string) => void
  onClearTag: () => void
  topTags: TagCount[]
  onViewTags: () => void
}) => {
  const referenceLines = useMemo(
    () => ['Cantos religiosos mexicanos', ...cantos.map((canto) => canto.title)],
    [cantos]
  )
  const { ref: scaleRef, size: baseSize } = useFittedTextScale(referenceLines, {
    min: INDEX_TITLE_MIN,
    max: INDEX_TITLE_MAX,
    weight: 700,
    letterSpacingEm: INDEX_TITLE_LETTER_SPACING_EM,
  })
  const sizes = useMemo(() => getIndexSizes(baseSize), [baseSize])
  const chipBaseSx = {
    fontSize: `${sizes.chip}px`,
    height: 'auto',
    lineHeight: 1.2,
    '& .MuiChip-label': {
      px: 1.2,
      py: 0.4,
    },
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Container
        maxWidth={false}
        disableGutters
        sx={{ px: { xs: 1, sm: 2, md: 3 }, py: 5 }}
      >
        <Box ref={scaleRef} sx={{ width: '100%' }}>
          <Stack spacing={3}>
            <Box>
              <Typography
                component="h1"
                sx={{
                  fontSize: `${sizes.title}px`,
                  fontWeight: 700,
                  lineHeight: 1.05,
                  letterSpacing: `${INDEX_TITLE_LETTER_SPACING_EM}em`,
                }}
              >
                Cantos religiosos mexicanos
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ fontSize: `${sizes.body}px`, lineHeight: 1.4 }}
              >
                Selecciona un canto para abrirlo en modo lectura.
              </Typography>
            </Box>

            {selectedTag && (
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 2, sm: 3 },
                  borderColor: 'divider',
                  backgroundColor: 'background.paper',
                }}
              >
                <Stack spacing={2}>
                  <Typography
                    sx={{
                      fontSize: `${sizes.section}px`,
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  >
                    Filtro activo
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Chip
                      label={selectedTag}
                      variant="outlined"
                      sx={{
                        ...chipBaseSx,
                        color: '#ffffff',
                        borderColor: '#ffffff',
                        backgroundColor: '#1a1a1a',
                      }}
                    />
                    <Button
                      variant="outlined"
                      onClick={onClearTag}
                      sx={{
                        fontSize: `${sizes.button}px`,
                        color: '#ffffff',
                        borderColor: '#6b6b6b',
                        fontWeight: 600,
                        lineHeight: 1.2,
                        px: 2,
                        py: 1,
                        alignSelf: 'center',
                      }}
                    >
                      Quitar filtro
                    </Button>
                  </Stack>
                  <Typography
                    color="text.secondary"
                    sx={{ fontSize: `${sizes.body}px`, lineHeight: 1.4 }}
                  >
                    Mostrando {cantos.length} de {totalCount} cantos.
                  </Typography>
                </Stack>
              </Paper>
            )}

            {topTags.length > 0 && (
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 2, sm: 3 },
                  borderColor: 'divider',
                  backgroundColor: 'background.paper',
                }}
              >
                <Stack spacing={2}>
                  <Typography
                    sx={{
                      fontSize: `${sizes.section}px`,
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  >
                    Etiquetas mas usadas
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {topTags.map((tag) => (
                      <Chip
                        key={`destacado-${tag.tag}`}
                        label={`${tag.tag} (${tag.count})`}
                        variant="outlined"
                        onClick={() => onSelectTag(tag.tag)}
                        sx={{
                          ...chipBaseSx,
                          color: '#ffffff',
                          borderColor:
                            selectedTag === tag.tag ? '#ffffff' : '#4c4c4c',
                          backgroundColor:
                            selectedTag === tag.tag ? '#1a1a1a' : 'transparent',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </Stack>
                  {topTags.length >= 10 && (
                    <Button
                      variant="outlined"
                      onClick={onViewTags}
                      sx={{
                        fontSize: `${sizes.button}px`,
                        color: '#ffffff',
                        borderColor: '#6b6b6b',
                        fontWeight: 600,
                        lineHeight: 1.2,
                        px: 2,
                        py: 1,
                        alignSelf: 'flex-start',
                      }}
                    >
                      Ver todas las etiquetas
                    </Button>
                  )}
                </Stack>
              </Paper>
            )}

            <Stack spacing={2}>
              {cantos.map((canto) => (
                <Paper
                  key={canto.slug}
                  component="button"
                  type="button"
                  onClick={() => onSelect(canto.slug)}
                  sx={{
                    width: '100%',
                    textAlign: 'left',
                    p: { xs: 2, sm: 3 },
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    backgroundColor: 'background.paper',
                    color: 'text.primary',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease',
                    '&:hover': { borderColor: '#ffffff' },
                    '&:focus-visible': {
                      outline: '2px solid #ffffff',
                      outlineOffset: '2px',
                    },
                  }}
                >
                  <Stack spacing={1}>
                    <Typography
                      component="h2"
                      sx={{
                        fontSize: `${sizes.cardTitle}px`,
                        fontWeight: 700,
                        lineHeight: 1.15,
                        letterSpacing: `${INDEX_TITLE_LETTER_SPACING_EM}em`,
                      }}
                    >
                      {canto.title}
                    </Typography>
                    {canto.tags.length > 0 && (
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {canto.tags.map((tag) => (
                          <Chip
                            key={`${canto.slug}-${tag}`}
                            label={tag}
                            variant="outlined"
                            onClick={(event) => {
                              event.stopPropagation()
                              onSelectTag(tag)
                            }}
                            sx={{
                              ...chipBaseSx,
                              color: '#ffffff',
                              borderColor:
                                selectedTag === tag ? '#ffffff' : '#4c4c4c',
                              backgroundColor:
                                selectedTag === tag ? '#1a1a1a' : 'transparent',
                              cursor: 'pointer',
                            }}
                          />
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>

            {cantos.length === 0 && (
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  borderColor: 'divider',
                  backgroundColor: 'background.paper',
                }}
              >
                <Typography sx={{ fontSize: `${sizes.body}px` }}>
                  No hay cantos todavia.
                </Typography>
              </Paper>
            )}
          </Stack>
        </Box>
      </Container>
    </Box>
  )
}

const PaginaTags = ({
  tags,
  selectedTag,
  onBack,
  onSelectTag,
}: {
  tags: TagCount[]
  selectedTag: string
  onBack: () => void
  onSelectTag: (tag: string) => void
}) => {
  const referenceLines = useMemo(
    () => ['Todas las etiquetas', ...tags.map((tag) => tag.tag)],
    [tags]
  )
  const { ref: scaleRef, size: baseSize } = useFittedTextScale(referenceLines, {
    min: INDEX_TITLE_MIN,
    max: INDEX_TITLE_MAX,
    weight: 700,
    letterSpacingEm: INDEX_TITLE_LETTER_SPACING_EM,
  })
  const sizes = useMemo(() => getIndexSizes(baseSize), [baseSize])
  const chipBaseSx = {
    fontSize: `${sizes.chip}px`,
    height: 'auto',
    lineHeight: 1.2,
    '& .MuiChip-label': {
      px: 1.2,
      py: 0.4,
    },
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Container
        maxWidth={false}
        disableGutters
        sx={{ px: { xs: 1, sm: 2, md: 3 }, py: 5 }}
      >
        <Box ref={scaleRef} sx={{ width: '100%' }}>
          <Stack spacing={3}>
            <Button
              variant="outlined"
              onClick={onBack}
              sx={{
                fontSize: `${sizes.button}px`,
                color: '#ffffff',
                borderColor: '#6b6b6b',
                fontWeight: 600,
                lineHeight: 1.2,
                px: 2,
                py: 1,
                alignSelf: 'flex-start',
              }}
            >
              Volver a cantos
            </Button>
            <Box>
              <Typography
                component="h1"
                sx={{
                  fontSize: `${sizes.title}px`,
                  fontWeight: 700,
                  lineHeight: 1.05,
                  letterSpacing: `${INDEX_TITLE_LETTER_SPACING_EM}em`,
                }}
              >
                Todas las etiquetas
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ fontSize: `${sizes.body}px`, lineHeight: 1.4 }}
              >
                Etiquetas disponibles y numero de cantos.
              </Typography>
            </Box>
            {tags.length > 0 ? (
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {tags.map((tag) => (
                  <Chip
                    key={`todas-${tag.tag}`}
                    label={`${tag.tag} (${tag.count})`}
                    variant="outlined"
                    onClick={() => onSelectTag(tag.tag)}
                    sx={{
                      ...chipBaseSx,
                      color: '#ffffff',
                      borderColor: selectedTag === tag.tag ? '#ffffff' : '#4c4c4c',
                      backgroundColor:
                        selectedTag === tag.tag ? '#1a1a1a' : 'transparent',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Stack>
            ) : (
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  borderColor: 'divider',
                  backgroundColor: 'background.paper',
                }}
              >
                <Typography sx={{ fontSize: `${sizes.body}px` }}>
                  No hay etiquetas todavia.
                </Typography>
              </Paper>
            )}
          </Stack>
        </Box>
      </Container>
    </Box>
  )
}

const LecturaCanto = ({
  canto,
  onBack,
  onSelectTag,
}: {
  canto: Canto
  onBack: () => void
  onSelectTag: (tag: string) => void
}) => {
  const lines = useMemo(() => canto.lyrics.split('\n'), [canto.lyrics])
  const verses = useMemo(
    () =>
      canto.lyrics
        .split(/\n\s*\n+/)
        .map((verse) => verse.trimEnd())
        .filter(Boolean),
    [canto.lyrics]
  )
  const longestLine = useMemo(() => findLongestLine(lines), [lines])
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [fontSize, setFontSize] = useState<number | null>(loadPreferredFontSize)
  const [baseFontSize, setBaseFontSize] = useState(MIN_FONT_SIZE)
  const [isBold, setIsBold] = useState(loadPreferredBold)
  const [isFullscreen, setIsFullscreen] = useState(isFullscreenActive())
  const [showControls, setShowControls] = useState(true)
  const lastScrollTop = useRef(0)
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const fontWeight = isBold ? 700 : 400
  const isCompactControls = useMediaQuery('(max-width: 900px)')
  const isLandscape = useMediaQuery('(orientation: landscape)')
  const useCompactLabels = isCompactControls || isLandscape

  useEffect(() => {
    const element = containerRef.current
    if (!element) {
      return
    }
    const updateSize = () => {
      const width = element.clientWidth
      if (!width) {
        return
      }
      const fitted = fitFontSize(longestLine, width, fontWeight, {
        min: MIN_FONT_SIZE,
        max: MAX_FONT_SIZE,
        letterSpacingEm: LETTER_SPACING_EM,
      })
      setBaseFontSize(fitted)
      setFontSize((current) =>
        current === null ? null : Math.max(MIN_FONT_SIZE, current)
      )
    }
    updateSize()
    if (document.fonts?.ready) {
      document.fonts.ready.then(updateSize).catch(() => {})
    }
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [longestLine, fontWeight])

  useEffect(() => {
    const handleChange = () => setIsFullscreen(isFullscreenActive())
    document.addEventListener('fullscreenchange', handleChange)
    document.addEventListener('webkitfullscreenchange', handleChange)
    handleChange()
    return () => {
      document.removeEventListener('fullscreenchange', handleChange)
      document.removeEventListener('webkitfullscreenchange', handleChange)
    }
  }, [])

  useEffect(() => {
    setShowControls(true)
    lastScrollTop.current = 0
  }, [canto.slug])

  const handleScrollValue = useCallback((rawValue: number) => {
    const threshold = 2
    const current = Math.max(0, rawValue)
    const previous = lastScrollTop.current
    const delta = current - previous
    if (Math.abs(delta) < threshold) {
      return
    }
    if (delta > 0) {
      setShowControls(true)
    } else {
      setShowControls(false)
    }
    lastScrollTop.current = current
  }, [])

  const handleScrollEvent = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      handleScrollValue(event.currentTarget.scrollTop)
    },
    [handleScrollValue]
  )

  useEffect(() => {
    const handleWindowScroll = () => {
      const value =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0
      handleScrollValue(value)
    }

    window.addEventListener('scroll', handleWindowScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleWindowScroll)
    }
  }, [handleScrollValue])

  const resolvedFontSize = fontSize ?? baseFontSize
  const canDecrease = resolvedFontSize > MIN_FONT_SIZE
  const isDefaultSize = fontSize === null

  const handleIncrease = () => {
    setFontSize((current) => {
      const base = current ?? baseFontSize
      return base + 2
    })
  }

  const handleDecrease = () => {
    setFontSize((current) => {
      const base = current ?? baseFontSize
      return Math.max(MIN_FONT_SIZE, base - 2)
    })
  }

  const controlLabels = useMemo(
    () => ({
      back: useCompactLabels ? 'Volver' : 'Volver a la lista',
      decrease: useCompactLabels ? 'Menos' : 'Reducir letra',
      reset: useCompactLabels ? 'Restab.' : 'Restablecer letra',
      increase: useCompactLabels ? 'Mas' : 'Aumentar letra',
      bold: 'Negritas',
      fullscreen: useCompactLabels
        ? isFullscreen
          ? 'Salir'
          : 'Pantalla'
        : isFullscreen
          ? 'Salir de pantalla completa'
          : 'Pantalla completa',
    }),
    [isFullscreen, useCompactLabels]
  )

  useEffect(() => {
    savePreferredFontSize(fontSize)
  }, [fontSize])

  useEffect(() => {
    savePreferredBold(isBold)
  }, [isBold])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        height: '100vh',
        '@supports (height: 100dvh)': {
          height: '100dvh',
        },
        width: '100vw',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          px: { xs: 0.5, sm: 1, md: 2 },
          py: { xs: 0.4, sm: 0.8, md: 1.2 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.default',
        }}
      >
        <Stack spacing={{ xs: 0.6, sm: 1, md: 1.25 }} alignItems="stretch">
          <Box
            sx={{
              maxHeight: showControls ? { xs: 110, sm: 130, md: 160 } : 0,
              opacity: showControls ? 1 : 0,
              transform: showControls ? 'translateY(0)' : 'translateY(-8px)',
              transition: 'max-height 0.25s ease, opacity 0.2s ease, transform 0.2s ease',
              overflow: 'hidden',
              pointerEvents: showControls ? 'auto' : 'none',
            }}
          >
            <Stack
              direction="row"
              useFlexGap
              sx={{
                gap: { xs: 0.5, sm: 0.75 },
                flexWrap: 'nowrap',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Button
                variant="outlined"
                onClick={onBack}
                sx={{
                  ...CONTROL_BUTTON_SX,
                  '&.Mui-disabled': {
                    color: '#6b6b6b',
                    borderColor: '#333333',
                  },
                }}
              >
                <ArrowBack sx={{ fontSize: ICON_SIZE }} />
                <span>{controlLabels.back}</span>
              </Button>
              <Stack direction="row" useFlexGap sx={{ gap: { xs: 0.5, sm: 0.75 } }}>
                <Button
                  variant="outlined"
                  onClick={handleDecrease}
                  disabled={!canDecrease}
                  sx={{
                    ...CONTROL_BUTTON_SX,
                    '&.Mui-disabled': {
                      color: '#6b6b6b',
                      borderColor: '#333333',
                    },
                  }}
                >
                  <Remove sx={{ fontSize: ICON_SIZE }} />
                  <span>{controlLabels.decrease}</span>
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setFontSize(null)}
                  disabled={isDefaultSize}
                  sx={{
                    ...CONTROL_BUTTON_SX,
                    '&.Mui-disabled': {
                      color: '#6b6b6b',
                      borderColor: '#333333',
                    },
                  }}
                >
                  <RestartAlt sx={{ fontSize: ICON_SIZE }} />
                  <span>{controlLabels.reset}</span>
                </Button>
                <Button variant="outlined" onClick={handleIncrease} sx={CONTROL_BUTTON_SX}>
                  <Add sx={{ fontSize: ICON_SIZE }} />
                  <span>{controlLabels.increase}</span>
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setIsBold((prev) => !prev)}
                  aria-pressed={isBold}
                  sx={{
                    ...CONTROL_BUTTON_SX,
                    borderColor: isBold ? '#ffffff' : '#6b6b6b',
                    backgroundColor: isBold ? '#1a1a1a' : 'transparent',
                  }}
                >
                  <FormatBold sx={{ fontSize: ICON_SIZE }} />
                  <span>{controlLabels.bold}</span>
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    if (isFullscreen) {
                      void exitFullscreen()
                    } else {
                      void requestFullscreen()
                    }
                  }}
                  aria-pressed={isFullscreen}
                  sx={{
                    ...CONTROL_BUTTON_SX,
                    borderColor: isFullscreen ? '#ffffff' : '#6b6b6b',
                    backgroundColor: isFullscreen ? '#1a1a1a' : 'transparent',
                  }}
                >
                  {isFullscreen ? (
                    <FullscreenExit sx={{ fontSize: ICON_SIZE }} />
                  ) : (
                    <Fullscreen sx={{ fontSize: ICON_SIZE }} />
                  )}
                  <span>{controlLabels.fullscreen}</span>
                </Button>
              </Stack>
            </Stack>
          </Box>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.2rem', sm: '1.6rem', md: '2rem' },
                lineHeight: 1.2,
              }}
            >
              {canto.title}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box
        ref={scrollAreaRef}
        onScroll={handleScrollEvent}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          px: 0,
          py: { xs: 3, md: 4 },
        }}
      >
        <Box ref={containerRef} sx={{ width: '100%' }}>
          <Stack
            spacing={6}
            divider={<Divider flexItem sx={{ borderColor: '#ffffff', my: 3 }} />}
          >
            {verses.map((verse, index) => (
              <Typography
                key={`${canto.slug}-verso-${index}`}
                component="pre"
                sx={{
                  m: 0,
                  whiteSpace: 'pre-wrap',
                  textAlign: 'center',
                  fontSize: `${resolvedFontSize}px`,
                  lineHeight: 1.75,
                  letterSpacing: `${LETTER_SPACING_EM}em`,
                  wordBreak: 'normal',
                  overflowWrap: 'break-word',
                  fontWeight,
                  fontFamily: FONT_FAMILY,
                }}
              >
                {verse}
              </Typography>
            ))}
          </Stack>
          {canto.tags.length > 0 && (
            <Stack spacing={2} sx={{ mt: 6 }}>
              <Divider flexItem sx={{ borderColor: '#ffffff' }} />
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {canto.tags.map((tag) => (
                  <Chip
                    key={`${canto.slug}-${tag}-pie`}
                    label={tag}
                    variant="outlined"
                    size="small"
                    onClick={() => onSelectTag(tag)}
                    sx={{
                      color: '#ffffff',
                      borderColor: '#4c4c4c',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Stack>
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default function App() {
  const [route, setRoute] = useState<Route>(getRouteFromHash)
  const [selectedTag, setSelectedTag] = useState('')
  const tags = useMemo(() => getTagCounts(cantos), [])
  const topTags = useMemo(() => tags.slice(0, 10), [tags])
  const filteredCantos = useMemo(() => {
    if (!selectedTag) {
      return cantos
    }
    return cantos.filter((canto) => canto.tags.includes(selectedTag))
  }, [selectedTag])

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const selected =
    route.kind === 'canto'
      ? cantos.find((canto) => canto.slug === route.slug) ?? null
      : null

  const goHome = () => {
    clearHash()
    setRoute({ kind: 'home' })
  }

  const handleSelectTag = (tag: string) => {
    setSelectedTag(tag)
    goHome()
    void exitFullscreen()
  }

  if (route.kind === 'tags') {
    return (
      <PaginaTags
        tags={tags}
        selectedTag={selectedTag}
        onBack={goHome}
        onSelectTag={handleSelectTag}
      />
    )
  }

  if (selected) {
    return (
      <LecturaCanto
        canto={selected}
        onBack={() => {
          goHome()
          void exitFullscreen()
        }}
        onSelectTag={handleSelectTag}
      />
    )
  }

  return (
    <ListaCantos
      cantos={filteredCantos}
      totalCount={cantos.length}
      selectedTag={selectedTag}
      onSelect={(slug) => {
        void requestFullscreen()
        updateHash(slug)
      }}
      onSelectTag={handleSelectTag}
      onClearTag={() => setSelectedTag('')}
      onViewTags={() => updateHash('tags')}
      topTags={topTags}
    />
  )
}
