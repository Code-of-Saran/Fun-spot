import background from '../../assets/funspot-background.webp';
import './Backdrop.css';

/**
 * Fixed full-viewport backdrop built from the custom Fun Spot background image,
 * softened with a dark tint, vignette and faint scanlines so content stays readable.
 */
export default function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop__image" style={{ backgroundImage: `url(${background})` }} />
      <div className="backdrop__overlay" />
    </div>
  );
}
