import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import './TrustModal.css';

export default function TrustModal({ open, onClose, initialTab = 'privacy' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const titles = {
    privacy: 'CAMERA & PRIVACY NOTICE',
    about: 'ABOUT FUN SPOT',
    terms: 'EXPO RULES & GUIDELINES',
    station: 'STATION INFORMATION',
  };

  return (
    <Modal open={open} onClose={onClose} title={titles[activeTab] || 'ARCADE INFORMATION'}>
      <div className="trust-modal__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'privacy'}
          className={`trust-modal__tab ${activeTab === 'privacy' ? 'trust-modal__tab--active' : ''}`}
          onClick={() => setActiveTab('privacy')}
        >
          Camera &amp; Privacy
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'about'}
          className={`trust-modal__tab ${activeTab === 'about' ? 'trust-modal__tab--active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          About Arcade
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'terms'}
          className={`trust-modal__tab ${activeTab === 'terms' ? 'trust-modal__tab--active' : ''}`}
          onClick={() => setActiveTab('terms')}
        >
          Expo Guidelines
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'station'}
          className={`trust-modal__tab ${activeTab === 'station' ? 'trust-modal__tab--active' : ''}`}
          onClick={() => setActiveTab('station')}
        >
          Station Info
        </button>
      </div>

      <div className="trust-modal__content">
        {activeTab === 'privacy' && (
          <>
            <div className="trust-modal__section">
              <h3 className="trust-modal__heading">Real-Time In-Browser Processing</h3>
              <p className="trust-modal__text">
                Your webcam video is analyzed exclusively in real time inside your browser using Google MediaPipe Pose and FaceMesh models. Raw video streams are never transmitted to external cloud servers, broadcast, or silently archived.
              </p>
            </div>

            <div className="trust-modal__section">
              <h3 className="trust-modal__heading">Photo Capture &amp; Consent</h3>
              <ul className="trust-modal__list">
                <li>
                  <strong>Don&apos;t Laugh:</strong> If the laugh detector catches you smiling or laughing, a reaction snapshot is saved locally to the arcade station (<code>backend/captures/dont-laugh/</code>). A clear consent notice is shown before any round begins.
                </li>
                <li>
                  <strong>Virtual Partner:</strong> 3D character companion and movement tracking render live on your screen. Souvenir photos are captured strictly when you tap the &ldquo;Capture Souvenir Photo&rdquo; button.
                </li>
                <li>
                  <strong>No Hidden Captures:</strong> Cameras are automatically deactivated whenever you leave active challenge screens.
                </li>
              </ul>
            </div>

            <div className="trust-modal__section">
              <h3 className="trust-modal__heading">Scores &amp; Personal Data</h3>
              <p className="trust-modal__text">
                In <strong>Face Off</strong>, facial expression scores are computed in real time right in your browser. No emails, phone numbers, or personal accounts are ever collected.
              </p>
            </div>
          </>
        )}

        {activeTab === 'about' && (
          <>
            <div className="trust-modal__section">
              <h3 className="trust-modal__heading">College Technology Expo Showcase</h3>
              <p className="trust-modal__text">
                Fun Spot is an interactive AI arcade developed for an engineering and technology college expo. It showcases real-time web computer vision, WebGL / Three.js 3D character retargeting, and generative AI judging.
              </p>
            </div>

            <div className="trust-modal__section">
              <h3 className="trust-modal__heading">Exactly Three Active Game Modes</h3>
              <ul className="trust-modal__list">
                <li>
                  <strong>Look A Like:</strong> AI-powered Indian celebrity resemblance game comparing facial expressions against humorous celebrity reactions in Solo and Group Match modes, with Google Drive export.
                </li>
                <li>
                  <strong>Don&apos;t Laugh:</strong> Face 45 seconds of absurd visuals and sound cues while the neural laugh detector monitors your face.
                </li>
                <li>
                  <strong>Face Off:</strong> Match extreme reference facial expressions against the AI with MediaPipe Face Landmarker, capturing souvenir comparison photos and competing on match accuracy.
                </li>
              </ul>
            </div>

            <div className="trust-modal__section">
              <h3 className="trust-modal__heading">Technology Stack</h3>
              <ul className="trust-modal__list">
                <li><strong>Frontend:</strong> React 19, Vite, Three.js WebGL, Google MediaPipe Vision.</li>
                <li><strong>Backend:</strong> Python AI judging and local capture manager.</li>
              </ul>
            </div>
          </>
        )}

        {activeTab === 'terms' && (
          <>
            <div className="trust-modal__section">
              <h3 className="trust-modal__heading">Expo Code of Conduct</h3>
              <p className="trust-modal__text">
                Fun Spot is designed for all college students, faculty, and visiting guests. We ask all players to keep the expo enjoyable and inclusive:
              </p>
              <ul className="trust-modal__list">
                <li>Keep answers playful, witty, and college-appropriate. Hate speech, vulgarity, or harassment are strictly prohibited.</li>
                <li>Camera participation is entirely voluntary. You may step away or close the game at any moment.</li>
                <li>Please do not force or pressure fellow students into webcam challenges against their will.</li>
              </ul>
            </div>

            <div className="trust-modal__section">
              <h3 className="trust-modal__heading">Fair Play &amp; Scoring</h3>
              <p className="trust-modal__text">
                Scores in Face Off measure geometric and blendshape facial expression alignment between 0% and 100% using MediaPipe Face Landmarker.
              </p>
            </div>
          </>
        )}

        {activeTab === 'station' && (
          <>
            <div className="trust-modal__section">
              <h3 className="trust-modal__heading">Arcade Station Installation</h3>
              <p className="trust-modal__text">
                This installation runs locally on the technology expo demonstration workstation.
              </p>
            </div>

            <div className="trust-modal__section">
              <h3 className="trust-modal__heading">Assistance &amp; Data Reset</h3>
              <p className="trust-modal__text">
                For assistance, device troubleshooting, or to request deletion of any locally saved reaction photo or nickname from this terminal, please contact the student booth demonstrator at the Fun Spot arcade desk.
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
