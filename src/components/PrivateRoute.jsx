import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
 
// Protege una ruta: si no está autenticado → login
// Si no tiene el rol requerido → página de inicio de su rol
export function PrivateRoute({ children, roles }) {
  const { user, profile, loading } = useAuth()
 
  if (loading) return (
    <div style={styles.loading}>
      <p style={styles.loadingText}>Cargando...</p>
    </div>
  )
 
  if (!user) return <Navigate to="/login" replace />
 
  if (roles && profile && !roles.includes(profile.role)) {
    // Redirige al home correcto según su rol
    const homeByRole = {
      admin:        '/admin',
      tomador:      '/tomador',
      preparador:   '/preparador',
      domiciliario: '/domiciliario',
    }
    return <Navigate to={homeByRole[profile.role] ?? '/login'} replace />
  }
 
  return children
}
 
const styles = {
  loading: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', backgroundColor: '#FAFAF8',
  },
  loadingText: {
    fontSize: 14, color: '#666660', fontFamily: 'sans-serif',
  }
}
 