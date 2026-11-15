import { useQuery } from '../../lib/data/useQuery'
import { fetchFeedbackImageUrls } from '../../lib/data/feedbackImages'

// The teacher's pictures under a graded recording, for the pupil. A tap opens
// the full picture (e.g. to zoom into the score).
export function FeedbackImages({ paths }: { paths: string[] }) {
  const urls = useQuery(() => fetchFeedbackImageUrls(paths), [paths.join('|')])
  if (paths.length === 0) return null

  return (
    <div>
      <div className="font-heading font-semibold text-xs flex items-center gap-1.5 mb-1">
        <span aria-hidden>🖼️</span> Obrázky od učitele
      </div>
      <div className="flex flex-wrap gap-2">
        {paths.map((path, index) => {
          const url = urls.data?.get(path)
          return url ? (
            <a key={path} href={url} target="_blank" rel="noopener noreferrer" title="Otevřít obrázek">
              <img src={url} alt={`Obrázek od učitele ${index + 1}`} className="w-24 h-24 object-cover rounded-xl shadow-clay-sm" />
            </a>
          ) : (
            <div key={path} className="w-24 h-24 rounded-xl bg-bg-card-alt" aria-hidden />
          )
        })}
      </div>
      {urls.error && <p className="text-xs text-coral-dark mt-1">Obrázky se nepodařilo načíst.</p>}
    </div>
  )
}
