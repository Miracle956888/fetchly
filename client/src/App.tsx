import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { Spinner } from './components/ui/Spinner';
import DownloadsPage from './pages/DownloadsPage';
import HomePage from './pages/HomePage';
import LegalPage from './pages/LegalPage';
import NotFoundPage from './pages/NotFoundPage';
import PlatformPage from './pages/PlatformPage';
import ConverterPage from './pages/ConverterPage';

// Code splitting: the admin app is a separate chunk, loaded only on demand.
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminApp = lazy(() => import('./pages/admin/AdminApp'));

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}

function PageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading">
      <Spinner className="size-8 text-primary" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public site */}
        <Route
          path="/"
          element={
            <PublicLayout>
              <HomePage />
            </PublicLayout>
          }
        />
        <Route
          path="/downloads"
          element={
            <PublicLayout>
              <DownloadsPage />
            </PublicLayout>
          }
        />
        <Route
          path="/youtube-downloader"
          element={
            <PublicLayout>
              <PlatformPage slug="youtube" />
            </PublicLayout>
          }
        />
        <Route
          path="/tiktok-downloader"
          element={
            <PublicLayout>
              <PlatformPage slug="tiktok" />
            </PublicLayout>
          }
        />
        <Route
          path="/instagram-downloader"
          element={
            <PublicLayout>
              <PlatformPage slug="instagram" />
            </PublicLayout>
          }
        />
        <Route
          path="/youtube-to-mp3"
          element={
            <PublicLayout>
              <ConverterPage kind="mp3" />
            </PublicLayout>
          }
        />
        <Route
          path="/youtube-to-mp4"
          element={
            <PublicLayout>
              <ConverterPage kind="mp4" />
            </PublicLayout>
          }
        />
        <Route
          path="/terms"
          element={
            <PublicLayout>
              <LegalPage doc="terms" />
            </PublicLayout>
          }
        />
        <Route
          path="/privacy"
          element={
            <PublicLayout>
              <LegalPage doc="privacy" />
            </PublicLayout>
          }
        />
        <Route
          path="/dmca"
          element={
            <PublicLayout>
              <LegalPage doc="dmca" />
            </PublicLayout>
          }
        />
        <Route
          path="/responsible-use"
          element={
            <PublicLayout>
              <LegalPage doc="responsible-use" />
            </PublicLayout>
          }
        />

        {/* Admin (separate interface, server-side protected) */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/*" element={<AdminApp />} />

        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route
          path="*"
          element={
            <PublicLayout>
              <NotFoundPage />
            </PublicLayout>
          }
        />
      </Routes>
    </Suspense>
  );
}
