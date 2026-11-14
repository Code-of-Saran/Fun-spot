import { Outlet, useLocation } from 'react-router-dom';
import Backdrop from './Backdrop';
import Navbar from './Navbar';
import Footer from './Footer';

/** Shell for every page except the landing page (which has its own full-screen composition). */
export default function SiteLayout() {
  const location = useLocation();
  // Don't Laugh page has its own dedicated in-game bottom bar (Laugh Meter & Timer).
  // The global branding & navigation footer is removed strictly on Don't Laugh.
  const isDontLaugh = Boolean(location?.pathname?.startsWith('/dont-laugh'));

  return (
    <>
      <Backdrop />
      <Navbar />
      <Outlet />
      {!isDontLaugh && <Footer />}
    </>
  );
}
