import { SparklesIcon } from '../../../components/common/Icons';

/**
 * The funny content panel.
 * Handles two item types:
 *   type: 'image' — original SVG cartoon scenes (bundled via import)
 *   type: 'gif'   — real animated GIFs served from /assets/gifs/ (auto-play)
 *
 * GIFs play automatically in <img> tags; browsers loop them by default.
 * A graceful text fallback replaces the broken-image icon on load failure.
 */
export default function FunnyContent({ item, imageRef, onBroken, placeholder }) {
  if (!item) {
    return (
      <div className="dl-content dl-content--idle">
        <span aria-hidden="true"><SparklesIcon size={32} /></span>
        <p>{placeholder}</p>
      </div>
    );
  }

  const isGif = item.type === 'gif';

  return (
    <figure key={item.id} className={`dl-content${isGif ? ' dl-content--gif' : ''}`}>
      <img
        ref={imageRef}
        src={item.src}
        alt=""
        draggable="false"
        style={isGif ? { objectFit: 'contain', width: '100%', height: '100%', display: 'block' } : undefined}
        onError={(e) => {
          // Hide broken-image icon; show a text placeholder instead
          e.currentTarget.style.display = 'none';
          const parent = e.currentTarget.parentElement;
          if (parent && !parent.querySelector('.dl-content__broken')) {
            const msg = document.createElement('div');
            msg.className = 'dl-content__broken';
            msg.textContent = 'Loading next comedy feed…';
            parent.insertBefore(msg, e.currentTarget);
          }
          onBroken(item.id);
        }}
      />
      {item.top && (
        <figcaption className="dl-content__caption dl-content__caption--top">{item.top}</figcaption>
      )}
      {item.bottom && (
        <figcaption className="dl-content__caption dl-content__caption--bottom">{item.bottom}</figcaption>
      )}
      <span className="visually-hidden">
        Funny scene: {item.top} {item.bottom}
      </span>
    </figure>
  );
}
