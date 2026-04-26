import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { ProtectedRoute } from "./components/guards/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import { AdminPage, AuthPage, CreateEventPage, EventDetailPage, HomePage, MyEventsPage, OrganizerPage } from "./features/pages-v2";

function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/eventos/:id" element={<EventDetailPage />} />
          <Route path="/crear-evento" element={<ProtectedRoute><CreateEventPage /></ProtectedRoute>} />
          <Route path="/mis-eventos" element={<ProtectedRoute><MyEventsPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
          <Route path="/organizador/:id" element={<OrganizerPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
