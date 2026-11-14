import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import TrustModal from './TrustModal';
import './Footer.css';

export default function Footer({ className = '' }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('privacy');

  const openTab = (tab) => {
    setModalTab(tab);
    setModalOpen(true);
  };

  const closeModal = useCallback(() => setModalOpen(false), []);

  return (
    <footer className={`footer ${className}`.trim()}>
      <p className="footer__brand">
        FUN SPOT <span aria-hidden="true">//</span> AI-POWERED INTERACTIVE ENTERTAINMENT ARCADE
      </p>
      <nav aria-label="Footer Navigation">
        <ul className="footer__links">
          <li>
            <Link to="/">Games</Link>
          </li>
          <li>
            <button type="button" onClick={() => openTab('privacy')}>
              Privacy &amp; Camera
            </button>
          </li>
          <li>
            <button type="button" onClick={() => openTab('about')}>
              About
            </button>
          </li>
          <li>
            <button type="button" onClick={() => openTab('terms')}>
              Expo Guidelines
            </button>
          </li>
          <li>
            <button type="button" onClick={() => openTab('station')}>
              Station Info
            </button>
          </li>
        </ul>
      </nav>
      <TrustModal open={modalOpen} onClose={closeModal} initialTab={modalTab} />
    </footer>
  );
}
