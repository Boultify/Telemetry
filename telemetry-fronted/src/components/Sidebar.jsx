import { useAuth } from '../context/AuthContext';

// Inside your component
const { user, logout } = useAuth();

export default function Sidebar() {
  return (
    <div className="top-bar">
      <h1>Sidebar</h1>
      // Add logout button
<button onClick={logout} className="...">
  <span className="material-symbols-outlined">logout</span>
  Logout
</button>
    </div>
  )
}